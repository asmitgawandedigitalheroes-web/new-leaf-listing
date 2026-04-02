import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

async function audit(userId, action, entityId, meta = {}) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: 'profile',
    entity_id: entityId,
    timestamp: new Date().toISOString(),
    metadata: meta,
  });
}

/**
 * Hook to manage platform users for Admin.
 */
export function useUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch users + their territory name + active subscription plan
      const [usersRes, terrRes, subsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            *,
            territory:territories!profiles_territory_id_fkey(id, city, state)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('territories')
          .select('id, city, state')
          .order('state'),
        // Fetch subscriptions separately to avoid FK name assumptions and array vs object confusion
        supabase
          .from('subscriptions')
          .select('user_id, plan, status')
          .in('status', ['active', 'trialing']),
      ]);

      // Build a quick map: user_id → most recent active subscription plan
      const subPlanMap = {};
      (subsRes.data || []).forEach(s => {
        if (!subPlanMap[s.user_id]) subPlanMap[s.user_id] = s.plan;
      });

      if (usersRes.error) throw usersRes.error;

      const transformed = (usersRes.data || []).map(u => ({
        ...u,
        initials: u.full_name
          ? u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          : '??',
        name: u.full_name,
        joined: new Date(u.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
        // Friendly territory label
        territory: u.territory
          ? `${u.territory.city || ''}, ${u.territory.state}`.replace(/^, /, '')
          : null,
        territory_id: u.territory_id,
        // Plan from subscription map
        plan: subPlanMap[u.id] || null,
      }));

      setUsers(transformed);
      setTerritories(terrRes.data || []);
    } catch (err) {
      console.error('[useUsers] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    // Safety: if the DB query hangs, clear loading so the page doesn't show
    // skeletons forever. The query may still resolve later and update state.
    const t = setTimeout(() => setIsLoading(false), 10000);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const updateUser = async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (updateError) throw updateError;

      if (data && data.length > 0) {
        setUsers(prev => prev.map(u =>
          u.id === id ? { ...u, ...data[0], name: data[0].full_name } : u
        ));
      } else {
        await fetchUsers();
      }
      // Audit meaningful changes
      if (updates.status) audit(currentUser?.id, `user.${updates.status}`, id, updates).catch(() => {});
      if (updates.role)   audit(currentUser?.id, 'user.role_changed', id, { new_role: updates.role }).catch(() => {});
      if (updates.territory_id !== undefined) audit(currentUser?.id, 'user.territory_assigned', id, { territory_id: updates.territory_id }).catch(() => {});
      return { data: (data && data.length > 0) ? data[0] : { id, ...updates }, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const deleteUser = async (id) => {
    try {
      // Guard: never allow deletion of an admin account
      const target = users.find(u => u.id === id);
      if (target?.role === 'admin') {
        return { error: new Error('Admin accounts cannot be deleted. Suspend the account instead.') };
      }
      // Guard: cannot delete yourself
      if (id === currentUser?.id) {
        return { error: new Error('You cannot delete your own account.') };
      }

      // Call Edge Function to delete from auth.users (requires service role)
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const { data, error: fnError } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: id },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (fnError || !data?.success) {
        throw new Error(fnError?.message || data?.error || 'Failed to delete user');
      }

      audit(currentUser?.id, 'user.deleted', id, { deleted_user_id: id }).catch(() => {});
      setUsers(prev => prev.filter(u => u.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  /**
   * Create a brand-new platform user via the admin-create-user Edge Function.
   * This uses Supabase service role under the hood so it can create auth users.
   */
  const createUser = async ({ email, full_name, role, territory_id, plan }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const { data, error: fnError } = await supabase.functions.invoke('admin-create-user', {
        body: { email, full_name, role, territory_id, plan },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (fnError) {
        console.error('[useUsers] Edge Function invocation error:', fnError);
        throw fnError;
      }
      if (data?.error) {
        console.error('[useUsers] Edge Function returned error:', data.error);
        throw new Error(data.error);
      }

      // Refresh the full user list so the new user appears with all joins
      await fetchUsers();
      return { data: data.user, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  /**
   * Admin override: update a user's subscription plan directly in the subscriptions table.
   * This is an admin-only override (no Stripe interaction) for manual plan corrections.
   */
  const changeUserPlan = async (userId, newPlan) => {
    try {
      const { data, error: upsertError } = await supabase
        .from('subscriptions')
        .upsert(
          { user_id: userId, plan: newPlan, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (upsertError) throw upsertError;

      // Keep local user list in sync with the new plan
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
      audit(currentUser?.id, 'user.plan_changed', userId, { new_plan: newPlan }).catch(() => {});
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  return {
    users,
    territories,
    isLoading,
    error,
    refresh: fetchUsers,
    updateUser,
    deleteUser,
    createUser,
    changeUserPlan,
  };
}

export default useUsers;
