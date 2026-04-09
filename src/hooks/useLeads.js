import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { routingService } from '../../services/routing.service';
import { crmService } from '../../services/crm.service';
import { notificationService } from '../../services/notification.service';

/** Fire-and-forget audit log writer. */
async function audit(userId, action, entityId, meta = {}) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: 'lead',
    entity_id: entityId,
    timestamp: new Date().toISOString(),
    metadata: meta,
  });
}

/**
 * Hook to manage leads with real Supabase data.
 * Handles fetching, inquiry creation, and status management.
 */
export function useLeads() {
  const { user, role } = useAuth();
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('leads')
        .select(`
          *,
          listing:listings(title, address, city, state),
          assigned_realtor:profiles!leads_assigned_realtor_id_fkey(full_name, email),
          assigned_director:profiles!leads_assigned_director_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      // RBAC Filtering: Realtors only see their own assigned leads
      if (role === 'realtor') {
        query = query.eq('assigned_realtor_id', user.id);
      } else if (role === 'director') {
        // Directors may manage multiple territories — look up by director_id, not profile.territory_id
        const { data: territories } = await supabase
          .from('territories')
          .select('id')
          .eq('director_id', user.id);

        const territoryIds = (territories || []).map(t => t.id);

        // Show leads in director's territories OR leads directly assigned to this director
        if (territoryIds.length > 0) {
          query = query.or(`territory_id.in.(${territoryIds.join(',')}),assigned_director_id.eq.${user.id}`);
        } else {
          query = query.eq('assigned_director_id', user.id);
        }
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setLeads(data || []);
    } catch (err) {
      console.error('[useLeads] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    if (user) {
      fetchLeads();
    } else {
      setIsLoading(false);
    }
  }, [fetchLeads, user]);

  /**
   * Fetch leads assigned to the current director (queued for realtor assignment).
   * Directors call this to see: assigned_director_id = auth.uid() AND assigned_realtor_id IS NULL
   */
  const fetchDirectorQueue = useCallback(async () => {
    if (role !== 'director') return { data: [], error: null };

    try {
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select(`
          *,
          listing:listings(title, address, city, state),
          assigned_realtor:profiles!leads_assigned_realtor_id_fkey(full_name, email),
          assigned_director:profiles!leads_assigned_director_id_fkey(full_name, email)
        `)
        .eq('assigned_director_id', user.id)
        .is('assigned_realtor_id', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      return { data: data || [], error: null };
    } catch (err) {
      console.error('[useLeads] Fetch director queue error:', err);
      return { data: [], error: err };
    }
  }, [user, role]);

  /**
   * Create a new lead from a website inquiry.
   * This is a public-facing action (status = 'new').
   */
  const createInquiry = async (inquiryData) => {
    try {
    // Priority: Explicit assigned_realtor_id > listing-owner > null (unassigned)
    let assignedRealtorId = inquiryData.assigned_realtor_id || null;
    let territoryId = inquiryData.territory_id || null;

    if (inquiryData.listing_id) {
      const { data: listing } = await supabase
        .from('listings')
        .select('realtor_id, territory_id')
        .eq('id', inquiryData.listing_id)
        .single();

      if (listing) {
        assignedRealtorId = listing.realtor_id;
        territoryId = listing.territory_id;
      }
    }

    // BUG-001: inner try replaced with outer try — all code paths are now covered
    {
      let { data, error: insertError } = await supabase
        .from('leads')
        .insert({
          contact_name: inquiryData.name,
          contact_email: inquiryData.email,
          contact_phone: inquiryData.phone,
          interest_type: inquiryData.interest,
          notes: inquiryData.message,
          assigned_realtor_id: assignedRealtorId,
          territory_id: territoryId,
          status: assignedRealtorId ? 'assigned' : 'new',
          budget_min: inquiryData.budget_min || null,
          budget_max: inquiryData.budget_max || null,
          source: inquiryData.source || 'website'
        })
        .select('*, listing:listings(title, address, city, state), assigned_realtor:profiles!leads_assigned_realtor_id_fkey(full_name, email)')
        .single();
      
      if (insertError) throw insertError;

      // 2. If not assigned via listing owner, trigger the routing engine
      if (!assignedRealtorId) {
        const routeResult = await routingService.routeLead({
          lead: data,
          territory_id: territoryId
        });

        if (routeResult.assigned_realtor_id) {
          await routingService.applyRouting(data.id, routeResult);
          // Refresh the lead data after routing
          const { data: routedData } = await supabase.from('leads').select('*, listing:listings(title, address, city, state), assigned_realtor:profiles!leads_assigned_realtor_id_fkey(full_name, email)').eq('id', data.id).single();
          if (routedData) {
             // Use the fresh data for the rest of the flow
             data = routedData;
          }
        }
      }
      
      // 3. Update local state if the current user got the lead
      if (role === 'realtor' && data.assigned_realtor_id === user.id) {
        setLeads(prev => [data, ...prev]);
      }
      
      // 4. CRM Sync — pass lead ID string, not the lead object
      crmService.syncLead(data.id).catch(err => {
        console.error('[useLeads] CRM Sync failed (queued for retry):', err);
      });

      // Email Notification — directorId not available here, pass null
      if (data.assigned_realtor_id) {
        notificationService.notifyNewLead(data.id, data.assigned_realtor_id, null).catch(console.error);
      }
      
      return { data, error: null };
    }
    } catch (err) {
      console.error('[useLeads] Create inquiry error:', err?.message ?? err, err?.details ?? '');
      return { data: null, error: err };
    }
  };

  // Maps UI status values (used in dropdowns/display) to the DB CHECK constraint values.
  // DB constraint: ('new','assigned','contacted','showing','offer','converted','lost')
  const UI_TO_DB_STATUS = {
    new:         'new',
    contacted:   'contacted',
    in_progress: 'showing',
    closed:      'converted',
  };

  const updateLeadStatus = async (id, status) => {
    try {
      // Translate UI status → valid DB enum value before writing.
      const dbStatus = UI_TO_DB_STATUS[status] ?? status;

      // Select only 'id' (no joins) to detect silent RLS failures without triggering
      // join-level RLS issues on listings/profiles.
      const { data: updatedRows, error: updateError } = await supabase
        .from('leads')
        .update({ status: dbStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');

      if (updateError) throw updateError;

      // If RLS silently blocked the update, data will be an empty array — treat as error.
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Status update failed: permission denied or lead not found.');
      }

      // Confirmed DB write — store the DB value in local state so normalizeStatus
      // renders it correctly without a full re-fetch.
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: dbStatus } : l));

      audit(user.id, `lead.status_changed`, id, { status: dbStatus }).catch(() => {});

      crmService.syncLeadStatus(id, dbStatus).catch(err => {
        console.error('[useLeads] CRM Status Sync failed:', err);
      });

      return { data: { id, status: dbStatus }, error: null };
    } catch (err) {
      console.error('[useLeads] Update status error:', err);
      return { data: null, error: err };
    }
  };

  /**
   * Add a manual note/comment to a lead.
   * Stores in audit_logs for timeline consistency.
   */
  const addLeadNote = async (id, note) => {
    try {
      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'lead.note_added',
        entity_type: 'lead',
        entity_id: id,
        timestamp: new Date().toISOString(),
        metadata: { note }
      });

      if (auditError) throw auditError;

      // Log success and return
      audit(user.id, 'lead.noted', id, { note_preview: note.slice(0, 50) }).catch(() => {});
      return { error: null };
    } catch (err) {
      console.error('[useLeads] Add note error:', err);
      return { error: err };
    }
  };

  /**
   * Reassign a lead to a different realtor (admin/director only).
   * Sets a 180-day lock_until attribution window.
   */
  const reassignLead = async (id, newRealtorId) => {
    try {
      const lockUntil = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error: updateError } = await supabase
        .from('leads')
        .update({
          assigned_realtor_id: newRealtorId,
          lock_until: lockUntil,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, listing:listings(title, address, city, state), assigned_realtor:profiles!leads_assigned_realtor_id_fkey(full_name, email)')
        .single();

      if (updateError) throw updateError;

      audit(user.id, 'lead.reassigned', id, { new_realtor_id: newRealtorId, lock_until: lockUntil }).catch(() => {});
      
      // Email Notification — directorId not available in reassign context, pass null
      notificationService.notifyNewLead(id, newRealtorId, null).catch(console.error);

      if (data) {
        setLeads(prev => prev.map(l => l.id === id ? data : l));
        return { data, error: null };
      } else {
        setLeads(prev => prev.map(l => l.id === id
          ? { ...l, assigned_realtor_id: newRealtorId, status: 'assigned' }
          : l
        ));
        return { data: { id, assigned_realtor_id: newRealtorId }, error: null };
      }
    } catch (err) {
      console.error('[useLeads] Reassign error:', err);
      return { data: null, error: err };
    }
  };

  /**
   * Assign a lead to a director (admin only).
   * Director will then manually assign to one of their realtors.
   * No 180-day lock applied yet (lock applies when director assigns to realtor).
   */
  const assignLeadToDirector = async (id, directorId) => {
    try {
      const { data, error: updateError } = await supabase
        .from('leads')
        .update({
          assigned_director_id: directorId,
          assigned_realtor_id: null,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, listing:listings(title, address, city, state), assigned_director:profiles!leads_assigned_director_id_fkey(full_name, email)')
        .single();

      if (updateError) throw updateError;

      audit(user.id, 'lead.assigned_to_director', id, { director_id: directorId }).catch(() => {});

      // Notify director of new lead assignment
      notificationService.notifyDirectorLead(id, directorId).catch(console.error);

      // Update state with full lead data including director info
      if (data) {
        setLeads(prev => prev.map(l => l.id === id ? data : l));
      } else {
        setLeads(prev => prev.map(l => l.id === id
          ? { ...l, assigned_director_id: directorId, assigned_realtor_id: null, assigned_realtor: null, status: 'assigned' }
          : l
        ));
      }
      return { data, error: null };
    } catch (err) {
      console.error('[useLeads] Assign to director error:', err);
      return { data: null, error: err };
    }
  };

  /**
   * Fetch available realtors for lead assignment (admin/director only).
   * Returns active realtors with their profile info.
   */
  const fetchAvailableRealtors = useCallback(async (territoryId = null) => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, territory_id, status')
        .eq('role', 'realtor')
        .eq('status', 'active')
        .order('full_name');

      // Filter by territory to prevent cross-territory lead assignment
      if (territoryId) {
        query = query.eq('territory_id', territoryId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      return { data: data || [], error: null };
    } catch (err) {
      console.error('[useLeads] fetchAvailableRealtors error:', err);
      return { data: [], error: err };
    }
  }, []);

  /**
   * Assign a lead to a director (admin only).
   * Director will then manually assign to one of their realtors.
   * No 180-day lock applied yet (lock applies when director assigns to realtor).
   */
  const assignLeadToDirector = async (id, directorId) => {
    try {
      const { data, error: updateError } = await supabase
        .from('leads')
        .update({
          assigned_director_id: directorId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, listing:listings(title, address, city, state), assigned_director:profiles!leads_assigned_director_id_fkey(full_name, email)')
        .single();

      if (updateError) throw updateError;

      audit(user.id, 'lead.assigned_to_director', id, { director_id: directorId }).catch(() => {});

      // Notify director of new lead assignment
      notificationService.notifyDirectorLead(id, directorId).catch(console.error);

      // Update state with full lead data including director info
      if (data) {
        setLeads(prev => prev.map(l => l.id === id ? data : l));
      } else {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, assigned_director_id: directorId } : l));
      }
      return { data, error: null };
    } catch (err) {
      console.error('[useLeads] Assign to director error:', err);
      return { data: null, error: err };
    }
  };

  return {
    leads,
    isLoading,
    error,
    refresh: fetchLeads,
    fetchDirectorQueue,
    createInquiry,
    updateLeadStatus,
    reassignLead,
    assignLeadToDirector,
    addLeadNote,
    fetchAvailableRealtors,
    fetchDirectorQueue,
    assignLeadToDirector,
  };
}

export default useLeads;