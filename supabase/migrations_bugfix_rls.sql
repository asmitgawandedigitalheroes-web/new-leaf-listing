-- ============================================================
-- BUG FIX MIGRATION: RLS Policy Fixes
-- Fixes: C-4 (leads INSERT), C-8 (profiles INSERT/SELECT)
-- ============================================================

-- ── C-8: profiles table RLS ──────────────────────────────────

-- Allow authenticated users to insert their own profile row.
-- This is needed on signup when the auth user exists but the
-- profiles row has not yet been created.
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow each authenticated user to read their own profile.
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow admins and directors to read all profiles.
DROP POLICY IF EXISTS "profiles_select_admin_director" ON profiles;
CREATE POLICY "profiles_select_admin_director" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')
    )
  );


-- ── C-4: leads table RLS ────────────────────────────────────

-- Drop overly restrictive insert policy if it exists.
DROP POLICY IF EXISTS "leads_insert_policy" ON leads;

-- Allow any authenticated user to create a lead (inquiry from
-- a logged-in buyer/visitor via the Contact Agent form).
DROP POLICY IF EXISTS "leads_insert_authenticated" ON leads;
CREATE POLICY "leads_insert_authenticated" ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anonymous visitors to submit inquiries (public contact
-- form on listing detail pages).
DROP POLICY IF EXISTS "leads_insert_anon" ON leads;
CREATE POLICY "leads_insert_anon" ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ── C-NEW: leads UPDATE policy for realtors ──────────────────
-- Realtors can update their own assigned leads (e.g. change status).
-- Without this policy the UPDATE returns 0 rows silently — no error —
-- which caused status changes to appear saved but revert on page reload.
DROP POLICY IF EXISTS "leads_update_assigned_realtor" ON leads;
CREATE POLICY "leads_update_assigned_realtor" ON leads
  FOR UPDATE
  TO authenticated
  USING (assigned_realtor_id = auth.uid())
  WITH CHECK (assigned_realtor_id = auth.uid());

-- Admins and directors can update any lead in their scope.
DROP POLICY IF EXISTS "leads_update_admin_director" ON leads;
CREATE POLICY "leads_update_admin_director" ON leads
  FOR UPDATE
  TO authenticated
  USING (is_director_or_admin())
  WITH CHECK (is_director_or_admin());

-- ── FIX: Director leads SELECT policy ───────────────────────
-- The original "leads_select_director_territory" policy used
-- profiles.territory_id (single value) which is NULL for multi-
-- territory directors like Michael Torres. Replace it with a
-- territories-table lookup so all managed territories are covered.
DROP POLICY IF EXISTS "leads_select_director_territory" ON leads;
CREATE POLICY "leads_select_director_territory" ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM territories t
      WHERE t.director_id = auth.uid()
        AND t.id = leads.territory_id
    )
  );

-- ── FIX: Director listings SELECT policy ────────────────────
-- Same issue: listings_select_director used profiles.territory_id.
-- Replace with territories-table lookup.
DROP POLICY IF EXISTS "listings_select_director_territory" ON listings;
CREATE POLICY "listings_select_director_territory" ON listings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM territories t
      WHERE t.director_id = auth.uid()
        AND t.id = listings.territory_id
    )
  );
