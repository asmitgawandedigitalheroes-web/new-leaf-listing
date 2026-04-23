-- Fix: allow admin_pre_delete_cleanup to bypass the enforce_lead_lock trigger.
--
-- When a profile is deleted, PostgreSQL CASCADE tries to SET NULL on
-- leads.assigned_realtor_id. The enforce_lead_lock trigger fires for that
-- UPDATE and calls is_admin() — which returns false because the RPC runs
-- under service role (auth.uid() IS NULL). This causes the 180-day lock
-- check to raise an exception and roll back the whole delete.
--
-- Solution: the RPC sets a transaction-local config variable before doing
-- any work. The trigger checks that variable and skips the lock check.
--
-- Run this ONCE in the Supabase SQL Editor.
-- =============================================================================

-- 1. Update enforce_lead_lock to skip when running inside an admin delete.
CREATE OR REPLACE FUNCTION enforce_lead_lock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce when reassigning to a different realtor
  IF NEW.assigned_realtor_id IS DISTINCT FROM OLD.assigned_realtor_id THEN
    -- Skip lock check during admin-initiated user deletion
    IF current_setting('app.admin_delete', true) = 'true' THEN
      RETURN NEW;
    END IF;

    IF OLD.lock_until IS NOT NULL
       AND OLD.lock_until > NOW()
       AND NOT is_admin()
       -- Allow directors who manage this lead's territory
       AND NOT EXISTS (
         SELECT 1 FROM public.territories t
         WHERE t.director_id = auth.uid()
           AND t.id = OLD.territory_id
       )
       -- Allow the director directly assigned to this lead
       AND OLD.assigned_director_id IS DISTINCT FROM auth.uid()
    THEN
      RAISE EXCEPTION 'lead_locked: Lead % is locked until %. Reassignment blocked.',
        OLD.id, OLD.lock_until
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Replace admin_pre_delete_cleanup to set the bypass variable before cleanup.
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
  -- Signal to enforce_lead_lock (and any other triggers) that this is an
  -- admin-initiated deletion so lock checks should be skipped.
  PERFORM set_config('app.admin_delete', 'true', true); -- true = local to transaction

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
  BEGIN
    UPDATE disputes SET resolved_by = NULL WHERE resolved_by = p_user_id;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  -- Disable all triggers on leads so no reassignment/lock trigger can block the cleanup.
  -- Re-enabled immediately after, within the same transaction.
  v_step := 'disable_leads_triggers';
  ALTER TABLE leads DISABLE TRIGGER USER;

  v_step := 'unassign_leads_realtor';
  UPDATE leads SET assigned_realtor_id = NULL, lock_until = NULL, attribution_expiry = NULL
    WHERE assigned_realtor_id = p_user_id;

  v_step := 'unassign_leads_director';
  UPDATE leads SET assigned_director_id = NULL
    WHERE assigned_director_id = p_user_id;

  v_step := 'reenable_leads_triggers';
  ALTER TABLE leads ENABLE TRIGGER USER;

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
