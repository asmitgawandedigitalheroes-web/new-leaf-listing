-- Fix FK columns that combine ON DELETE SET NULL with NOT NULL — a contradiction.
-- PostgreSQL allows this syntactically, but at runtime it tries to SET the column
-- to NULL on parent delete, which immediately violates the NOT NULL constraint and
-- rolls back the entire delete with "Database error deleting user".
--
-- Also fixes FK columns that have no ON DELETE clause (defaults to NO ACTION /
-- RESTRICT), which block deletion when the column has a non-null reference.
--
-- Run this ONCE in the Supabase SQL Editor before deleting any users.
-- =============================================================================

-- 1. payments.user_id  (ON DELETE SET NULL + NOT NULL = contradiction)
--    Drop NOT NULL so Supabase can null the reference when the user is deleted.
--    Payment records are preserved; user_id becomes NULL for deleted users.
ALTER TABLE payments
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. messages.sender_id  (ON DELETE SET NULL + NOT NULL = contradiction)
ALTER TABLE messages
  ALTER COLUMN sender_id DROP NOT NULL;

-- 3. messages.recipient_id  (ON DELETE SET NULL + NOT NULL = contradiction)
ALTER TABLE messages
  ALTER COLUMN recipient_id DROP NOT NULL;

-- 4. disputes.resolved_by  (no ON DELETE clause → defaults to NO ACTION/RESTRICT)
ALTER TABLE disputes
  DROP CONSTRAINT IF EXISTS disputes_resolved_by_fkey;
ALTER TABLE disputes
  ADD CONSTRAINT disputes_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 5. payout_requests.approved_by  (no ON DELETE clause)
ALTER TABLE payout_requests
  DROP CONSTRAINT IF EXISTS payout_requests_approved_by_fkey;
ALTER TABLE payout_requests
  ADD CONSTRAINT payout_requests_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 6. payout_requests.processed_by  (no ON DELETE clause)
ALTER TABLE payout_requests
  DROP CONSTRAINT IF EXISTS payout_requests_processed_by_fkey;
ALTER TABLE payout_requests
  ADD CONSTRAINT payout_requests_processed_by_fkey
  FOREIGN KEY (processed_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 7. CRITICAL — Break the circular FK between profiles and subscriptions.
--
--    profiles.subscription_id → subscriptions(id)  ON DELETE SET NULL
--    subscriptions.user_id    → profiles(id)        ON DELETE CASCADE
--
--    When auth.admin.deleteUser fires:
--      auth.users → CASCADE → profiles (deleted)
--        → CASCADE → subscriptions deleted (via subscriptions.user_id)
--          → ON DELETE SET NULL fires back → tries to UPDATE profiles.subscription_id = NULL
--             on the profile row that is already mid-delete
--          → PostgreSQL conflict → "Database error deleting user"
--
--    Fix: drop the FK on profiles.subscription_id entirely.
--    The column stays and still works as a soft reference; it is kept in sync
--    by application logic (Stripe webhook, admin plan change), not DB cascades.
--    No functionality is lost — only the circular cascade chain is broken.
--
--    NOTE: PostgreSQL auto-names unnamed FK constraints as <table>_<col>_fkey.
--    We try both the explicit name and the auto-generated name to be safe.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_subscription;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_id_fkey;

-- Belt-and-suspenders: dynamically drop whatever FK on profiles.subscription_id
-- actually exists, regardless of its name.
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_name      = kcu.table_name
  WHERE tc.table_name       = 'profiles'
    AND tc.constraint_type  = 'FOREIGN KEY'
    AND kcu.column_name     = 'subscription_id';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', v_constraint);
    RAISE NOTICE 'Dropped FK constraint: %', v_constraint;
  ELSE
    RAISE NOTICE 'No FK on profiles.subscription_id found — already dropped or never existed.';
  END IF;
END $$;
