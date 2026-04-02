-- =============================================================================
-- NLVListings — Database Integrity Fix Migration
-- Fixes: BUG-019 (conflicting pricing seeds), BUG-022 (missing updated_at),
--        BUG-029 (duplicate migration columns), missing constraints & indexes.
-- All statements are idempotent (safe to re-run).
-- =============================================================================

-- =============================================================================
-- 1. BUG-019: Canonical pricing seeds
--
-- Three files contain conflicting seed data for the same rows:
--
--   schema.sql            → starter=$29, pro=$79, dominator=$199, sponsor=$0
--   migrations_patch.sql  → starter=$9,  pro=$29, dominator=$79, sponsor=$199 ← WRONG
--                         → listing_prices: featured=$49, top=$99, spotlight=$149 ← WRONG
--   schema.sql            → listing_prices: standard=$9, featured=$29, top=$79   ← CORRECT
--
-- Canonical prices are defined by:
--   • PLAN_AMOUNTS in supabase/functions/stripe-webhook/index.ts
--   • UPGRADE_PRICES in types/payment.types.ts
--
-- Fix: ON CONFLICT DO UPDATE enforces canonical values unconditionally,
-- regardless of which file ran first.
-- =============================================================================

-- 1a. pricing_plans — enforce canonical subscription prices
INSERT INTO pricing_plans
  (slug, name, monthly_price, annual_price, features, is_active, sort_order)
VALUES
  (
    'starter', 'Starter', 29.00, 278.40,
    '["Up to 10 listings","50 lead captures/mo","1 territory","Advanced analytics","Priority email support"]',
    true, 1
  ),
  (
    'pro', 'Pro Agent', 79.00, 758.40,
    '["Up to 25 listings","200 lead captures/mo","3 territories","2 featured spots","Phone + email support","Commission tracking","CRM integration"]',
    true, 2
  ),
  (
    'dominator', 'Dominator', 199.00, 1910.40,
    '["Unlimited listings","Unlimited lead captures","Unlimited territories","Top placement spots","Dedicated account manager","Full CRM suite","Custom reporting","White-glove onboarding"]',
    true, 3
  ),
  (
    'sponsor', 'Territory Sponsor', 0.00, 0.00,
    '["Exclusive territory lock","First-priority lead routing","Featured in territory directory","Co-branded marketing materials","Quarterly strategy calls","Custom commission splits","Custom pricing — contact sales"]',
    true, 4
  )
ON CONFLICT (slug) DO UPDATE
  SET monthly_price = EXCLUDED.monthly_price,
      annual_price  = EXCLUDED.annual_price,
      name          = EXCLUDED.name,
      features      = EXCLUDED.features,
      is_active     = EXCLUDED.is_active,
      sort_order    = EXCLUDED.sort_order,
      updated_at    = NOW();

-- 1b. listing_prices — enforce canonical upgrade prices
--
-- Remove 'spotlight': it is NOT in listings.upgrade_type CHECK constraint
-- ('standard','featured','top'). If a user paid for 'spotlight', the webhook
-- would write upgrade_type='spotlight' to listings and hit a CHECK violation,
-- leaving the listing without the promised upgrade.
DELETE FROM listing_prices WHERE type = 'spotlight';

INSERT INTO listing_prices
  (type, label, price, billing_cycle, description, is_active)
VALUES
  (
    'standard', 'Standard Listing', 9.00, 'one_time',
    'Basic listing placement in territory directory.',
    true
  ),
  (
    'featured', 'Featured Listing', 29.00, 'one_time',
    'Highlighted placement with Featured badge. Appears above standard listings.',
    true
  ),
  (
    'top', 'Top Placement', 79.00, 'one_time',
    'Premium top-of-page placement with spotlight badge. Maximum visibility.',
    true
  )
ON CONFLICT (type) DO UPDATE
  SET price         = EXCLUDED.price,
      label         = EXCLUDED.label,
      billing_cycle = EXCLUDED.billing_cycle,
      description   = EXCLUDED.description,
      is_active     = EXCLUDED.is_active,
      updated_at    = NOW();

-- 1c. platform_settings — correct stale pricing keys
--
-- These keys predate the listing_prices table and carry wrong values inherited
-- from migrations_patch.sql. create-checkout-session now reads listing_prices
-- directly (BUG-031 fix), but admin UI or any legacy code reading these keys
-- must see correct values.
UPDATE platform_settings SET value = '29' WHERE key = 'featured_listing_price';
UPDATE platform_settings SET value = '79' WHERE key = 'top_listing_price';

-- =============================================================================
-- 2. BUG-022: Missing updated_at on payments and notifications
--
-- payments: status transitions (pending → succeeded → failed/refunded) leave
-- no audit trail of when the transition happened.
--
-- notifications: read-state flips (read = false → true) have no timestamp.
-- =============================================================================

-- 2a. payments.updated_at
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Back-fill: for existing rows set updated_at = created_at (best approximation)
UPDATE payments
   SET updated_at = created_at
 WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2b. notifications.updated_at
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE notifications
   SET updated_at = created_at
 WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. BUG-029: Duplicate column additions — audit trail
--
-- The following columns appear in multiple migration files. All additions use
-- IF NOT EXISTS so no runtime error occurs, but the duplication reveals that
-- migrations_patch.sql and migrations_phase2.sql were written independently
-- without a shared reference:
--
--   profiles.accepted_terms_at       — migrations_patch.sql §8 + migrations_phase2.sql §1
--   subscriptions.current_period_end — migrations_patch.sql §10 + migrations_phase2.sql §2
--   profiles.territory_id            — migrations_patch.sql §4  + schema.sql (original column)
--   subscriptions.cancelled_at       — migrations_patch.sql §10 + schema.sql (original column)
--   pricing_plans table definition   — schema.sql + migrations_patch.sql §5 (CREATE IF NOT EXISTS)
--   listing_prices table definition  — schema.sql + migrations_patch.sql §5b (CREATE IF NOT EXISTS)
--
-- No schema change is needed — IF NOT EXISTS guards handle all duplicates safely.
-- The columns are confirmed present below for clarity.
-- =============================================================================

-- Confirm all expected columns exist (no-op if already present)
ALTER TABLE profiles           ADD COLUMN IF NOT EXISTS accepted_terms_at   timestamptz;
ALTER TABLE subscriptions      ADD COLUMN IF NOT EXISTS current_period_end  timestamptz;
ALTER TABLE subscriptions      ADD COLUMN IF NOT EXISTS cancelled_at        timestamptz;
ALTER TABLE payments           ADD COLUMN IF NOT EXISTS stripe_payment_id   text;
ALTER TABLE listings           ADD COLUMN IF NOT EXISTS upgrade_expires_at  timestamptz;
ALTER TABLE listings           ADD COLUMN IF NOT EXISTS rejection_reason    text;
ALTER TABLE listings           ADD COLUMN IF NOT EXISTS expires_at          timestamptz;

-- =============================================================================
-- 4. Missing constraints
-- =============================================================================

-- 4a. payments.stripe_payment_id — partial UNIQUE index for idempotency
--
-- The stripe-webhook invoice.paid handler queries:
--   .eq("stripe_payment_id", stripeInvoiceId).maybeSingle()
-- to detect already-processed invoices. Without a unique constraint, a race
-- between two webhook retries can insert two rows with the same stripe_payment_id,
-- double-counting revenue and triggering .maybeSingle() PGRST116 errors.
-- A partial index (WHERE NOT NULL) allows legitimate NULL rows (manual payments).
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_stripe_payment_id
  ON payments (stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;

-- 4b. subscriptions.stripe_subscription_id — UNIQUE
--
-- Each Stripe subscription object maps to exactly one DB row. Enforced at the
-- DB level prevents duplicate subscription rows from concurrent webhook events
-- for the same subscription (e.g. customer.subscription.updated + invoice.paid).
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_stripe_subscription_id
  ON subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- =============================================================================
-- 5. Missing performance indexes
-- =============================================================================

-- 5a. subscriptions.stripe_customer_id
--
-- The invoice.paid handler does:
--   .from("subscriptions").select("user_id").eq("stripe_customer_id", customerId)
-- on every subscription renewal. Without an index this is a full table scan.
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
  ON subscriptions (stripe_customer_id);

-- 5b. subscriptions.stripe_subscription_id
--
-- customer.subscription.updated and customer.subscription.deleted handlers
-- both filter by stripe_subscription_id on every status change.
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON subscriptions (stripe_subscription_id);

-- 5c. commissions.recipient_role
--
-- Commission dashboard and payout queries routinely filter by recipient_role
-- (e.g. "all platform fees this month", "all director shares pending approval").
CREATE INDEX IF NOT EXISTS idx_commissions_recipient_role
  ON commissions (recipient_role);

-- 5d. commissions.source_transaction_id
--
-- The ON CONFLICT clause in process_transaction_commissions() uses
-- (source_transaction_id, type, recipient_role) — the two non-leading columns
-- are already indexed above; the leading column needs its own index.
CREATE INDEX IF NOT EXISTS idx_commissions_source_transaction_id
  ON commissions (source_transaction_id)
  WHERE source_transaction_id IS NOT NULL;

-- 5e. leads.lock_until — partial index for active lock checks
--
-- enforce_lead_lock trigger and lock status queries test lock_until > NOW().
-- Full index on a nullable timestamptz benefits from partial restriction.
CREATE INDEX IF NOT EXISTS idx_leads_lock_until_active
  ON leads (lock_until)
  WHERE lock_until IS NOT NULL;

-- 5f. listings.(realtor_id, status) — composite for "my listings" queries
--
-- The common realtor dashboard query is:
--   WHERE realtor_id = ? AND status IN (...)
-- The existing idx_listings_realtor_id covers realtor_id alone;
-- this composite avoids a secondary status filter on potentially large sets.
CREATE INDEX IF NOT EXISTS idx_listings_realtor_status
  ON listings (realtor_id, status);

-- 5g. listings.upgrade_expires_at — partial index for expiry sweep
--
-- A scheduled function that resets expired upgrades (upgrade_type → 'standard')
-- filters WHERE upgrade_expires_at <= NOW() AND upgrade_expires_at IS NOT NULL.
CREATE INDEX IF NOT EXISTS idx_listings_upgrade_expires_at
  ON listings (upgrade_expires_at)
  WHERE upgrade_expires_at IS NOT NULL;

-- 5h. notifications.read = false — partial index for unread badge count
--
-- The unread count query is:
--   WHERE user_id = ? AND read = false
-- The existing idx_notifications_read covers (user_id, read) but a partial
-- index on the false side avoids scanning the much-larger read=true heap.
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications (user_id)
  WHERE read = false;

-- 5i. audit_logs — composite index for entity-scoped queries
--
-- Common query: all actions on entity X of type Y, newest first.
-- The existing separate indexes on entity_type and entity_id cause a bitmap
-- index scan; a composite covering all three eliminates the merge step.
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id_time
  ON audit_logs (entity_type, entity_id, timestamp DESC);

-- 5j. listing_audit_log.performed_by
--
-- Required by the director SELECT policy added in migrations_security_fixes.sql:
--   WHERE listing_id IN (SELECT id FROM listings WHERE territory_id = director's territory)
-- Also useful for "all actions by user X" queries.
CREATE INDEX IF NOT EXISTS idx_listing_audit_log_performed_by
  ON listing_audit_log (performed_by);

-- =============================================================================
-- 5. Remove stale listing-price keys from platform_settings
--
-- schema.sql seeded 'featured_listing_price' = 49 and 'top_listing_price' = 99
-- into platform_settings. The listing_prices table is the authoritative source
-- (featured = $29, top = $79 from schema.sql seeds). The platform_settings keys
-- have different values and are not read by any code path, but they appear on the
-- admin settings page and would mislead operators into thinking the real charges
-- are $49/$99. Removing them eliminates the conflicting source of truth.
-- =============================================================================

DELETE FROM platform_settings
 WHERE key IN ('featured_listing_price', 'top_listing_price');

-- =============================================================================
-- Done. Verify with:
--   SELECT slug, monthly_price FROM pricing_plans ORDER BY sort_order;
--   SELECT type, price FROM listing_prices ORDER BY price;
--   SELECT key FROM platform_settings WHERE key IN ('featured_listing_price','top_listing_price');  -- should return 0 rows
--   \d payments          -- confirm updated_at column + trigger
--   \d notifications     -- confirm updated_at column + trigger
--   \di payments         -- confirm uq_payments_stripe_payment_id
--   \di subscriptions    -- confirm uq_subscriptions_stripe_subscription_id, stripe indexes
-- =============================================================================
