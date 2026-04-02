-- =============================================================================
-- NLV Listings — Listing Lifecycle Migration
-- Run in Supabase SQL Editor. All statements are idempotent (safe to re-run).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. listings — add expires_at column for automatic expiry
-- ---------------------------------------------------------------------------
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. listings — add rejection_reason column (set when admin/director rejects)
-- ---------------------------------------------------------------------------
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- ---------------------------------------------------------------------------
-- 2b. listings — add upgrade_expires_at column (set when paid upgrade is applied)
-- ---------------------------------------------------------------------------
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS upgrade_expires_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. listings — add under_contract to status enum
-- ---------------------------------------------------------------------------
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'pending', 'active', 'under_contract', 'sold', 'expired', 'rejected'));

-- ---------------------------------------------------------------------------
-- 4. Create listing_audit_log table for per-listing change history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  action          text NOT NULL,
  previous_status text,
  new_status      text,
  performed_by    uuid REFERENCES profiles (id) ON DELETE SET NULL,
  metadata        jsonb DEFAULT '{}',
  timestamp       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_audit_log_listing_id ON listing_audit_log (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_audit_log_timestamp  ON listing_audit_log (timestamp DESC);

ALTER TABLE listing_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_audit_log_select" ON listing_audit_log;
DROP POLICY IF EXISTS "listing_audit_log_insert" ON listing_audit_log;

-- Anyone authenticated can read audit logs (admin/director/realtor all need this)
CREATE POLICY "listing_audit_log_select" ON listing_audit_log
  FOR SELECT USING (true);

-- Authenticated users can insert (service role bypasses RLS for webhook inserts)
CREATE POLICY "listing_audit_log_insert" ON listing_audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 5. leads — add SELECT policy for admin (fixes "0 total leads" bug)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "leads_select_admin" ON leads;

CREATE POLICY "leads_select_admin" ON leads
  FOR SELECT USING (is_admin());

-- Contact Agent flow: leads_insert_public_restricted (added by migrations_critical_fixes.sql
-- BUG-010) already allows both anon and authenticated users to insert leads provided
-- assigned_realtor_id and assigned_director_id are NULL. Creating a separate
-- leads_insert_authenticated policy with WITH CHECK (auth.uid() IS NOT NULL) would
-- bypass the routing-field restriction (RLS policies use OR logic), allowing
-- authenticated realtors to pre-fill routing fields — routing attribution fraud.
-- Drop it if it was previously created.
DROP POLICY IF EXISTS "leads_insert_authenticated" ON leads;

-- ---------------------------------------------------------------------------
-- 6. listings — realtor UPDATE policy (status-gated to prevent editing active/sold)
--
-- A previous version of this migration created an unrestricted policy:
--   USING (realtor_id = auth.uid())
-- which allowed realtors to edit listings in any status (BUG-018).
-- The policy below matches the corrected version in migrations_security_fixes.sql
-- so that re-running this migration does not re-introduce the vulnerability.
-- Realtors may only edit listings that are still in an editable lifecycle state.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "listings_update_own_realtor"      ON listings;
DROP POLICY IF EXISTS "Realtors can update own listings" ON listings;
DROP POLICY IF EXISTS "listings_update_realtor"          ON listings;

CREATE POLICY "listings_update_own_realtor" ON listings
  FOR UPDATE
  USING  (auth.uid() = realtor_id AND status IN ('draft', 'pending', 'rejected'))
  WITH CHECK (auth.uid() = realtor_id AND status IN ('draft', 'pending', 'rejected'));

-- ---------------------------------------------------------------------------
-- 7. listings — ensure director can approve/reject listings in their territory
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "listings_update_director_territory" ON listings;

CREATE POLICY "listings_update_director_territory" ON listings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN territories t ON t.id = listings.territory_id
      WHERE p.id = auth.uid()
        AND p.role = 'director'
        AND t.director_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN territories t ON t.id = listings.territory_id
      WHERE p.id = auth.uid()
        AND p.role = 'director'
        AND t.director_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Done.
-- Verify with:
--   \d listings                   -- check expires_at, rejection_reason, status constraint
--   SELECT * FROM listing_audit_log LIMIT 1;
--   \d listing_audit_log
-- ---------------------------------------------------------------------------
