-- =============================================================================
-- NLV Listings — Schema Patch Migrations
-- Run this in the Supabase SQL Editor to fill gaps in the live database.
-- All statements are idempotent (safe to re-run).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. commissions.status — add 'rejected' to the allowed values
--    The original CHECK only allowed: pending, approved, payable, paid
-- ---------------------------------------------------------------------------
ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS commissions_status_check;

ALTER TABLE commissions
  ADD CONSTRAINT commissions_status_check
  CHECK (status IN ('pending', 'approved', 'payable', 'paid', 'rejected'));


-- ---------------------------------------------------------------------------
-- 2. listings.status — ensure 'archived' maps gracefully (use 'expired')
--    Current allowed: draft, pending, active, sold, expired, rejected
--    No change needed — app now uses 'expired' for archived listings.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 3. commissions — add override_amount column for custom split overrides
--    NULL means "use default percentage split"
-- ---------------------------------------------------------------------------
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS override_amount numeric;


-- ---------------------------------------------------------------------------
-- 4. profiles — ensure territory_id FK column exists
--    (may already exist if schema.sql was run in full)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS territory_id uuid REFERENCES territories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_territory_id ON profiles (territory_id);


-- ---------------------------------------------------------------------------
-- 5. Create pricing_plans table if it doesn't exist
--    Subscription plan definitions — editable by admin via UI
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            VARCHAR(50)  NOT NULL UNIQUE,
  name            VARCHAR(100) NOT NULL,
  monthly_price   DECIMAL(10,2) NOT NULL DEFAULT 0,
  annual_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  features        JSONB        NOT NULL DEFAULT '[]',
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  stripe_monthly_price_id VARCHAR(100) NULL,
  stripe_annual_price_id  VARCHAR(100) NULL,
  sort_order      INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Enable RLS (idempotent)
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

-- Policies (DROP first to avoid duplicate errors)
DROP POLICY IF EXISTS "pricing_plans_select_all"    ON pricing_plans;
DROP POLICY IF EXISTS "pricing_plans_insert_admin"  ON pricing_plans;
DROP POLICY IF EXISTS "pricing_plans_update_admin"  ON pricing_plans;
DROP POLICY IF EXISTS "pricing_plans_delete_admin"  ON pricing_plans;

CREATE POLICY "pricing_plans_select_all"   ON pricing_plans FOR SELECT USING (true);
CREATE POLICY "pricing_plans_insert_admin" ON pricing_plans FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "pricing_plans_update_admin" ON pricing_plans FOR UPDATE USING (is_admin());
CREATE POLICY "pricing_plans_delete_admin" ON pricing_plans FOR DELETE USING (is_admin());


-- ---------------------------------------------------------------------------
-- 5b. Create listing_prices table if it doesn't exist
--     Listing upgrade prices — editable by admin via UI
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_prices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            VARCHAR(50)  NOT NULL UNIQUE,
  label           VARCHAR(100) NOT NULL,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_cycle   VARCHAR(20)  NOT NULL DEFAULT 'one_time',
  description     TEXT         NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  stripe_price_id VARCHAR(100) NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE listing_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_prices_select_all"    ON listing_prices;
DROP POLICY IF EXISTS "listing_prices_insert_admin"  ON listing_prices;
DROP POLICY IF EXISTS "listing_prices_update_admin"  ON listing_prices;
DROP POLICY IF EXISTS "listing_prices_delete_admin"  ON listing_prices;

CREATE POLICY "listing_prices_select_all"   ON listing_prices FOR SELECT USING (true);
CREATE POLICY "listing_prices_insert_admin" ON listing_prices FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "listing_prices_update_admin" ON listing_prices FOR UPDATE USING (is_admin());
CREATE POLICY "listing_prices_delete_admin" ON listing_prices FOR DELETE USING (is_admin());


-- ---------------------------------------------------------------------------
-- 5c. Seed pricing_plans if the table is empty
--    Prices are in USD/month. Adjust as needed.
-- ---------------------------------------------------------------------------
INSERT INTO pricing_plans (slug, name, monthly_price, annual_price, features, is_active, sort_order)
SELECT slug, name, monthly_price, annual_price, features::jsonb, is_active, sort_order
FROM (VALUES
  ('starter',   'Starter',   9.00,   90.00,  '["Up to 5 active listings","Basic lead notifications","Standard support"]',  true, 1),
  ('pro',       'Pro',       29.00,  290.00, '["Unlimited listings","Priority lead routing","Analytics dashboard","Email support"]', true, 2),
  ('dominator', 'Dominator', 79.00,  790.00, '["Everything in Pro","Territory exclusivity","Featured listing upgrades","Phone support"]', true, 3),
  ('sponsor',   'Sponsor',   199.00, 1990.00,'["Everything in Dominator","Sponsored placement","Custom branding","Dedicated manager"]', true, 4)
) AS v(slug, name, monthly_price, annual_price, features, is_active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM pricing_plans LIMIT 1);


-- ---------------------------------------------------------------------------
-- 5d. Seed listing_prices if the table is empty
-- ---------------------------------------------------------------------------
INSERT INTO listing_prices (type, label, price, billing_cycle, description, is_active)
SELECT type, label, price, billing_cycle, description, is_active
FROM (VALUES
  ('featured',  'Featured Listing',  49.00, 'one_time', 'Highlighted in search results for 30 days', true),
  ('top',       'Top of Search',     99.00, 'one_time', 'Pinned at the top of category results',     true),
  ('spotlight', 'Homepage Spotlight',149.00,'one_time', 'Featured on the homepage for 7 days',       true)
) AS v(type, label, price, billing_cycle, description, is_active)
WHERE NOT EXISTS (SELECT 1 FROM listing_prices LIMIT 1);


-- ---------------------------------------------------------------------------
-- 7. Seed platform_settings defaults if missing
-- ---------------------------------------------------------------------------
INSERT INTO platform_settings (key, value, description)
VALUES
  ('commission_realtor_pct',  '45', 'Default realtor commission percentage'),
  ('commission_director_pct', '25', 'Default director commission percentage'),
  ('commission_admin_pct',    '15', 'Default admin commission percentage'),
  ('commission_platform_pct', '15', 'Default platform commission percentage'),
  ('lead_lock_days',          '180','Number of days a lead is locked to the assigned realtor'),
  ('max_listings_starter',    '5',  'Maximum active listings for Starter plan'),
  ('max_listings_pro',        '-1', 'Maximum active listings for Pro plan (-1 = unlimited)')
ON CONFLICT (key) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 8. profiles — add accepted_terms_at column
--    Referenced by AuthContext.jsx signup flow but missing from base schema.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz;


-- ---------------------------------------------------------------------------
-- 9. payments — ensure stripe_payment_id column exists
--    Used by stripe-webhook invoice.paid handler for idempotency.
-- ---------------------------------------------------------------------------
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_payment_id text;

CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_id ON payments (stripe_payment_id);


-- ---------------------------------------------------------------------------
-- 10. subscriptions — ensure current_period_end column exists
--    Referenced by BillingPage.jsx for next billing date display.
-- ---------------------------------------------------------------------------
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;


-- ---------------------------------------------------------------------------
-- 11. profiles — ensure assigned_director_id FK column exists
--    Used by stripe-webhook for commission routing.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS assigned_director_id uuid REFERENCES profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_assigned_director_id ON profiles (assigned_director_id);


-- ---------------------------------------------------------------------------
-- 12. listings / leads / territories / profiles — fix UPDATE RLS policies
--    Several policies used USING without WITH CHECK; explicitly adding
--    WITH CHECK prevents silent row-invisibility in RETURNING clauses.
--    The original policy had USING but no WITH CHECK.  When WITH CHECK is
--    absent Postgres copies the USING expression, but some PostgREST versions
--    (and the Supabase Realtime / REST layer) silently drop updated rows from
--    the returned result-set when the post-update row fails the implicit check.
--    Explicitly adding WITH CHECK ensures the row is both updatable AND
--    visible in the RETURNING clause so supabase-js .select() works correctly.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "listings_update_admin_director" ON listings;

CREATE POLICY "listings_update_admin_director"
  ON listings FOR UPDATE
  USING (is_director_or_admin())
  WITH CHECK (is_director_or_admin());

-- Fix leads update policy
DROP POLICY IF EXISTS "leads_update_admin" ON leads;

CREATE POLICY "leads_update_admin"
  ON leads FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix profiles update policy for admin
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix territories update policy for admin
DROP POLICY IF EXISTS "territories_update_admin" ON territories;

CREATE POLICY "territories_update_admin"
  ON territories FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix subscriptions update policy for admin
DROP POLICY IF EXISTS "subscriptions_update_admin" ON subscriptions;

CREATE POLICY "subscriptions_update_admin"
  ON subscriptions FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix commissions update policy for admin (if policy exists)
DROP POLICY IF EXISTS "commissions_update_admin" ON commissions;

CREATE POLICY "commissions_update_admin"
  ON commissions FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix pricing_plans update policy for admin
DROP POLICY IF EXISTS "pricing_plans_update_admin" ON pricing_plans;

CREATE POLICY "pricing_plans_update_admin"
  ON pricing_plans FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix listing_prices update policy for admin
DROP POLICY IF EXISTS "listing_prices_update_admin" ON listing_prices;

CREATE POLICY "listing_prices_update_admin"
  ON listing_prices FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix platform_settings update policy for admin
DROP POLICY IF EXISTS "platform_settings_update_admin" ON platform_settings;

CREATE POLICY "platform_settings_update_admin"
  ON platform_settings FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- 13. listings — status column: ensure 'rejected' is an allowed value
--    Some installs only have: draft, pending, active, sold, expired
-- ---------------------------------------------------------------------------
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'pending', 'active', 'sold', 'expired', 'rejected'));


-- ---------------------------------------------------------------------------
-- 14. listings — add INSERT policy for admins
--    The original schema only had listings_insert_realtor (realtor_id = auth.uid()).
--    Admins had no INSERT policy at all, so creating any listing as admin was
--    blocked by RLS even when realtor_id matched auth.uid().
--    This adds explicit admin INSERT permission.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "listings_insert_admin" ON listings;

CREATE POLICY "listings_insert_admin"
  ON listings FOR INSERT
  WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- 15. audit_logs — add 'details' column (text)
--    The code in useListings, useUsers, etc. writes a 'details' field but the
--    original schema only had: user_id, action, entity_type, entity_id,
--    timestamp, metadata.  Without this column every audit INSERT silently
--    ignores the field (Postgres ignores unknown insert columns) but
--    useAuditLogs reads log.details — it returns null without the column.
-- ---------------------------------------------------------------------------
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS details text;


-- ---------------------------------------------------------------------------
-- Done. Verify with:
--   SELECT * FROM pricing_plans ORDER BY sort_order;
--   SELECT * FROM listing_prices;
--   SELECT * FROM platform_settings;
--   \d commissions   -- check status constraint
--   \d listings      -- check status constraint, listings_update_admin_director policy
--   \d profiles      -- check accepted_terms_at, territory_id, assigned_director_id
--   \d subscriptions -- check current_period_end, cancelled_at
--   \d payments      -- check stripe_payment_id
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 12b. listings � fix SELECT RLS policies (RE-ADDED)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS listings_select_admin ON listings;
CREATE POLICY listings_select_admin ON listings FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS listings_select_director_territory ON listings;
CREATE POLICY listings_select_director_territory ON listings FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'director' AND p.territory_id = listings.territory_id));
