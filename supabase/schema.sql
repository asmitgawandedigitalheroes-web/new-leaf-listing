-- =============================================================================
-- NLVListings Platform - Complete Database Schema
-- Run this in the Supabase SQL Editor to set up all tables, RLS, indexes, and seed data
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HELPER FUNCTION: updated_at auto-update trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- HELPER FUNCTION: mask_email (j***@gmail.com format)
-- =============================================================================

CREATE OR REPLACE FUNCTION mask_email(email text)
RETURNS text AS $$
DECLARE
  parts text[];
  local text;
  domain text;
BEGIN
  IF email IS NULL OR email = '' THEN
    RETURN NULL;
  END IF;
  parts := string_to_array(email, '@');
  IF array_length(parts, 1) < 2 THEN
    RETURN email;
  END IF;
  local  := parts[1];
  domain := parts[2];
  RETURN left(local, 1) || '***@' || domain;
END;
$$ language 'plpgsql' IMMUTABLE;

-- =============================================================================
-- TABLE: territories
-- Must be created before profiles due to FK dependency
-- =============================================================================

CREATE TABLE IF NOT EXISTS territories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country     text NOT NULL DEFAULT 'USA',
  state       text NOT NULL,
  city        text,
  director_id uuid,  -- FK added after profiles table is created
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_territories_state      ON territories (state);
CREATE INDEX IF NOT EXISTS idx_territories_director_id ON territories (director_id);

CREATE TRIGGER update_territories_updated_at
  BEFORE UPDATE ON territories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: profiles (extends auth.users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email                text NOT NULL,
  full_name            text,
  phone                text,
  bio                  text,
  avatar_url           text,
  role                 text NOT NULL DEFAULT 'realtor'
                         CHECK (role IN ('admin','director','realtor')),
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('active','pending','suspended')),
  territory_id         uuid REFERENCES territories (id) ON DELETE SET NULL,
  assigned_director_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  license_number       text,
  license_state        text,
  license_expiry       date,
  subscription_id      uuid,  -- FK to subscriptions added after that table is created
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- Add director_id FK on territories now that profiles exists
ALTER TABLE territories
  ADD CONSTRAINT fk_territories_director
  FOREIGN KEY (director_id) REFERENCES profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_role         ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_status       ON profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_territory_id ON profiles (territory_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email        ON profiles (email);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: listings
-- =============================================================================

CREATE TABLE IF NOT EXISTS listings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  price         numeric,
  property_type text,
  bedrooms      int,
  bathrooms     numeric,
  sqft          int,
  address       text,
  city          text,
  state         text,
  country       text DEFAULT 'USA',
  zip_code      text,
  images        text[] DEFAULT '{}',
  territory_id  uuid REFERENCES territories (id) ON DELETE SET NULL,
  realtor_id    uuid REFERENCES profiles (id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','pending','active','sold','expired','rejected')),
  upgrade_type  text NOT NULL DEFAULT 'standard'
                  CHECK (upgrade_type IN ('standard','featured','top')),
  approved_by   uuid REFERENCES profiles (id) ON DELETE SET NULL,
  approved_at   timestamptz,
  views_count   int DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_status       ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_realtor_id   ON listings (realtor_id);
CREATE INDEX IF NOT EXISTS idx_listings_territory_id ON listings (territory_id);
CREATE INDEX IF NOT EXISTS idx_listings_price        ON listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_city_state   ON listings (city, state);
CREATE INDEX IF NOT EXISTS idx_listings_upgrade_type ON listings (upgrade_type);
CREATE INDEX IF NOT EXISTS idx_listings_created_at   ON listings (created_at DESC);

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: leads
-- =============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source               text NOT NULL DEFAULT 'website'
                         CHECK (source IN ('website','api','manual','referral','partner')),
  listing_id           uuid REFERENCES listings (id) ON DELETE SET NULL,
  territory_id         uuid REFERENCES territories (id) ON DELETE SET NULL,
  assigned_realtor_id  uuid REFERENCES profiles (id) ON DELETE SET NULL,
  assigned_director_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  contact_name         text,
  contact_email        text,
  contact_phone        text,
  contact_masked_email text,  -- j***@gmail.com format
  budget_min           numeric,
  budget_max           numeric,
  interest_type        text,
  notes                text,
  score                int DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  status               text NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new','assigned','contacted','showing','offer','converted','lost')),
  attribution_expiry   timestamptz,
  lock_until           timestamptz,
  crm_synced_at        timestamptz,
  crm_id               text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_status               ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_realtor_id  ON leads (assigned_realtor_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_director_id ON leads (assigned_director_id);
CREATE INDEX IF NOT EXISTS idx_leads_territory_id         ON leads (territory_id);
CREATE INDEX IF NOT EXISTS idx_leads_listing_id           ON leads (listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at           ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_score                ON leads (score DESC);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: subscriptions
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
  plan                   text NOT NULL
                           CHECK (plan IN ('starter','pro','dominator','sponsor')),
  status                 text NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','past_due','cancelled','trialing')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  next_billing_date      timestamptz,
  cancelled_at           timestamptz,
  cancel_reason          text,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan    ON subscriptions (plan);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add FK on profiles.subscription_id now that subscriptions table exists
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_subscription
  FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE SET NULL;

-- =============================================================================
-- TABLE: payments
-- =============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES profiles (id) ON DELETE SET NULL NOT NULL,
  type              text NOT NULL
                      CHECK (type IN ('subscription','listing_upgrade')),
  amount            numeric NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','succeeded','failed','refunded')),
  stripe_payment_id text,
  description       text,
  listing_id        uuid REFERENCES listings (id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id    ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status     ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_listing_id ON payments (listing_id);

-- =============================================================================
-- TABLE: commissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS commissions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  text NOT NULL
                          CHECK (type IN ('subscription','listing','deal','referral')),
  amount                numeric NOT NULL,
  source_transaction_id uuid REFERENCES payments (id) ON DELETE SET NULL,
  recipient_user_id     uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
  override_user_id      uuid REFERENCES profiles (id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','payable','paid')),
  property              text,
  listing_id            uuid REFERENCES listings (id) ON DELETE SET NULL,
  notes                 text,
  approved_by           uuid REFERENCES profiles (id) ON DELETE SET NULL,
  approved_at           timestamptz,
  paid_at               timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_recipient_user_id ON commissions (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status            ON commissions (status);
CREATE INDEX IF NOT EXISTS idx_commissions_type              ON commissions (type);
CREATE INDEX IF NOT EXISTS idx_commissions_listing_id        ON commissions (listing_id);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at        ON commissions (created_at DESC);

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: audit_logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles (id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  timestamp   timestamptz DEFAULT now(),
  metadata    jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id   ON audit_logs (entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp   ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON audit_logs (action);

-- =============================================================================
-- TABLE: notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
  title      text NOT NULL,
  message    text NOT NULL,
  type       text NOT NULL
               CHECK (type IN ('lead','listing','payment','commission','system')),
  entity_id  uuid,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read       ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type       ON notifications (type);

-- =============================================================================
-- TABLE: messages (in-app messaging for leads)
-- =============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid REFERENCES leads (id) ON DELETE CASCADE NOT NULL,
  sender_id    uuid REFERENCES profiles (id) ON DELETE SET NULL NOT NULL,
  recipient_id uuid REFERENCES profiles (id) ON DELETE SET NULL NOT NULL,
  content      text NOT NULL,
  read         boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_lead_id      ON messages (lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id    ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages (recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_read         ON messages (recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at   ON messages (created_at DESC);

-- =============================================================================
-- TABLE: crm_configs
-- Stores webhook credentials per CRM provider (ghl, salespro, leap).
-- auth_value is stored as-is; encrypt at rest via Supabase Vault in production.
-- =============================================================================

CREATE TABLE IF NOT EXISTS crm_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    text NOT NULL CHECK (provider IN ('ghl','salespro','leap')),
  webhook_url text NOT NULL,
  auth_header text NOT NULL DEFAULT 'Authorization',
  auth_value  text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (provider)
);

CREATE INDEX IF NOT EXISTS idx_crm_configs_provider ON crm_configs (provider);

CREATE TRIGGER update_crm_configs_updated_at
  BEFORE UPDATE ON crm_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: only admins can manage CRM configs
ALTER TABLE crm_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_configs_select_admin"
  ON crm_configs FOR SELECT USING (is_admin());

CREATE POLICY "crm_configs_insert_admin"
  ON crm_configs FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "crm_configs_update_admin"
  ON crm_configs FOR UPDATE USING (is_admin());

CREATE POLICY "crm_configs_delete_admin"
  ON crm_configs FOR DELETE USING (is_admin());

-- =============================================================================
-- TABLE: crm_sync_queue
-- Holds failed CRM webhook pushes for background retry (max 3 attempts).
-- A background job (pg_cron or Supabase scheduled function) retries pending rows.
-- =============================================================================

CREATE TABLE IF NOT EXISTS crm_sync_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL CHECK (provider IN ('ghl','salespro','leap')),
  lead_id       uuid REFERENCES leads (id) ON DELETE CASCADE,
  payload       jsonb NOT NULL,
  attempts      int NOT NULL DEFAULT 0,
  max_attempts  int NOT NULL DEFAULT 3,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','success','failed')),
  last_error    text,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_queue_status        ON crm_sync_queue (status);
CREATE INDEX IF NOT EXISTS idx_crm_sync_queue_next_retry_at ON crm_sync_queue (next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_crm_sync_queue_lead_id       ON crm_sync_queue (lead_id);

CREATE TRIGGER update_crm_sync_queue_updated_at
  BEFORE UPDATE ON crm_sync_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: only admins/service role interact with queue
ALTER TABLE crm_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_sync_queue_select_admin"
  ON crm_sync_queue FOR SELECT USING (is_admin());

CREATE POLICY "crm_sync_queue_insert_service"
  ON crm_sync_queue FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "crm_sync_queue_update_admin"
  ON crm_sync_queue FOR UPDATE USING (is_admin());

-- =============================================================================
-- TABLE: platform_settings
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  description text,
  updated_at  timestamptz DEFAULT now()
);

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: check if current user is admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is director or admin
CREATE OR REPLACE FUNCTION is_director_or_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin','director')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's territory_id
CREATE OR REPLACE FUNCTION my_territory_id()
RETURNS uuid AS $$
  SELECT territory_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- PROFILES policies
-- ---------------------------------------------------------------------------

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Authenticated users can read basic info of all profiles (for display purposes)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admins can update any profile
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Admins can insert profiles (e.g., manual user creation)
CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  WITH CHECK (is_admin());

-- Supabase auth trigger can insert new profiles
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- TERRITORIES policies
-- ---------------------------------------------------------------------------

-- Everyone authenticated can read territories
CREATE POLICY "territories_select_authenticated"
  ON territories FOR SELECT
  USING (auth.role() = 'authenticated');

-- Public can read territories (for listing search)
CREATE POLICY "territories_select_public"
  ON territories FOR SELECT
  USING (true);

-- Only admins can insert/update/delete territories
CREATE POLICY "territories_insert_admin"
  ON territories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "territories_update_admin"
  ON territories FOR UPDATE
  USING (is_admin());

CREATE POLICY "territories_delete_admin"
  ON territories FOR DELETE
  USING (is_admin());

-- ---------------------------------------------------------------------------
-- LISTINGS policies
-- ---------------------------------------------------------------------------

-- Public can read active listings
CREATE POLICY "listings_select_public_active"
  ON listings FOR SELECT
  USING (status = 'active');

-- Realtors can see their own listings (all statuses)
CREATE POLICY "listings_select_own_realtor"
  ON listings FOR SELECT
  USING (realtor_id = auth.uid());

-- Directors can see all listings in their territory
CREATE POLICY "listings_select_director_territory"
  ON listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'director'
        AND p.territory_id = listings.territory_id
    )
  );

-- Admins can see all listings
CREATE POLICY "listings_select_admin"
  ON listings FOR SELECT
  USING (is_admin());

-- Realtors can create their own listings
CREATE POLICY "listings_insert_realtor"
  ON listings FOR INSERT
  WITH CHECK (realtor_id = auth.uid());

-- Realtors can update their own draft/pending/rejected listings
CREATE POLICY "listings_update_own_realtor"
  ON listings FOR UPDATE
  USING (
    realtor_id = auth.uid()
    AND status IN ('draft', 'pending', 'rejected')
  )
  WITH CHECK (realtor_id = auth.uid());

-- Admins and directors can update any listing
CREATE POLICY "listings_update_admin_director"
  ON listings FOR UPDATE
  USING (is_director_or_admin());

-- Realtors can delete their own draft listings
CREATE POLICY "listings_delete_own_realtor"
  ON listings FOR DELETE
  USING (realtor_id = auth.uid() AND status = 'draft');

-- Admins can delete any listing
CREATE POLICY "listings_delete_admin"
  ON listings FOR DELETE
  USING (is_admin());

-- ---------------------------------------------------------------------------
-- LEADS policies
-- ---------------------------------------------------------------------------

-- Realtors can see leads assigned to them
CREATE POLICY "leads_select_assigned_realtor"
  ON leads FOR SELECT
  USING (assigned_realtor_id = auth.uid());

-- Directors can see all leads in their territory
CREATE POLICY "leads_select_director_territory"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'director'
        AND p.territory_id = leads.territory_id
    )
  );

-- Admins can see all leads
CREATE POLICY "leads_select_admin"
  ON leads FOR SELECT
  USING (is_admin());

-- Admins and directors can insert leads
CREATE POLICY "leads_insert_admin_director"
  ON leads FOR INSERT
  WITH CHECK (is_director_or_admin());

-- Public/API can insert leads (for web forms)
CREATE POLICY "leads_insert_public"
  ON leads FOR INSERT
  WITH CHECK (true);

-- Realtors can update their assigned leads
CREATE POLICY "leads_update_assigned_realtor"
  ON leads FOR UPDATE
  USING (assigned_realtor_id = auth.uid())
  WITH CHECK (assigned_realtor_id = auth.uid());

-- Directors can update leads in their territory
CREATE POLICY "leads_update_director_territory"
  ON leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'director'
        AND p.territory_id = leads.territory_id
    )
  );

-- Admins can update any lead
CREATE POLICY "leads_update_admin"
  ON leads FOR UPDATE
  USING (is_admin());

-- Only admins can delete leads
CREATE POLICY "leads_delete_admin"
  ON leads FOR DELETE
  USING (is_admin());

-- ---------------------------------------------------------------------------
-- SUBSCRIPTIONS policies
-- ---------------------------------------------------------------------------

-- Users can see their own subscription
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Admins can see all subscriptions
CREATE POLICY "subscriptions_select_admin"
  ON subscriptions FOR SELECT
  USING (is_admin());

-- Only admins can insert/update/delete subscriptions
CREATE POLICY "subscriptions_insert_admin"
  ON subscriptions FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "subscriptions_update_admin"
  ON subscriptions FOR UPDATE
  USING (is_admin());

CREATE POLICY "subscriptions_delete_admin"
  ON subscriptions FOR DELETE
  USING (is_admin());

-- ---------------------------------------------------------------------------
-- PAYMENTS policies
-- ---------------------------------------------------------------------------

-- Users can see their own payments
CREATE POLICY "payments_select_own"
  ON payments FOR SELECT
  USING (user_id = auth.uid());

-- Admins can see all payments
CREATE POLICY "payments_select_admin"
  ON payments FOR SELECT
  USING (is_admin());

-- Only admins/system can insert payments
CREATE POLICY "payments_insert_admin"
  ON payments FOR INSERT
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- COMMISSIONS policies
-- ---------------------------------------------------------------------------

-- Users can see their own commissions (as recipient)
CREATE POLICY "commissions_select_own"
  ON commissions FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Directors can see commissions for their territory members
CREATE POLICY "commissions_select_director"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'director'
        AND EXISTS (
          SELECT 1 FROM profiles r
          WHERE r.id = commissions.recipient_user_id
            AND r.territory_id = p.territory_id
        )
    )
  );

-- Admins can see all commissions
CREATE POLICY "commissions_select_admin"
  ON commissions FOR SELECT
  USING (is_admin());

-- Only admins can insert commissions
CREATE POLICY "commissions_insert_admin"
  ON commissions FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update commissions
CREATE POLICY "commissions_update_admin"
  ON commissions FOR UPDATE
  USING (is_admin());

-- ---------------------------------------------------------------------------
-- AUDIT_LOGS policies
-- ---------------------------------------------------------------------------

-- Only admins can read audit logs
CREATE POLICY "audit_logs_select_admin"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- System/service role can insert audit logs
CREATE POLICY "audit_logs_insert_authenticated"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS policies
-- ---------------------------------------------------------------------------

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can insert notifications for anyone
CREATE POLICY "notifications_insert_admin"
  ON notifications FOR INSERT
  WITH CHECK (is_admin());

-- System can insert notifications
CREATE POLICY "notifications_insert_service"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- MESSAGES policies
-- ---------------------------------------------------------------------------

-- Only sender and recipient can read messages
CREATE POLICY "messages_select_participants"
  ON messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- Admins can read all messages
CREATE POLICY "messages_select_admin"
  ON messages FOR SELECT
  USING (is_admin());

-- Authenticated users can send messages
CREATE POLICY "messages_insert_sender"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Recipients can mark messages as read
CREATE POLICY "messages_update_recipient"
  ON messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Senders can delete their own messages
CREATE POLICY "messages_delete_sender"
  ON messages FOR DELETE
  USING (sender_id = auth.uid());

-- ---------------------------------------------------------------------------
-- PLATFORM_SETTINGS policies
-- ---------------------------------------------------------------------------

-- All authenticated users can read settings
CREATE POLICY "platform_settings_select_authenticated"
  ON platform_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete settings
CREATE POLICY "platform_settings_insert_admin"
  ON platform_settings FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "platform_settings_update_admin"
  ON platform_settings FOR UPDATE
  USING (is_admin());

CREATE POLICY "platform_settings_delete_admin"
  ON platform_settings FOR DELETE
  USING (is_admin());

-- =============================================================================
-- SEED DATA: Platform Settings
-- =============================================================================

INSERT INTO platform_settings (key, value, description) VALUES
  ('platform_name',              '"NLV Listings"',   'Platform display name'),
  ('director_commission_rate',   '25',               'Director recurring commission percentage'),
  ('admin_override_rate',        '15',               'Admin override commission percentage'),
  ('platform_fee_rate',          '15',               'Platform transaction fee percentage'),
  ('lead_attribution_days',      '180',              'Days a realtor retains a lead after first contact'),
  ('require_listing_approval',   'true',             'Whether listings require admin approval before going active'),
  ('payout_schedule',            '"monthly"',        'Commission payout frequency'),
  ('max_listings_starter',       '5',                'Max active listings for starter plan'),
  ('max_listings_pro',           '20',               'Max active listings for pro plan'),
  ('max_listings_dominator',     '100',              'Max active listings for dominator plan'),
  ('lead_lock_hours',            '24',               'Hours a lead is locked after first contact'),
  ('featured_listing_price',     '49',               'USD price to upgrade a listing to featured'),
  ('top_listing_price',          '99',               'USD price to upgrade a listing to top placement')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- SEED DATA: Territories
-- =============================================================================

INSERT INTO territories (id, country, state, city) VALUES
  ('00000000-0000-0000-0000-000000000001', 'USA', 'California',  'Beverly Hills'),
  ('00000000-0000-0000-0000-000000000002', 'USA', 'Florida',     'Miami'),
  ('00000000-0000-0000-0000-000000000003', 'USA', 'Texas',       'Austin'),
  ('00000000-0000-0000-0000-000000000004', 'USA', 'Tennessee',   'Nashville'),
  ('00000000-0000-0000-0000-000000000005', 'USA', 'Texas',       'Houston'),
  ('00000000-0000-0000-0000-000000000006', 'USA', 'California',  'Malibu'),
  ('00000000-0000-0000-0000-000000000007', 'USA', 'Texas',       'Dallas')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TABLE: pricing_plans
-- Subscription plan definitions — editable by admin via UI
-- =============================================================================

CREATE TABLE IF NOT EXISTS pricing_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            VARCHAR(50)  NOT NULL UNIQUE,  -- e.g. 'starter', 'pro', 'dominator', 'sponsor'
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

CREATE TRIGGER pricing_plans_updated_at
  BEFORE UPDATE ON pricing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans (public pricing page)
CREATE POLICY "pricing_plans_select_all"
  ON pricing_plans FOR SELECT
  USING (true);

CREATE POLICY "pricing_plans_insert_admin"
  ON pricing_plans FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "pricing_plans_update_admin"
  ON pricing_plans FOR UPDATE
  USING (is_admin());

CREATE POLICY "pricing_plans_delete_admin"
  ON pricing_plans FOR DELETE
  USING (is_admin());

-- =============================================================================
-- TABLE: listing_prices
-- Listing upgrade prices — editable by admin via UI
-- =============================================================================

CREATE TABLE IF NOT EXISTS listing_prices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            VARCHAR(50)  NOT NULL UNIQUE,  -- 'standard', 'featured', 'top'
  label           VARCHAR(100) NOT NULL,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_cycle   VARCHAR(20)  NOT NULL DEFAULT 'one_time', -- 'one_time' | 'monthly'
  description     TEXT         NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  stripe_price_id VARCHAR(100) NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER listing_prices_updated_at
  BEFORE UPDATE ON listing_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE listing_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_prices_select_all"
  ON listing_prices FOR SELECT
  USING (true);

CREATE POLICY "listing_prices_insert_admin"
  ON listing_prices FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "listing_prices_update_admin"
  ON listing_prices FOR UPDATE
  USING (is_admin());

CREATE POLICY "listing_prices_delete_admin"
  ON listing_prices FOR DELETE
  USING (is_admin());

-- =============================================================================
-- SEED DATA: Pricing Plans
-- =============================================================================

INSERT INTO pricing_plans (slug, name, monthly_price, annual_price, features, is_active, sort_order) VALUES
  (
    'starter',
    'Starter',
    29.00,
    278.40,
    '["Up to 10 listings","50 lead captures/mo","1 territory","Advanced analytics","Priority email support"]',
    true,
    1
  ),
  (
    'pro',
    'Pro Agent',
    79.00,
    758.40,
    '["Up to 25 listings","200 lead captures/mo","3 territories","2 featured spots","Phone + email support","Commission tracking","CRM integration"]',
    true,
    2
  ),
  (
    'dominator',
    'Dominator',
    199.00,
    1910.40,
    '["Unlimited listings","Unlimited lead captures","Unlimited territories","Top placement spots","Dedicated account manager","Full CRM suite","Custom reporting","White-glove onboarding"]',
    true,
    3
  ),
  (
    'sponsor',
    'Territory Sponsor',
    0.00,
    0.00,
    '["Exclusive territory lock","First-priority lead routing","Featured in territory directory","Co-branded marketing materials","Quarterly strategy calls","Custom commission splits","Custom pricing — contact sales"]',
    true,
    4
  )
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- SEED DATA: Listing Prices
-- =============================================================================

INSERT INTO listing_prices (type, label, price, billing_cycle, description, is_active) VALUES
  (
    'standard',
    'Standard Listing',
    9.00,
    'monthly',
    'Basic listing placement in territory directory.',
    true
  ),
  (
    'featured',
    'Featured Listing',
    29.00,
    'monthly',
    'Highlighted placement with a Featured badge. Appears above standard listings.',
    true
  ),
  (
    'top',
    'Top Placement',
    79.00,
    'monthly',
    'Premium top-of-page placement with spotlight badge. Maximum visibility.',
    true
  )
ON CONFLICT (type) DO NOTHING;
