-- v2 fix: Remove references to disputes columns that don't exist (approved_by, processed_by).
-- Drop old function first (return type changed boolean→jsonb).
-- Run this in Supabase SQL Editor.
-- =============================================================================

DROP FUNCTION IF EXISTS public.admin_pre_delete_cleanup(UUID);

CREATE OR REPLACE FUNCTION public.admin_pre_delete_cleanup(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step text := 'start';
BEGIN
  v_step := 'null_subscription_id';
  UPDATE profiles SET subscription_id = NULL WHERE id = p_user_id;

  v_step := 'delete_subscriptions';
  DELETE FROM subscriptions WHERE user_id = p_user_id;

  v_step := 'delete_payments';
  DELETE FROM payments WHERE user_id = p_user_id;

  v_step := 'delete_messages_sender';
  DELETE FROM messages WHERE sender_id = p_user_id;

  v_step := 'delete_messages_recipient';
  DELETE FROM messages WHERE recipient_id = p_user_id;

  v_step := 'delete_commissions';
  DELETE FROM commissions WHERE recipient_user_id = p_user_id;

  v_step := 'delete_notifications';
  DELETE FROM notifications WHERE user_id = p_user_id;

  v_step := 'delete_territory_realtors';
  DELETE FROM territory_realtors WHERE user_id = p_user_id;

  v_step := 'delete_territory_sponsors';
  DELETE FROM territory_sponsors WHERE user_id = p_user_id;

  v_step := 'delete_disputes_raised';
  DELETE FROM disputes WHERE raised_by = p_user_id;

  v_step := 'null_invitations_invited_by';
  UPDATE user_invitations SET invited_by = NULL WHERE invited_by = p_user_id;

  v_step := 'null_invitations_accepted_by';
  UPDATE user_invitations SET accepted_by = NULL WHERE accepted_by = p_user_id;

  v_step := 'null_disputes_resolved_by';
  -- Only nullify resolved_by if the column exists in your disputes table.
  -- Wrapped in a nested block so a missing-column error doesn't abort the whole function.
  BEGIN
    UPDATE disputes SET resolved_by = NULL WHERE resolved_by = p_user_id;
  EXCEPTION WHEN undefined_column THEN
    NULL; -- column doesn't exist, skip
  END;

  v_step := 'delete_profile';
  DELETE FROM profiles WHERE id = p_user_id;

  v_step := 'delete_auth_users';
  BEGIN
    DELETE FROM auth.users WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true, 'auth_deleted', true, 'step', 'complete');
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', true,
      'auth_deleted', false,
      'step', 'delete_auth_users',
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
  END;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'auth_deleted', false,
    'failed_step', v_step,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_pre_delete_cleanup(UUID) TO service_role;
