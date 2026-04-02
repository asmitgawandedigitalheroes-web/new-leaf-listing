import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

async function audit(userId, action, entityId, meta = {}) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: 'commission',
    entity_id: entityId,
    timestamp: new Date().toISOString(),
    metadata: meta,
  });
}

/**
 * Admin-level hook: fetch ALL commissions joined with recipient profile.
 */
export function useCommissions() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCommissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('commissions')
        .select(`
          *,
          recipient:profiles!commissions_recipient_user_id_fkey (
            full_name,
            email,
            role
          ),
          approver:profiles!commissions_approved_by_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Normalise for UI
      const normalised = (data || []).map(c => ({
        ...c,
        // UI-friendly aliases
        recipient: c.recipient?.full_name || 'Unknown',
        recipientEmail: c.recipient?.email || '',
        role: c.recipient?.role || 'realtor',
        initials: (c.recipient?.full_name || 'UN').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        // Use override_amount from DB if present, otherwise fall back to 25% calc
        override: c.override_amount != null ? Number(c.override_amount) : Number(c.amount) * 0.25,
        date: c.created_at ? c.created_at.slice(0, 10) : '—',
        amount: Number(c.amount) || 0,
      }));

      setCommissions(normalised);
    } catch (err) {
      console.error('[useCommissions] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const updateCommission = async (id, updates) => {
    try {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      const { data, error: updateError } = await supabase
        .from('commissions')
        .update(payload)
        .eq('id', id)
        .select();
      if (updateError) throw updateError;

      if (data && data.length > 0) {
        setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...data[0], status: data[0].status } : c));
        if (updates.status) audit(user?.id, `commission.${updates.status}`, id, updates).catch(() => {});
        return { data: data[0], error: null };
      } else {
        setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        if (updates.status) audit(user?.id, `commission.${updates.status}`, id, updates).catch(() => {});
        await fetchCommissions();
        return { data: { id, ...updates }, error: null };
      }
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const approveCommission = (id) =>
    updateCommission(id, {
      status: 'approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    });

  const rejectCommission = (id) =>
    updateCommission(id, { status: 'rejected' });

  const markPayable = (id) =>
    updateCommission(id, { status: 'payable' });

  const markPaid = (id) =>
    updateCommission(id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
    });

  // ── Bulk helpers ──────────────────────────────────────────────────────────
  const bulkUpdate = async (ids, updates) => {
    const now = new Date().toISOString();
    try {
      const { error: bulkError } = await supabase
        .from('commissions')
        .update({ ...updates, updated_at: now })
        .in('id', ids);
      if (bulkError) throw bulkError;
      setCommissions(prev =>
        prev.map(c => ids.includes(c.id) ? { ...c, ...updates } : c)
      );
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const bulkApprove = (ids) =>
    bulkUpdate(ids, {
      status: 'approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    });

  const bulkMarkPayable = (ids) =>
    bulkUpdate(ids, { status: 'payable' });

  const bulkMarkPaid = (ids) =>
    bulkUpdate(ids, {
      status: 'paid',
      paid_at: new Date().toISOString(),
    });

  return {
    commissions,
    isLoading,
    error,
    refresh: fetchCommissions,
    approveCommission,
    rejectCommission,
    markPayable,
    markPaid,
    bulkApprove,
    bulkMarkPayable,
    bulkMarkPaid,
  };
}

export default useCommissions;
