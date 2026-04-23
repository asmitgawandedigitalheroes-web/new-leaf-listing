-- Atomic user deletion cleanup function.
-- Runs everything in ONE transaction so there is no window where GoTrue sees
-- a partially-cleaned profile and hits a FK conflict.
--
-- Returns TRUE  if auth.users was also deleted here (full delete done).
-- Returns FALSE if auth.users could not be reached (caller must call GoTrue API).
--
-- Run this ONCE in the Supabase SQL Editor, then redeploy admin-delete-user function.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_pre_delete_cleanup(p_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Break the circular FK: profiles.subscription_id → subscriptions(id)
  --    Must be first or the subscriptions DELETE below triggers SET NULL back
  --    onto the profile while it's still live.
  UPDATE profiles SET subscription_id = NULL WHERE id = p_user_id;

  -- 2. Delete rows owned by this user that have NOT NULL FKs (can't SET NULL).
  DELETE FROM subscriptions       WHERE user_id           = p_user_id;
  DELETE FROM payments            WHERE user_id           = p_user_id;
  DELETE FROM messages            WHERE sender_id         = p_user_id;
  DELETE FROM messages            WHERE recipient_id      = p_user_id;
  DELETE FROM commissions         WHERE recipient_user_id = p_user_id;
  DELETE FROM notifications       WHERE user_id           = p_user_id;

  -- 3. Delete rows that CASCADE from profiles but that we want gone explicitly
  --    (territory_realtors, territory_sponsors, disputes raised by this user).
  DELETE FROM territory_realtors  WHERE user_id    = p_user_id;
  DELETE FROM territory_sponsors  WHERE user_id    = p_user_id;
  DELETE FROM disputes            WHERE raised_by  = p_user_id;

  -- 4. Nullify SET NULL references that PostgreSQL would normally handle,
  --    but we do it here to be sure before the profile row is deleted.
  UPDATE user_invitations SET invited_by   = NULL WHERE invited_by   = p_user_id;
  UPDATE user_invitations SET accepted_by  = NULL WHERE accepted_by  = p_user_id;
  UPDATE disputes         SET resolved_by  = NULL WHERE resolved_by  = p_user_id;
  UPDATE disputes         SET approved_by  = NULL WHERE approved_by  = p_user_id;
  UPDATE disputes         SET processed_by = NULL WHERE processed_by = p_user_id;

  -- 5. Delete the profile row itself BEFORE touching auth.users.
  --    This controls cascade order: all remaining ON DELETE CASCADE / SET NULL
  --    constraints from profiles fire now, on our terms, with nothing left to hit.
  DELETE FROM profiles WHERE id = p_user_id;

  -- 6. Try to delete from auth.users directly (bypasses GoTrue).
  --    If this succeeds the caller does NOT need to call auth.admin.deleteUser.
  --    If it fails (permission denied, FK, etc.) we return false and the caller
  --    falls back to the GoTrue API — which will now succeed because everything
  --    has already been cleaned up above.
  BEGIN
    DELETE FROM auth.users WHERE id = p_user_id;
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
END;
$$;

-- Grant execute to service_role so the edge function can call it.
GRANT EXECUTE ON FUNCTION public.admin_pre_delete_cleanup(UUID) TO service_role;
