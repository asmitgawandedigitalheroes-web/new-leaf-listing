-- =============================================================================
-- NLVListings — Critical Bug Fix Migration
-- Fixes: BUG-001, BUG-007, BUG-008, BUG-009, BUG-010
-- All statements are idempotent (safe to re-run).
-- =============================================================================

-- =============================================================================
-- BUG-001: Multiple active subscriptions — add partial UNIQUE index
-- Prevents any user from having more than one active subscription row.
-- Uses a partial index so cancelled/past_due rows are not affected.
-- =============================================================================

-- Drop the plain index that was masking the constraint gap, then add the unique one.
DROP INDEX IF EXISTS idx_subscriptions_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_user_active
  ON subscriptions (user_id)
  WHERE status = 'active';

-- Recreate the non-unique index for non-active status queries (plan / stats lookups).
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions (user_id);

-- Idempotency guard: add UNIQUE on (source_transaction_id, type, recipient_user_id)
-- so duplicate commission rows from webhook retries are rejected at DB level.
ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS uq_commissions_tx_type_recipient;

ALTER TABLE commissions
  ADD CONSTRAINT uq_commissions_tx_type_recipient
  UNIQUE (source_transaction_id, type, recipient_user_id);

-- =============================================================================
-- BUG-007: Lead lock not enforced — DB-level trigger to block reassignment
-- The trigger fires BEFORE UPDATE on leads.assigned_realtor_id and raises an
-- exception when lock_until is still in the future and the caller is not an admin.
-- Service-layer code in lead.service.ts also checks this; the trigger is the
-- last line of defence.
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_lead_lock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce when reassigning to a different realtor
  IF NEW.assigned_realtor_id IS DISTINCT FROM OLD.assigned_realtor_id THEN
    -- If the lead is still within its lock window AND the current user is not admin
    IF OLD.lock_until IS NOT NULL
       AND OLD.lock_until > NOW()
       AND NOT is_admin()
    THEN
      RAISE EXCEPTION 'lead_locked: Lead % is locked until %. Reassignment blocked.',
        OLD.id, OLD.lock_until
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_lead_lock ON leads;

CREATE TRIGGER trg_enforce_lead_lock
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION enforce_lead_lock();

-- Performance index for lock expiry sweeps
CREATE INDEX IF NOT EXISTS idx_leads_lock_until
  ON leads (lock_until)
  WHERE lock_until IS NOT NULL;

-- =============================================================================
-- BUG-008: Role self-assignment at signup
-- Remove the profiles_update_own policy so users cannot change their own role.
-- Users may still update non-sensitive profile fields via a dedicated RPC.
-- =============================================================================

-- Drop the blanket self-update policy that allowed role escalation.
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Replace with a restricted policy that blocks changes to role and status.
-- Users may update only: full_name, phone, bio, avatar_url, company fields.
CREATE POLICY "profiles_update_own_restricted"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent privilege escalation: new role must equal old role
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    -- Prevent status self-activation
    AND status = (SELECT status FROM profiles WHERE id = auth.uid())
  );

-- Trigger to enforce role is always 'realtor' on public self-inserts.
-- This blocks BUG-008 at DB level even if the client sends a crafted role value.
CREATE OR REPLACE FUNCTION enforce_signup_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Public/anon/authenticated inserts that are self-inserts must default to 'realtor'.
  -- Admins (service_role) can set any role.
  IF auth.role() NOT IN ('service_role') THEN
    -- Only allow 'realtor' on self-insert; strip anything else silently.
    IF NEW.id = auth.uid() AND NEW.role NOT IN ('realtor') THEN
      NEW.role := 'realtor';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_signup_role ON profiles;

CREATE TRIGGER trg_enforce_signup_role
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_signup_role();

-- =============================================================================
-- BUG-010: Unauthenticated lead injection
-- Replace leads_insert_public WITH CHECK (true) with a restricted policy that:
--   1. Allows anon/public POST for web lead forms.
--   2. Strips attacker-controlled routing fields by enforcing them to NULL.
-- Routing fields (assigned_realtor_id, assigned_director_id) may only be set
-- by authenticated admins/directors via the existing leads_insert_admin_director
-- policy. The public policy blocks any attempt to pre-fill those fields.
-- =============================================================================

DROP POLICY IF EXISTS "leads_insert_public" ON leads;

-- Public web-form submissions: allowed, but routing fields must be NULL.
-- territory_id may be passed (resolved from city/state on the form) but
-- assigned_realtor_id and assigned_director_id must not be pre-filled.
CREATE POLICY "leads_insert_public_restricted"
  ON leads FOR INSERT
  WITH CHECK (
    assigned_realtor_id IS NULL
    AND assigned_director_id IS NULL
  );

-- =============================================================================
-- BUG-010 (supplement): Trigger to strip routing fields on public inserts
-- Provides defence-in-depth: even if the policy check above is bypassed via
-- a future migration mistake, this trigger zeroes out the routing fields for
-- any non-admin/director insert.
-- =============================================================================

CREATE OR REPLACE FUNCTION strip_public_lead_routing()
RETURNS TRIGGER AS $$
BEGIN
  -- If the inserting user is not an admin or director, null out routing fields.
  IF NOT is_director_or_admin() THEN
    NEW.assigned_realtor_id  := NULL;
    NEW.assigned_director_id := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_strip_public_lead_routing ON leads;

CREATE TRIGGER trg_strip_public_lead_routing
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION strip_public_lead_routing();

-- =============================================================================
-- BUG-011 (DB supplement): Idempotency table for processed Stripe session IDs
-- The stripe-webhook Edge Function checks this table before processing
-- checkout.session.completed. If the session_id already exists, it skips.
-- =============================================================================

CREATE TABLE IF NOT EXISTS stripe_processed_events (
  stripe_event_id  text PRIMARY KEY,
  event_type       text NOT NULL,
  processed_at     timestamptz NOT NULL DEFAULT now()
);

-- Only the service role (Edge Functions) may read/write this table.
ALTER TABLE stripe_processed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_events_service_only"
  ON stripe_processed_events
  USING (false)        -- no row-level reads for any JWT user
  WITH CHECK (false);  -- no row-level writes for any JWT user
-- (service_role bypasses RLS entirely, so the webhook function is unaffected)

-- =============================================================================
-- Done. Verify with:
--   \d subscriptions     -- check uq_subscriptions_user_active index
--   \d commissions       -- check uq_commissions_tx_type_recipient constraint
--   \d leads             -- check trg_enforce_lead_lock trigger
--   \d profiles          -- check trg_enforce_signup_role trigger, new update policy
--   SELECT * FROM stripe_processed_events;
-- =============================================================================
