import { supabase } from '../src/lib/supabase';
import { adminApi } from '../lib/api';

export const adminService = {
  getStats: async () => {
    const [
      { count: users },
      { count: listings },
      { count: leads },
      { data: activeSubs, count: activeSubscriptions },
      { data: plans },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('plan', { count: 'exact' }).in('status', ['active', 'trialing']),
      // Fetch authoritative plan prices from DB — no hardcoded constants.
      supabase.from('pricing_plans').select('slug, monthly_price').eq('is_active', true),
    ]);

    // Build a slug→price map from DB rows; fall back to 0 for unknown slugs.
    const planPriceMap: Record<string, number> = Object.fromEntries(
      (plans ?? []).map((p: { slug: string; monthly_price: number }) => [p.slug, Number(p.monthly_price)])
    );

    // MRR: sum of the DB-sourced monthly price for every active/trialing subscription.
    const revenue = (activeSubs || []).reduce(
      (sum: number, s: { plan: string }) => sum + (planPriceMap[s.plan] ?? 0),
      0
    );

    return {
      totalUsers: users || 0,
      totalListings: listings || 0,
      totalLeads: leads || 0,
      activeSubscriptions: activeSubscriptions || 0,
      revenue,
    };
  },

  getSettings: async () => {
    return adminApi.request(
      supabase.from('platform_settings').select('*') as any
    );
  },

  updateSetting: async (key: string, value: any) => {
    return adminApi.request(
      supabase.from('platform_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key) as any
    );
  }
};
