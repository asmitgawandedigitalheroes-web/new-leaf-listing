export type SubscriptionPlan = 'starter' | 'pro' | 'dominator' | 'sponsor';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

// BUG-004: Canonical prices — must match pricing_plans DB seed (schema.sql)
// and PLAN_AMOUNTS in stripe-webhook/index.ts.
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  starter: 29,
  pro: 79,
  dominator: 199,
  sponsor: 0,
};

export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  starter: ['Up to 10 listings', '50 lead captures/mo', '1 territory', 'Advanced analytics', 'Priority email support'],
  pro: ['Up to 25 listings', '200 lead captures/mo', '3 territories', '2 featured spots', 'Phone + email support', 'Commission tracking'],
  dominator: ['Unlimited listings', 'Unlimited leads', 'Unlimited territories', '5 featured + 2 top spots', '24/7 dedicated support', 'Full commission suite', 'CRM integrations'],
  sponsor: ['Territory sponsorship', 'All Dominator features', 'Logo placement', 'Priority routing', 'Co-branding rights', 'Revenue sharing'],
};

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  next_billing_date: string | null;
  created_at: string;
  updated_at: string;
  user?: { full_name: string; email: string; };
}

export interface SubscriptionFilters {
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  user_id?: string;
}
