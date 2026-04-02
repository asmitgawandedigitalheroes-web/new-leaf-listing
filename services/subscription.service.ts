import { supabase } from '../src/lib/supabase';
import { adminApi } from '../lib/api';
import {
  Subscription,
  SubscriptionFilters,
  SubscriptionPlan,
  SubscriptionStatus,
  PLAN_PRICES,
  PLAN_FEATURES,
} from '../types/subscription.types';

export interface SubscriptionStats {
  mrr: number;
  total_active: number;
  churn_rate: number;
  by_plan: Record<SubscriptionPlan, number>;
}

/** Map of features each plan grants access to — used for checkFeatureAccess */
const FEATURE_MAP: Record<string, SubscriptionPlan[]> = {
  'leads.unlimited': ['dominator', 'sponsor'],
  'listings.unlimited': ['dominator', 'sponsor'],
  'crm.integrations': ['dominator', 'sponsor'],
  'commission.full_suite': ['dominator', 'sponsor'],
  'support.dedicated': ['dominator', 'sponsor'],
  'territory.sponsor': ['sponsor'],
  'listings.featured': ['pro', 'dominator', 'sponsor'],
  'listings.top': ['dominator', 'sponsor'],
  'commission.tracking': ['pro', 'dominator', 'sponsor'],
  'support.phone': ['pro', 'dominator', 'sponsor'],
};

export const subscriptionService = {
  /**
   * List all subscriptions with optional filters.
   */
  getSubscriptions: async (filters: SubscriptionFilters = {}) => {
    let query = supabase
      .from('subscriptions')
      .select('*, user:profiles!user_id(full_name, email)')
      .order('created_at', { ascending: false });

    if (filters.plan) query = query.eq('plan', filters.plan);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.user_id) query = query.eq('user_id', filters.user_id);

    return adminApi.request<Subscription[]>(query as any);
  },

  /**
   * Get the active subscription for a specific user.
   */
  getUserSubscription: async (userId: string) => {
    return adminApi.request<Subscription>(
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single() as any
    );
  },

  /**
   * Create a new subscription record for a user.
   * BUG-001: Guard against duplicate active subscriptions before inserting.
   * @param stripeData - optional Stripe IDs if payment is already processed
   */
  createSubscription: async (
    userId: string,
    plan: SubscriptionPlan,
    stripeData?: { stripe_customer_id?: string; stripe_subscription_id?: string }
  ) => {
    // BUG-001: Reject if the user already has an active subscription.
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, plan')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return {
        data: null,
        error: new Error(
          `User ${userId} already has an active ${existing.plan} subscription (id: ${existing.id}). Cancel or upgrade the existing subscription first.`
        ),
      };
    }

    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    return adminApi.request<Subscription>(
      supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan,
          status: 'active' as SubscriptionStatus,
          stripe_customer_id: stripeData?.stripe_customer_id ?? null,
          stripe_subscription_id: stripeData?.stripe_subscription_id ?? null,
          next_billing_date: nextBilling.toISOString(),
        })
        .select()
        .single() as any
    );
  },

  /**
   * Upgrade or downgrade a user's current subscription plan.
   */
  upgradeSubscription: async (userId: string, newPlan: SubscriptionPlan) => {
    return adminApi.request<Subscription>(
      supabase
        .from('subscriptions')
        .update({
          plan: newPlan,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select()
        .single() as any
    );
  },

  /**
   * Cancel a user's subscription with an optional reason.
   */
  cancelSubscription: async (userId: string, reason?: string) => {
    return adminApi.request<Subscription>(
      supabase
        .from('subscriptions')
        .update({
          status: 'cancelled' as SubscriptionStatus,
          updated_at: new Date().toISOString(),
          ...(reason ? { cancel_reason: reason } : {}),
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select()
        .single() as any
    );
  },

  /**
   * Admin stats: MRR, active count, churn estimate, breakdown by plan.
   */
  getSubscriptionStats: async (): Promise<SubscriptionStats> => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status');

    if (error || !data) {
      console.error('Subscription stats error:', error);
      return {
        mrr: 0,
        total_active: 0,
        churn_rate: 0,
        by_plan: { starter: 0, pro: 0, dominator: 0, sponsor: 0 },
      };
    }

    const stats: SubscriptionStats = {
      mrr: 0,
      total_active: 0,
      churn_rate: 0,
      by_plan: { starter: 0, pro: 0, dominator: 0, sponsor: 0 },
    };

    let cancelled = 0;
    let total = 0;

    for (const row of data) {
      total++;
      if (row.status === 'active') {
        stats.total_active++;
        stats.mrr += PLAN_PRICES[row.plan as SubscriptionPlan] ?? 0;
        stats.by_plan[row.plan as SubscriptionPlan]++;
      }
      if (row.status === 'cancelled') cancelled++;
    }

    stats.churn_rate = total > 0 ? parseFloat(((cancelled / total) * 100).toFixed(2)) : 0;
    return stats;
  },

  /**
   * Check whether a user's active subscription grants access to a specific feature.
   * @param userId - user to check
   * @param feature - feature key from FEATURE_MAP
   */
  checkFeatureAccess: async (userId: string, feature: string): Promise<boolean> => {
    const { data: sub, error } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !sub) return false;

    const allowedPlans = FEATURE_MAP[feature];
    if (!allowedPlans) return false;

    return allowedPlans.includes(sub.plan as SubscriptionPlan);
  },

  /** Expose plan features for UI use */
  getPlanFeatures: (plan: SubscriptionPlan): string[] => {
    return PLAN_FEATURES[plan] ?? [];
  },

  /** Expose plan price for UI use */
  getPlanPrice: (plan: SubscriptionPlan): number => {
    return PLAN_PRICES[plan] ?? 0;
  },
};
