-- =============================================================================
-- Migration: Update pricing_plans to introductory pricing
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- Intro (was Starter)
UPDATE pricing_plans SET
  name          = 'Intro',
  monthly_price = 99.00,
  annual_price  = 950.00,
  features      = '["Unlimited Listings","Basic CRM","Lead Capture","Platform Access"]',
  sort_order    = 1
WHERE slug = 'starter';

-- Pro Agent (was Pro)
UPDATE pricing_plans SET
  name          = 'Pro Agent',
  monthly_price = 199.00,
  annual_price  = 1910.00,
  features      = '["Unlimited Listings","Advanced CRM & Automation","Enhanced Analytics","Access to New Leaf Buyer Network","Earn Commissions on New Leaf Products"]',
  sort_order    = 2
WHERE slug = 'pro';

-- Dominator (unchanged slug)
UPDATE pricing_plans SET
  name          = 'Dominator',
  monthly_price = 299.00,
  annual_price  = 2870.00,
  features      = '["Unlimited Listings","Full CRM & Automation Suite","Priority Lead Routing","Access to Developer Pre-Sales (Mexico & International)","First-Look Access to New Inventory","Higher Commission Opportunities"]',
  sort_order    = 3
WHERE slug = 'dominator';

-- Market Owner (was Territory Sponsor)
UPDATE pricing_plans SET
  name          = 'Market Owner',
  monthly_price = 0.00,
  annual_price  = 0.00,
  features      = '["Everything in Dominator","Exclusive Territory Rights","Protected Lead Flow","Priority Market Positioning","Direct Developer Access","White-Glove Support"]',
  sort_order    = 4
WHERE slug = 'sponsor';
