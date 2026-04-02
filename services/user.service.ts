import { supabase } from '../src/lib/supabase';
import { adminApi } from '../lib/api';
import { UserProfile, UserFilters, UserRole, AccountStatus } from '../types/user.types';

export const userService = {
  getUsers: async (filters: UserFilters = {}) => {
    let query = supabase.from('profiles').select('*');

    if (filters.role) query = query.eq('role', filters.role);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.territory_id) query = query.eq('territory_id', filters.territory_id);
    if (filters.search) query = query.ilike('full_name', `%${filters.search}%`);

    return adminApi.request(query as any);
  },

  updateUserStatus: async (id: string, status: AccountStatus) => {
    return adminApi.request(
      supabase.from('profiles').update({ status }).eq('id', id) as any
    );
  },

  updateUserRole: async (id: string, role: UserRole) => {
    return adminApi.request(
      supabase.from('profiles').update({ role }).eq('id', id) as any
    );
  },

  assignTerritory: async (id: string, territory: string) => {
    return adminApi.request(
      supabase.from('profiles').update({ territory_id: territory }).eq('id', id) as any
    );
  },

  /**
   * Delete a user. Calls the admin-delete-user Edge Function which uses the
   * service-role key to remove the auth.users record via Supabase Admin API.
   * Deleting only from `profiles` would orphan the auth record, allowing the
   * user to continue authenticating.
   */
  deleteUser: async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${(supabase as any).supabaseUrl}/functions/v1/admin-delete-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ userId: id }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return { data: null, error: new Error(text || 'admin-delete-user failed') };
    }
    return { data: await res.json(), error: null };
  }
};
