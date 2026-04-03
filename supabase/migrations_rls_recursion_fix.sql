-- ============================================================
-- MIGRATION: Fix infinite recursion in profiles RLS policies
-- Root cause: profiles_select_admin_director queries the profiles
-- table from within an RLS policy ON profiles → infinite loop.
-- Fix: SECURITY DEFINER helper function that bypasses RLS when
-- reading the current user's role, breaking the recursion.
-- ============================================================

-- ── Step 1: Create a SECURITY DEFINER helper ─────────────────
-- This function runs with the privileges of its OWNER (postgres),
-- bypassing RLS entirely. Postgres does NOT re-evaluate RLS when
-- a SECURITY DEFINER function reads from a table, so the recursion
-- is broken at this boundary.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── Step 2: Drop the recursive SELECT policy ─────────────────
DROP POLICY IF EXISTS "profiles_select_admin_director" ON profiles;

-- ── Step 3: Recreate it using the safe helper function ───────
CREATE POLICY "profiles_select_admin_director" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'director')
  );

-- ── Step 4: Fix the UPDATE policy (same recursion risk) ──────
-- Admins need to update territory_id, role, status on any profile.
-- Directors need to update status on realtors in their territory.
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin_director" ON profiles;

-- Allow each user to update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to update any profile (territory assignment, role changes)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  TO authenticated
  USING  (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Allow directors to update status on realtors in their territory
CREATE POLICY "profiles_update_director" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'director'
    AND EXISTS (
      SELECT 1 FROM public.profiles director_profile
      WHERE director_profile.id = auth.uid()
        AND director_profile.territory_id = profiles.territory_id
    )
  )
  WITH CHECK (
    public.get_my_role() = 'director'
  );
