import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Admin-level hook: fetch audit log entries with profile join.
 */
export function useAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select(`
          *,
          actor:profiles!audit_logs_user_id_fkey (
            full_name,
            email,
            role
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(300);

      if (fetchError) throw fetchError;

      // Map a raw action string → display category for filters / badges
      const categoriseAction = (action = '') => {
        const a = action.toLowerCase();
        if (a.includes('creat') || a.includes('added') || a.includes('signup') || a.includes('register')) return 'create';
        if (a.includes('delet') || a.includes('remov')) return 'delete';
        if (a.includes('pay') || a.includes('subscri') || a.includes('billing') || a.includes('invoice') || a.includes('charge')) return 'payment';
        if (a.includes('login') || a.includes('logout') || a.includes('auth') || a.includes('password') || a.includes('token')) return 'auth';
        if (a.includes('contract')) return 'contract';
        return 'update';
      };

      // Normalise for UI consumption
      const normalised = (data || []).map(log => {
        const rawAction = log.action || 'update';
        return {
          id: log.id,
          timestamp: log.timestamp,
          user: log.actor?.email || 'system@nlvlistings.com',
          userName: log.actor?.full_name || 'System',
          action: rawAction,
          actionCategory: categoriseAction(rawAction),
          entity: (log.entity_type || 'Unknown').charAt(0).toUpperCase() + (log.entity_type || '').slice(1),
          entityId: log.entity_id ? `#${log.entity_id.slice(0, 8)}` : '#—',
          details: log.details || 'Action performed',
          metadata: {
            ip: log.metadata?.ip || '—',
            duration: log.metadata?.duration || '—',
            before: log.metadata?.before || null,
            after: log.metadata?.after || null,
          },
        };
      });

      setLogs(normalised);
    } catch (err) {
      console.error('[useAuditLogs] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const t = setTimeout(() => setIsLoading(false), 10000);

    // Real-time: subscribe to new audit log inserts
    const channel = supabase
      .channel('audit_logs_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => { clearTimeout(t); supabase.removeChannel(channel); };
  }, [fetchLogs]);

  return { logs, isLoading, error, refresh: fetchLogs };
}

export default useAuditLogs;
