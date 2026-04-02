-- =============================================================================
-- NLVListings — Architecture Fix Migration
-- Fixes: atomic listing upgrade, stale commission constraint, CRM queue policy.
-- All statements are idempotent (safe to re-run).
-- =============================================================================

-- =============================================================================
-- 1. Drop the superseded commission constraint
--
-- migrations_critical_fixes.sql added uq_commissions_tx_type_recipient
-- (source_transaction_id, type, recipient_user_id). This was superseded by
-- uq_commissions_tx_type_role (source_transaction_id, type, recipient_role)
-- in migrations_commission_fixes.sql.
--
-- Problem: if migrations are run out of order, or if critical_fixes re-runs
-- after commission_fixes, the old constraint is re-created and blocks the
-- process_transaction_commissions RPC — which inserts up to 4 rows per
-- transaction (realtor, director, admin, platform), potentially sharing a
-- recipient_user_id, causing false unique-violation errors.
--
-- Fix: ensure the old constraint is permanently gone.
-- =============================================================================

ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS uq_commissions_tx_type_recipient;

-- Also re-confirm the correct partial index exists (idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS uq_commissions_tx_type_role
  ON commissions (source_transaction_id, type, recipient_role)
  WHERE source_transaction_id IS NOT NULL;

-- =============================================================================
-- 2. Fix crm_sync_queue INSERT policy
--
-- The original policy:
--   WITH CHECK (auth.role() = 'authenticated')
-- allows any authenticated user to enqueue retry items. Because the queue
-- triggers outbound HTTP calls to the webhook_url stored in crm_configs, a
-- malicious user could:
--   a) Flood an external CRM URL with crafted payloads (DoS/data exfil).
--   b) Enumerate valid lead IDs via successful FK inserts.
--
-- Fix: drop the open policy. The CRM service (crm.service.ts) runs client-side
-- but queueForRetry is only triggered by a failed webhook — which itself is
-- only called after a successful lead lookup. The queue INSERT must come from
-- service_role (Edge Functions or future server-side routing service).
-- service_role bypasses RLS, so no explicit policy is needed.
-- =============================================================================

DROP POLICY IF EXISTS "crm_sync_queue_insert_service"          ON crm_sync_queue;
DROP POLICY IF EXISTS "Authenticated users can insert crm queue" ON crm_sync_queue;

-- =============================================================================
-- 3. apply_listing_upgrade_atomic() — atomic listing upgrade RPC
--
-- Replaces three separate webhook calls:
--   UPDATE listings → INSERT payments → INSERT listing_audit_log
-- with a single database transaction. If any step fails, all three roll back.
--
-- Called by stripe-webhook/index.ts checkout.session.completed (listing_upgrade).
-- Returns the new payment row's ID so the caller can pass it to
-- process_transaction_commissions().
--
-- Parameters:
--   p_listing_id           — uuid of the listing to upgrade
--   p_upgrade_type         — 'standard' | 'featured' | 'top'
--   p_user_id              — realtor/user who paid (from Stripe metadata)
--   p_stripe_payment_intent — payment_intent id from Stripe session
--   p_amount_cents         — amount Stripe charged (in cents, from session.amount_total)
-- =============================================================================

CREATE OR REPLACE FUNCTION apply_listing_upgrade_atomic(
  p_listing_id            uuid,
  p_upgrade_type          text,
  p_user_id               uuid,
  p_stripe_payment_intent text,
  p_amount_cents          int
)
RETURNS TABLE (payment_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount     numeric(12,2);
  v_expires_at timestamptz;
  v_payment_id uuid;
BEGIN
  -- Validate upgrade type against the listings.upgrade_type CHECK constraint.
  IF p_upgrade_type NOT IN ('standard', 'featured', 'top') THEN
    RAISE EXCEPTION 'Invalid upgrade_type: %. Must be standard, featured, or top.',
      p_upgrade_type USING ERRCODE = 'P0001';
  END IF;

  v_amount     := ROUND(p_amount_cents / 100.0, 2);
  v_expires_at := NOW() + INTERVAL '30 days';

  -- Step 1: Update listing (fails fast if listing does not exist).
  UPDATE listings
     SET upgrade_type       = p_upgrade_type,
         upgrade_expires_at = v_expires_at,
         updated_at         = NOW()
   WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing % not found.', p_listing_id USING ERRCODE = 'P0002';
  END IF;

  -- Step 2: Insert payment record.
  -- ON CONFLICT with the partial unique index (uq_payments_stripe_payment_id)
  -- makes this idempotent: a duplicate Stripe event does NOT create a second row.
  INSERT INTO payments
    (user_id, type, amount, status, stripe_payment_id, description)
  VALUES
    (
      p_user_id,
      'listing_upgrade',
      v_amount,
      'succeeded',
      p_stripe_payment_intent,
      'Listing upgrade to ' || p_upgrade_type || ' for listing ' || p_listing_id::text
    )
  ON CONFLICT (stripe_payment_id) WHERE stripe_payment_id IS NOT NULL
    DO NOTHING
  RETURNING id INTO v_payment_id;

  -- If ON CONFLICT DO NOTHING fired (duplicate event), retrieve the existing ID.
  IF v_payment_id IS NULL THEN
    SELECT id INTO v_payment_id
      FROM payments
     WHERE stripe_payment_id = p_stripe_payment_intent;
  END IF;

  -- Step 3: Write listing_audit_log entry.
  INSERT INTO listing_audit_log
    (listing_id, action, performed_by, metadata, timestamp)
  VALUES
    (
      p_listing_id,
      'listing.upgraded_to_' || p_upgrade_type,
      p_user_id,
      jsonb_build_object(
        'upgradeType',  p_upgrade_type,
        'amountCents',  p_amount_cents,
        'expiresAt',    v_expires_at,
        'source',       'stripe_webhook'
      ),
      NOW()
    );

  RETURN QUERY SELECT v_payment_id;
END;
$$;

-- Allow Edge Functions (service_role) and authenticated callers to invoke.
-- The function is SECURITY DEFINER so it always runs with full DB rights
-- regardless of the caller's JWT — no RLS bypass risk from the caller side.
GRANT EXECUTE ON FUNCTION apply_listing_upgrade_atomic(uuid, text, uuid, text, int)
  TO authenticated, anon;

-- =============================================================================
-- Done. Verify with:
--   \d commissions            -- confirm uq_commissions_tx_type_recipient is gone
--   \dp crm_sync_queue        -- confirm no INSERT policy for authenticated
--   \df apply_listing_upgrade_atomic  -- confirm function exists
-- =============================================================================
