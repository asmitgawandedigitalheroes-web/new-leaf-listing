import { supabase } from '../src/lib/supabase';
import { adminApi } from '../lib/api';
import { ListingFilters } from '../types/listing.types';
import { notificationService } from './notification.service';

const isUUID = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const listingService = {
  getListings: async (filters: ListingFilters = {}) => {
    // Correct join: realtor_id FK → profiles, aliased as 'realtor'
    let query = supabase.from('listings').select('*, realtor:profiles!realtor_id(full_name, email)');

    if (filters.status)      query = query.eq('status', filters.status);
    // DB column is territory_id (uuid), not a text 'territory' column
    if (filters.territory_id) query = query.eq('territory_id', filters.territory_id);
    // DB column is realtor_id, not owner_id
    if (filters.realtor_id)  query = query.eq('realtor_id', filters.realtor_id);
    if (filters.search)      query = query.ilike('title', `%${filters.search}%`);

    return adminApi.request(query as any);
  },

  approveListing: async (id: string) => {
    if (!id || !isUUID(id)) return { data: null, error: new Error('Invalid listing ID') };

    // Fetch realtor_id before update so we can notify
    const { data: listing } = await supabase
      .from('listings')
      .select('realtor_id')
      .eq('id', id)
      .single();

    const result = await adminApi.request(
      supabase.from('listings').update({ status: 'active', approved_at: new Date().toISOString() }).eq('id', id) as any
    );

    // Fire notification (non-blocking — failure must not break approval)
    if (!result.error && listing?.realtor_id) {
      notificationService.notifyListingApproved(id, listing.realtor_id).catch(console.error);
    }

    return result;
  },

  rejectListing: async (id: string, reason = 'Did not meet listing requirements') => {
    if (!id || !isUUID(id)) return { data: null, error: new Error('Invalid listing ID') };

    const { data: listing } = await supabase
      .from('listings')
      .select('realtor_id')
      .eq('id', id)
      .single();

    const result = await adminApi.request(
      supabase.from('listings').update({ status: 'rejected' }).eq('id', id) as any
    );

    if (!result.error && listing?.realtor_id) {
      notificationService.notifyListingRejected(id, listing.realtor_id, reason).catch(console.error);
    }

    return result;
  },

  upgradeListing: async (id: string, type: 'featured' | 'top') => {
    if (!id || !isUUID(id)) return { data: null, error: new Error('Invalid listing ID') };
    // DB column is upgrade_type (text: 'standard'|'featured'|'top').
    // is_featured and is_top boolean columns do not exist in the schema.
    return adminApi.request(
      supabase.from('listings').update({ upgrade_type: type }).eq('id', id) as any
    );
  },

  getAuditLogs: async (entityId: string) =>
    adminApi.request(
      // audit_logs uses 'timestamp' not 'created_at' as the sort column
      supabase.from('audit_logs').select('*').eq('entity_id', entityId).order('timestamp', { ascending: false }) as any
    ),
};
