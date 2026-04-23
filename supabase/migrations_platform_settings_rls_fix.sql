-- =============================================================================
-- FIX: platform_settings RLS — "new row violates row-level security policy"
--
-- Root cause: is_admin() queries the profiles table, which itself has RLS.
-- Without SECURITY DEFINER the function runs as the calling user and gets
-- blocked by profiles RLS before it can confirm the admin role → returns false
-- → INSERT/UPDATE on platform_settings is rejected.
--
-- Fix: rebuild is_admin() and is_director_or_admin() with SECURITY DEFINER
-- so they bypass RLS when reading profiles, then drop + recreate the
-- platform_settings policies to ensure they use the fixed function.
-- =============================================================================

-- 1. Fix is_admin() — add SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Fix is_director_or_admin() — same issue
CREATE OR REPLACE FUNCTION is_director_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'director')
  );
$$;

-- 3. Drop and recreate platform_settings policies to pick up the fixed function
DROP POLICY IF EXISTS "platform_settings_insert_admin" ON platform_settings;
DROP POLICY IF EXISTS "platform_settings_update_admin" ON platform_settings;
DROP POLICY IF EXISTS "platform_settings_delete_admin" ON platform_settings;

CREATE POLICY "platform_settings_insert_admin"
  ON platform_settings FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "platform_settings_update_admin"
  ON platform_settings FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "platform_settings_delete_admin"
  ON platform_settings FOR DELETE
  USING (is_admin());

-- 4. Also fix crm_configs policies (same pattern)
DROP POLICY IF EXISTS "crm_configs_insert_admin" ON crm_configs;
DROP POLICY IF EXISTS "crm_configs_update_admin" ON crm_configs;

CREATE POLICY "crm_configs_insert_admin"
  ON crm_configs FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "crm_configs_update_admin"
  ON crm_configs FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- 5. Verify — should return your admin user's row
-- SELECT id, role FROM profiles WHERE id = auth.uid();

-- 6. Quick smoke-test: this should return TRUE when run as admin
-- SELECT is_admin();
