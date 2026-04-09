import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Fallback plan prices if pricing_plans table doesn't exist yet
const FALLBACK_PLAN_PRICES = { starter: 9, pro: 29, dominator: 79, sponsor: 199 };

/**
 * Admin-level hook: fetch ALL subscriptions joined with profile info.
 * MRR is calculated using prices from the pricing_plans table when available,
 * falling back to hardcoded constants.
 */
export function useAdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [planPrices, setPlanPrices] = useState(FALLBACK_PLAN_PRICES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [subsRes, plansRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select(`
            *,
            profile:profiles!subscriptions_user_id_fkey (
              full_name,
              email,
              avatar_url,
              role
            )
          `)
          .order('created_at', { ascending: false }),
        // Try to fetch plan prices from DB; fall back gracefully if table missing
        // Select slug + monthly_price so we can key by slug (matches s.plan on subscriptions)
        supabase.from('pricing_plans').select('slug, monthly_price'),
      ]);

      if (subsRes.error) throw subsRes.error;
      setSubscriptions(subsRes.data || []);

      // Build price map keyed by SLUG (not UUID) so planPrices[s.plan] works correctly
      if (!plansRes.error && plansRes.data?.length) {
        const dbPrices = {};
        plansRes.data.forEach(p => {
          if (p.slug) dbPrices[p.slug] = Number(p.monthly_price) || 0;
        });
        setPlanPrices({ ...FALLBACK_PLAN_PRICES, ...dbPrices });
      }
    } catch (err) {
      console.error('[useAdminSubscriptions] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const updateSubscription = async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('subscriptions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();
      if (updateError) throw updateError;

      if (data && data.length > 0) {
        setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...data[0] } : s));
        return { data: data[0], error: null };
      } else {
        setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        await fetchSubscriptions();
        return { data: { id, ...updates }, error: null };
      }
    } catch (err) {
      return { data: null, error: err };
    }
  };

  /**
   * Cancel a subscription via Stripe (cancel_at_period_end = true), then sync DB.
   * Falls back to DB-only update if the subscription has no Stripe ID.
   */
  const cancelSubscription = async (id) => {
    const sub = subscriptions.find(s => s.id === id);
    const stripeSubId = sub?.stripe_subscription_id;

    if (stripeSubId) {
      try {
        const { data, error } = await supabase.functions.invoke('manage-subscription', {
          body: { action: 'cancel', subscriptionId: stripeSubId, subscriptionDbId: id },
        });
        if (error || !data?.success) throw new Error(error?.message || data?.error || 'Stripe cancel failed');
        // Sync local state
        setSubscriptions(prev => prev.map(s =>
          s.id === id ? { ...s, status: 'cancelled', cancelled_at: new Date().toISOString() } : s
        ));
        return { data: { id }, error: null };
      } catch (err) {
        console.error('[useAdminSubscriptions] Stripe cancel error:', err);
        return { data: null, error: err };
      }
    }

    // No Stripe ID — DB-only update (manual/seeded subscriptions)
    return updateSubscription(id, { status: 'cancelled', cancelled_at: new Date().toISOString() });
  };

  /**
   * Reactivate a cancelled subscription via Stripe (cancel_at_period_end = false), then sync DB.
   */
  const reactivateSubscription = async (id) => {
    const sub = subscriptions.find(s => s.id === id);
    const stripeSubId = sub?.stripe_subscription_id;

    if (stripeSubId) {
      try {
        const { data, error } = await supabase.functions.invoke('manage-subscription', {
          body: { action: 'reactivate', subscriptionId: stripeSubId, subscriptionDbId: id },
        });
        if (error || !data?.success) throw new Error(error?.message || data?.error || 'Stripe reactivate failed');
        setSubscriptions(prev => prev.map(s =>
          s.id === id ? { ...s, status: 'active', cancelled_at: null } : s
        ));
        return { data: { id }, error: null };
      } catch (err) {
        console.error('[useAdminSubscriptions] Stripe reactivate error:', err);
        return { data: null, error: err };
      }
    }

    return updateSubscription(id, { status: 'active', cancelled_at: null });
  };

  // MRR computed from live data using DB-sourced prices
  const mrr = subscriptions
    .filter(s => s.status === 'active' || s.status === 'trialing')
    .reduce((sum, s) => sum + (planPrices[s.plan] || 0), 0);

  /**
   * Change the plan of a subscription (DB-only; for Stripe-linked subs the
   * next webhook cycle will reconcile the billing).
   */
  const changePlan = async (id, newPlan) => {
    return updateSubscription(id, { plan: newPlan });
  };

  return {
    subscriptions,
    planPrices,
    isLoading,
    error,
    mrr,
    refresh: fetchSubscriptions,
    cancelSubscription,
    reactivateSubscription,
    changePlan,
  };
}

export default useAdminSubscriptions;
