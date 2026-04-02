import { supabase } from '../src/lib/supabase';
import { auditService } from './audit.service';

export interface PricingPlan {
  id: string;
  slug: string;
  name: string;
  monthly_price: number;
  annual_price: number;
  features: string[];
  is_active: boolean;
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ListingPrice {
  id: string;
  type: string;
  label: string;
  price: number;
  billing_cycle: string;
  description: string | null;
  is_active: boolean;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export const pricingService = {
  /**
   * Fetch all pricing plans ordered by sort_order.
   * Returns all plans (active + inactive) for admin view.
   * Public page should filter by is_active === true.
   */
  getPricingPlans: async (): Promise<PricingPlan[]> => {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[PricingService] getPricingPlans error:', error);
      return [];
    }
    return (data ?? []).map(p => ({
      ...p,
      features: Array.isArray(p.features) ? p.features : [],
    }));
  },

  /**
   * Update a pricing plan. Logs the change to the audit trail.
   */
  updatePricingPlan: async (
    id: string,
    updates: Partial<Omit<PricingPlan, 'id' | 'created_at' | 'updated_at'>>,
    actorId = 'system'
  ): Promise<{ data: PricingPlan | null; error: string | null }> => {
    const { data, error } = await supabase
      .from('pricing_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) {
      console.error('[PricingService] updatePricingPlan error:', error);
      return { data: null, error: error.message };
    }

    const row = (data && data.length > 0) ? data[0] as PricingPlan : null;
    await auditService.log(actorId, 'pricing_plan.updated', 'pricing_plan', id, updates).catch(console.error);
    return { data: row, error: null };
  },

  /**
   * Fetch all listing upgrade prices.
   */
  getListingPrices: async (): Promise<ListingPrice[]> => {
    const { data, error } = await supabase
      .from('listing_prices')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('[PricingService] getListingPrices error:', error);
      return [];
    }
    return data ?? [];
  },

  /**
   * Update a listing price. Logs the change to the audit trail.
   */
  updateListingPrice: async (
    id: string,
    updates: Partial<Omit<ListingPrice, 'id' | 'created_at' | 'updated_at'>>,
    actorId = 'system'
  ): Promise<{ data: ListingPrice | null; error: string | null }> => {
    const { data, error } = await supabase
      .from('listing_prices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) {
      console.error('[PricingService] updateListingPrice error:', error);
      return { data: null, error: error.message };
    }

    const row = (data && data.length > 0) ? data[0] as ListingPrice : null;
    await auditService.log(actorId, 'listing_price.updated', 'listing_price', id, updates).catch(console.error);
    return { data: row, error: null };
  },
};
