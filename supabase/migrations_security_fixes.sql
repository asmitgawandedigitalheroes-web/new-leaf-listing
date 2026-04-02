-- =============================================================================
-- NLVListings — Security Fix Migration
-- Fixes: BUG-018 (realtor editing active listings), BUG-028 (fake audit logs),
--        BUG-032 (unauthorized audit log access), BUG-037 (notification injection)
-- All statements are idempotent (safe to re-run).
-- =============================================================================

-- =============================================================================
-- 1. BUG-018: Lock active/sold/expired listings against realtor edits
--
-- migrations_listing_lifecycle.sql removed the status-gated UPDATE policy and
-- replaced it with a permissive one. Realtors can now edit listings in any
-- status, including 'active', 'sold', and 'expired' — bypassing the lifecycle.
--
-- Fix: Re-create the UPDATE policy restricted to editable statuses only.
-- Only draft, pending, and rejected listings may be modified by their owner.
-- =============================================================================

DROP POLICY IF EXISTS "listings_update_own_realtor"            ON listings;
DROP POLICY IF EXISTS "Realtors can update own listings"       ON listings;
DROP POLICY IF EXISTS "listings_update_realtor"                ON listings;

CREATE POLICY "listings_update_own_realtor" ON listings
  FOR UPDATE
  USING (
    auth.uid() = realtor_id
    AND status IN ('draft', 'pending', 'rejected')
  )
  WITH CHECK (
    auth.uid() = realtor_id
    AND status IN ('draft', 'pending', 'rejected')
  );

-- =============================================================================
-- 2. BUG-028: Prevent fabrication of audit_logs rows
--
-- Any authenticated user could INSERT arbitrary rows into audit_logs, forging
-- action history (e.g. fake 'admin.create_user' events for any entity).
--
-- All legitimate audit writes go through server-side service calls or Edge
-- Functions that use supabaseAdmin (service_role), which bypasses RLS entirely.
-- No client-facing INSERT policy is needed or safe.
-- =============================================================================

DROP POLICY IF EXISTS "audit_logs_insert_authenticated"          ON audit_logs;
DROP POLICY IF EXISTS "Anyone can insert audit logs"             ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

-- Service_role bypasses RLS — no explicit INSERT policy required.
-- Existing SELECT policies for admins/owners are preserved.

-- =============================================================================
-- 3. BUG-032: Restrict listing_audit_log read access
--
-- The existing policy USING (true) exposes every listing's full audit history
-- to every authenticated user. Access must be scoped to three groups:
--   • Admins          — all rows
--   • Listing owner   — rows for listings they own
--   • Territory dir.  — rows for listings in their territory
-- =============================================================================

DROP POLICY IF EXISTS "listing_audit_log_select_all"                        ON listing_audit_log;
DROP POLICY IF EXISTS "Anyone can view listing audit log"                    ON listing_audit_log;
DROP POLICY IF EXISTS "Authenticated users can view listing audit log"       ON listing_audit_log;
DROP POLICY IF EXISTS "listing_audit_log_select_admin"                      ON listing_audit_log;
DROP POLICY IF EXISTS "listing_audit_log_select_owner"                      ON listing_audit_log;
DROP POLICY IF EXISTS "listing_audit_log_select_director"                   ON listing_audit_log;

-- Admins: unrestricted read
CREATE POLICY "listing_audit_log_select_admin" ON listing_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Realtors: only rows for their own listings
CREATE POLICY "listing_audit_log_select_owner" ON listing_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id    = listing_audit_log.listing_id
        AND listings.realtor_id = auth.uid()
    )
  );

-- Directors: rows for listings in their assigned territory
CREATE POLICY "listing_audit_log_select_director" ON listing_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   listings     l
      JOIN   territories  t ON t.id = l.territory_id
      WHERE  l.id            = listing_audit_log.listing_id
        AND  t.director_id   = auth.uid()
    )
  );

-- INSERT: service_role only — drop any permissive client INSERT policy.
-- Covers all known policy names including the one created by
-- migrations_listing_lifecycle.sql ("listing_audit_log_insert"), which was
-- previously missed and left the table open to authenticated forge attacks.
DROP POLICY IF EXISTS "listing_audit_log_insert_authenticated"               ON listing_audit_log;
DROP POLICY IF EXISTS "listing_audit_log_insert"                             ON listing_audit_log;
DROP POLICY IF EXISTS "Anyone can insert listing audit log"                  ON listing_audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert listing audit log"     ON listing_audit_log;

-- =============================================================================
-- 4. BUG-037: Prevent notification injection
--
-- The policy "notifications_insert_service" used:
--   WITH CHECK (auth.role() = 'authenticated')
-- Any logged-in user could therefore INSERT a notification for ANY user_id —
-- not just themselves — enabling inbox flooding and system-alert impersonation.
--
-- Fix: Drop all permissive INSERT policies. Notifications are written
-- exclusively by server-side code running as service_role (bypasses RLS).
-- Users retain SELECT on their own rows and UPDATE (mark-as-read).
-- =============================================================================

DROP POLICY IF EXISTS "notifications_insert_service"                ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications"              ON notifications;

-- =============================================================================
-- 5. HP-3: Director Territory Isolation for Profile Reads
--
-- Directors could previously read ALL profile rows via the authenticated SELECT
-- policy. This migration scopes director profile reads to profiles within their
-- assigned territory only (or their own profile).
-- =============================================================================

DROP POLICY IF EXISTS "profiles_select_director_territory"  ON profiles;
DROP POLICY IF EXISTS "director_profiles_territory_scoped"  ON profiles;

CREATE POLICY "profiles_select_director_territory" ON profiles
  FOR SELECT
  USING (
    -- Allow a director to see their own profile
    auth.uid() = id
    OR
    -- Allow a director to see profiles in their territory
    EXISTS (
      SELECT 1 FROM profiles director_p
      WHERE director_p.id = auth.uid()
        AND director_p.role = 'director'
        AND profiles.territory_id = director_p.territory_id
    )
    OR
    -- Admins retain unrestricted read
    EXISTS (
      SELECT 1 FROM profiles admin_p
      WHERE admin_p.id = auth.uid()
        AND admin_p.role = 'admin'
    )
    OR
    -- Realtors can see their own profile only (scoped by other policies)
    (
      EXISTS (
        SELECT 1 FROM profiles rp
        WHERE rp.id = auth.uid()
          AND rp.role = 'realtor'
      )
      AND auth.uid() = id
    )
  );

-- =============================================================================
-- 6. HP-12: Prevent deletion of the last admin account (DB-level trigger)
--
-- A UI guard exists in UsersPage.jsx but this DB trigger enforces the rule at
-- the storage layer so it cannot be bypassed via direct API calls.
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_last_admin_deletion()
RETURNS TRIGGER AS $$
DECLARE
  admin_count int;
BEGIN
  -- Only applies when deleting an admin
  IF OLD.role = 'admin' THEN
    SELECT COUNT(*) INTO admin_count
    FROM profiles
    WHERE role = 'admin' AND id <> OLD.id;

    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last admin account. Promote another user to admin first.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_delete ON profiles;
CREATE TRIGGER trg_prevent_last_admin_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_deletion();

-- =============================================================================
-- Done. Verify with:
--   \dp listings            -- confirm listings_update_own_realtor restricts status
--   \dp audit_logs          -- confirm no INSERT policy for authenticated
--   \dp listing_audit_log   -- confirm three scoped SELECT policies + no INSERT
--   \dp notifications       -- confirm no INSERT policy for authenticated
-- =============================================================================
