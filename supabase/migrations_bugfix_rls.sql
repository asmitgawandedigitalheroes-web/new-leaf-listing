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
