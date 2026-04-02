import { supabase } from '../src/lib/supabase';
import { adminApi } from '../lib/api';
import { Lead, LeadFilters, LeadStatus } from '../types/lead.types';

const VALID_LEAD_STATUSES: LeadStatus[] = ['new', 'assigned', 'contacted', 'showing', 'offer', 'converted', 'lost'];

const isUUID = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const leadService = {
  getLeads: async (filters: LeadFilters = {}) => {
    // Explicit FK hint required: leads has two FKs to profiles (assigned_realtor_id,
    // assigned_director_id). PostgREST cannot resolve 'profiles' without the hint.
    let query = supabase
      .from('leads')
      .select('*, assigned_realtor:profiles!assigned_realtor_id(full_name, email)');

    if (filters.status)              query = query.eq('status', filters.status);
    if (filters.territory_id)        query = query.eq('territory_id', filters.territory_id);
    if (filters.assigned_realtor_id) query = query.eq('assigned_realtor_id', filters.assigned_realtor_id);
    if (filters.source)           query = query.eq('source', filters.source);

    return adminApi.request(query as any);
  },

  assignLead: async (leadId: string, agentId: string) => {
    if (!leadId || !isUUID(leadId)) return { data: null, error: new Error('Invalid lead ID') };
    if (!agentId || !isUUID(agentId)) return { data: null, error: new Error('Invalid agent ID') };

    // BUG-007: Enforce 180-day attribution lock before reassigning.
    // Read the current lead to check lock_until.
    const { data: current, error: fetchErr } = await supabase
      .from('leads')
      .select('id, lock_until, assigned_realtor_id')
      .eq('id', leadId)
      .single();

    if (fetchErr || !current) {
      return { data: null, error: fetchErr ?? new Error('Lead not found') };
    }

    if (
      current.lock_until &&
      new Date(current.lock_until) > new Date() &&
      current.assigned_realtor_id !== agentId
    ) {
      return {
        data: null,
        error: new Error(
          `Lead is attribution-locked until ${current.lock_until}. Reassignment blocked.`
        ),
      };
    }

    return adminApi.request(
      supabase.from('leads').update({
        assigned_realtor_id: agentId,
        status: 'assigned',
        lock_until: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('id', leadId) as any
    );
  },

  updateLeadStatus: async (id: string, status: LeadStatus) => {
    if (!id || !isUUID(id)) return { data: null, error: new Error('Invalid lead ID') };
    if (!VALID_LEAD_STATUSES.includes(status)) return { data: null, error: new Error(`Invalid status: ${status}`) };

    return adminApi.request(
      supabase.from('leads').update({ status }).eq('id', id) as any
    );
  },
};
