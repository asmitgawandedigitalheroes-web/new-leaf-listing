import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to aggregate platform metrics for the admin dashboard.
 */
export function useAdminStats() {
  const [stats, setStats] = useState({
    totalListings: 0,
    activeLeads: 0,
    monthlyRevenue: 0,
    pendingApprovals: 0,
    historicalChart: [],
    commissionLiability: 0,
    payoutsThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Build 7-month window for chart
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);
      sevenMonthsAgo.setDate(1);
      sevenMonthsAgo.setHours(0, 0, 0, 0);

      // Start of current month for payouts-this-month query
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [listingsRes, leadsRes, revenueRes, pendingRes, chartRes, liabilityRes, payoutsRes] = await Promise.all([
        // Total listings count
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        // Active leads (exclude terminal statuses)
        supabase.from('leads').select('*', { count: 'exact', head: true }).not('status', 'in', '(converted,lost,closed)'),
        // Monthly revenue = sum of successful payments in last 30 days
        supabase.from('payments').select('amount').eq('status', 'succeeded').gte('created_at', thirtyDaysAgo.toISOString()),
        // Pending listing approvals
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        // Listings for historical chart (last 7 months)
        supabase.from('listings').select('created_at').gte('created_at', sevenMonthsAgo.toISOString()),
        // Commission liability = sum of approved + payable commissions (outstanding obligation)
        supabase.from('commissions').select('amount').in('status', ['approved', 'payable']),
        // Payouts processed this month
        supabase.from('payout_requests').select('amount').eq('status', 'processed').gte('processed_at', startOfMonth.toISOString()),
      ]);

      // Calculate monthly revenue total
      const revTotal = (revenueRes.data || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

      // If payments table returns no data, derive MRR from active subscriptions
      let finalRevenue = revTotal;
      if (finalRevenue === 0) {
        const PLAN_PRICES = { starter: 9, pro: 29, dominator: 79, sponsor: 199 };
        const { data: activeSubs } = await supabase
          .from('subscriptions')
          .select('plan')
          .in('status', ['active', 'trialing']);
        finalRevenue = (activeSubs || []).reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);
      }

      // Build historical chart — listings created per month for last 7 months
      const monthMeta = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(1); // Prevent day-overflow: e.g. "Mar 31 - 6mo" → "Sep 31" → rolls to Oct
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('default', { month: 'short' });
        monthMeta.push({ key, label });
      }
      const chartRows = chartRes.data || [];
      const historicalChart = monthMeta.map(m => ({
        label: m.label,
        value: chartRows.filter(l => l.created_at && l.created_at.startsWith(m.key)).length,
      }));

      const commissionLiability = (liabilityRes.data || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const payoutsThisMonth    = (payoutsRes.data   || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      setStats({
        totalListings: listingsRes.count || 0,
        activeLeads: leadsRes.count || 0,
        monthlyRevenue: finalRevenue,
        pendingApprovals: pendingRes.count || 0,
        historicalChart,
        commissionLiability,
        payoutsThisMonth,
      });
    } catch (err) {
      console.error('[useAdminStats] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { 
    stats, 
    isLoading, 
    error, 
    refresh: fetchStats 
  };
}

export default useAdminStats;
