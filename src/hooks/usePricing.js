import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// UI metadata keyed by DB slug — keeps DB slugs unchanged
// while giving each plan its display identity
const PLAN_META = {
  starter: {
    badge:     'Early Access',
    tier:      'Intro',
    priceNote: 'Introductory pricing (limited time)',
    desc:      'Entry access to the platform before full launch.',
    cta:       'Get Early Access',
    ctaHref:   '/signup',
    popular:   false,
    dark:      false,
    features:  ['Unlimited Listings', 'Basic CRM', 'Lead Capture', 'Platform Access'],
  },
  pro: {
    badge:     'Early Access',
    tier:      'Pro Agent',
    priceNote: 'Introductory pricing (limited time)',
    desc:      'Expand your pipeline with more tools and opportunities.',
    cta:       'Upgrade to Pro',
    ctaHref:   '/signup',
    popular:   false,
    dark:      false,
    features:  ['Unlimited Listings', 'Advanced CRM & Automation', 'Enhanced Analytics', 'Access to New Leaf Buyer Network', 'Earn Commissions on New Leaf Products'],
  },
  dominator: {
    badge:     'Early Access Pricing',
    tier:      'Dominator',
    priceNote: 'Limited introductory pricing',
    desc:      'Priority access to deals, inventory, and deal flow.',
    cta:       'Subscribe Now',
    ctaHref:   '/signup',
    popular:   true,
    dark:      false,
    features:  ['Unlimited Listings', 'Full CRM & Automation Suite', 'Priority Lead Routing', 'Access to Developer Pre-Sales (Mexico & International)', 'First-Look Access to New Inventory', 'Higher Commission Opportunities'],
  },
  sponsor: {
    badge:     'Limited Territories',
    tier:      'Market Owner',
    priceNote: 'Introductory rates based on territory size',
    desc:      'Own your market before expansion.',
    cta:       'Apply for Territory',
    ctaHref:   '/contact',
    popular:   false,
    dark:      true,
    features:  ['Everything in Dominator', 'Exclusive Territory Rights', 'Protected Lead Flow', 'Priority Market Positioning', 'Direct Developer Access', 'White-Glove Support'],
  },
};

/**
 * usePricing — fetches live pricing from Supabase and merges with UI metadata.
 *
 * Returns plans shaped for direct use in pricing cards on both the
 * homepage Pricing component and the public PricingPage.
 *
 * Admin changes via the Pricing Management panel are reflected instantly
 * because both consumers read from the same source.
 */
export function usePricing({ adminView = false } = {}) {
  const [plans, setPlans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlans() {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('pricing_plans')
        .select('id, slug, name, monthly_price, annual_price, features, is_active, sort_order')
        .order('sort_order', { ascending: true });

      // Public pages only show active plans
      if (!adminView) query = query.eq('is_active', true);

      const { data, error: dbErr } = await query;

      if (cancelled) return;

      if (dbErr) {
        console.error('[usePricing] fetch error:', dbErr);
        setError(dbErr.message);
        setLoading(false);
        return;
      }

      const mapped = (data ?? []).map(p => {
        const meta = PLAN_META[p.slug] ?? {
          badge: 'Plan', tier: p.name, priceNote: '',
          desc: '', cta: 'Get Started', ctaHref: '/signup',
          popular: false, dark: false,
        };
        return {
          // DB fields
          id:           p.id,
          slug:         p.slug,
          monthlyPrice: p.monthly_price,
          annualPrice:  p.annual_price,
          features:     (Array.isArray(p.features) && p.features.length > 0) ? p.features : (meta.features ?? []),
          isActive:     p.is_active,
          sortOrder:    p.sort_order,
          // UI metadata
          ...meta,
          // name from DB overrides display tier only in admin view
          displayName:  adminView ? p.name : meta.tier,
        };
      });

      setPlans(mapped);
      setLoading(false);
    }

    fetchPlans();
    return () => { cancelled = true; };
  }, [adminView]);

  return { plans, loading, error };
}
