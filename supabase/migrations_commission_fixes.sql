-- =============================================================================
-- NLVListings — Commission Bug Fix Migration
-- Fixes: BUG-002 (platform revenue), BUG-003 (deterministic admin),
--        BUG-026 (floating-point money math)
-- All statements are idempotent (safe to re-run).
-- =============================================================================

-- =============================================================================
-- 1. BUG-002 / BUG-003: Add recipient_role column to commissions
--
-- Differentiates the four recipient types per transaction so we can:
--   a) Record the platform share as a distinct row (BUG-002)
--   b) Use a constraint keyed on (tx_id, type, recipient_role) rather than
--      (tx_id, type, recipient_user_id) — which would collide when the platform
--      admin and the admin-override recipient share the same user_id (BUG-003)
-- =============================================================================

ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS recipient_role text NOT NULL DEFAULT 'realtor'
  CHECK (recipient_role IN ('realtor', 'director', 'admin', 'platform'));

-- Drop the previous broad unique constraint added in migrations_critical_fixes.sql
-- (keyed on recipient_user_id — too narrow; allows duplicate platform records).
ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS uq_commissions_tx_type_recipient;

-- New constraint: exactly one row per (transaction, commission_type, recipient_role).
-- Partial index (WHERE source_transaction_id IS NOT NULL) keeps manual deal-type
-- commissions (no payment linkage) free from this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS uq_commissions_tx_type_role
  ON commissions (source_transaction_id, type, recipient_role)
  WHERE source_transaction_id IS NOT NULL;

-- =============================================================================
-- 2. BUG-003: Store designated platform admin in platform_settings
--
-- Admin who receives the admin-override (15%) share.
-- NULL = fall back to oldest admin (created_at ASC) for determinism.
-- Set this key via the admin UI once the first admin account is created.
-- =============================================================================

INSERT INTO platform_settings (key, value, description)
VALUES
  (
    'platform_admin_user_id',
    'null',
    'UUID (JSON string) of the admin who receives the 15% admin-override commission split. Falls back to the oldest admin account if null.'
  ),
  (
    'platform_account_id',
    'null',
    'UUID (JSON string) of the account that receives the 15% platform fee commission record. Falls back to platform_admin_user_id if null.'
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 3. BUG-002 + BUG-003 + BUG-026: process_transaction_commissions() RPC
--
-- Centralised commission engine called by BOTH commission.service.ts and
-- stripe-webhook/index.ts. This eliminates the dual-path problem.
--
-- Key properties:
--   • All arithmetic uses PostgreSQL NUMERIC — no IEEE 754 drift (BUG-026).
--   • Realtor receives the EXACT remainder to prevent penny accumulation errors.
--   • Platform share is inserted as a distinct commission record (BUG-002).
--   • Admin is resolved deterministically via platform_settings or oldest-admin
--     fallback (BUG-003).
--   • ON CONFLICT DO NOTHING on the unique index makes every call idempotent
--     — webhook retries cannot create duplicate rows (BUG-011 supplement).
--   • SECURITY DEFINER runs as the function owner (service role), so the
--     webhook Edge Function (anon JWT) can call it safely.
-- =============================================================================

CREATE OR REPLACE FUNCTION process_transaction_commissions(
  p_transaction_id  uuid,
  p_amount          numeric,
  p_type            text,
  p_realtor_id      uuid,
  p_listing_id      uuid  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Rate variables (stored as 0–1 fractions after dividing stored % by 100)
  v_director_rate   numeric;
  v_admin_rate      numeric;
  v_platform_rate   numeric;

  -- Money variables — all NUMERIC, no float (BUG-026)
  v_total           numeric(12,2);
  v_platform_share  numeric(12,2);
  v_after_platform  numeric(12,2);
  v_director_share  numeric(12,2);
  v_admin_share     numeric(12,2);
  v_realtor_share   numeric(12,2);

  -- Recipient IDs
  v_director_id         uuid;
  v_admin_id            uuid;
  v_platform_account_id uuid;

  v_rows_inserted int := 0;
BEGIN
  -- Validate commission type
  IF p_type NOT IN ('subscription', 'listing', 'deal', 'referral') THEN
    RAISE EXCEPTION 'Invalid commission type: %', p_type USING ERRCODE = 'P0001';
  END IF;

  v_total := ROUND(p_amount::numeric, 2);
  IF v_total <= 0 THEN
    RETURN jsonb_build_object('inserted', 0, 'reason', 'zero_amount');
  END IF;

  -- ── Load rates from platform_settings ──────────────────────────────────────
  -- Values are stored as plain JSON numbers representing percentages (e.g. 25).
  SELECT COALESCE((value #>> '{}')::numeric, 25) / 100
    INTO v_director_rate
    FROM platform_settings WHERE key = 'director_commission_rate';
  v_director_rate := COALESCE(v_director_rate, 0.25);

  SELECT COALESCE((value #>> '{}')::numeric, 15) / 100
    INTO v_admin_rate
    FROM platform_settings WHERE key = 'admin_override_rate';
  v_admin_rate := COALESCE(v_admin_rate, 0.15);

  SELECT COALESCE((value #>> '{}')::numeric, 15) / 100
    INTO v_platform_rate
    FROM platform_settings WHERE key = 'platform_fee_rate';
  v_platform_rate := COALESCE(v_platform_rate, 0.15);

  -- ── NUMERIC arithmetic — no floating point (BUG-026) ──────────────────────
  -- Each share is independently rounded; realtor gets the exact remainder so
  -- that all four shares sum to exactly p_amount with no penny drift.
  v_platform_share  := ROUND(v_total * v_platform_rate,   2);
  v_after_platform  := v_total - v_platform_share;        -- exact subtraction

  -- ── Director lookup ────────────────────────────────────────────────────────
  SELECT assigned_director_id
    INTO v_director_id
    FROM profiles
   WHERE id = p_realtor_id;

  v_director_share := CASE
    WHEN v_director_id IS NOT NULL THEN ROUND(v_after_platform * v_director_rate, 2)
    ELSE 0
  END;

  -- ── Admin lookup — deterministic (BUG-003) ─────────────────────────────────
  -- 1st: check platform_settings for a designated admin UUID.
  -- 2nd: fall back to oldest active admin (created_at ASC = founding account).
  SELECT (value #>> '{}')::uuid
    INTO v_admin_id
    FROM platform_settings
   WHERE key = 'platform_admin_user_id'
     AND value #>> '{}' <> 'null';

  IF v_admin_id IS NULL THEN
    SELECT id
      INTO v_admin_id
      FROM profiles
     WHERE role = 'admin'
       AND status = 'active'
     ORDER BY created_at ASC
     LIMIT 1;
  END IF;

  v_admin_share := CASE
    WHEN v_admin_id IS NOT NULL THEN ROUND(v_after_platform * v_admin_rate, 2)
    ELSE 0
  END;

  -- ── Realtor gets exact remainder (BUG-026) ─────────────────────────────────
  -- Subtracting integer-rounded values from after_platform guarantees the four
  -- shares sum to p_amount with zero drift.
  v_realtor_share := v_after_platform - v_director_share - v_admin_share;

  -- ── Platform account lookup (BUG-002) ──────────────────────────────────────
  SELECT (value #>> '{}')::uuid
    INTO v_platform_account_id
    FROM platform_settings
   WHERE key = 'platform_account_id'
     AND value #>> '{}' <> 'null';

  -- Fall back to admin account for the platform fee record
  v_platform_account_id := COALESCE(v_platform_account_id, v_admin_id);

  -- ── Insert commission records (BUG-002: platform record included) ───────────
  -- ON CONFLICT DO NOTHING makes this idempotent on webhook retries (BUG-011).

  -- Realtor share
  INSERT INTO commissions
    (type, amount, source_transaction_id, recipient_user_id, recipient_role, status, listing_id, notes)
  VALUES
    (p_type, v_realtor_share, p_transaction_id, p_realtor_id, 'realtor', 'pending', p_listing_id,
     'Realtor share for ' || p_type || ' transaction')
  ON CONFLICT ON CONSTRAINT uq_commissions_tx_type_role DO NOTHING;
  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  -- Platform fee record (BUG-002: was missing)
  IF v_platform_account_id IS NOT NULL AND v_platform_share > 0 THEN
    INSERT INTO commissions
      (type, amount, source_transaction_id, recipient_user_id, recipient_role, status, listing_id, notes)
    VALUES
      (p_type, v_platform_share, p_transaction_id, v_platform_account_id, 'platform', 'pending', p_listing_id,
       'Platform fee (15%) for ' || p_type || ' transaction')
    ON CONFLICT ON CONSTRAINT uq_commissions_tx_type_role DO NOTHING;
  END IF;

  -- Director override
  IF v_director_id IS NOT NULL AND v_director_share > 0 THEN
    INSERT INTO commissions
      (type, amount, source_transaction_id, recipient_user_id, recipient_role, status, listing_id, notes)
    VALUES
      (p_type, v_director_share, p_transaction_id, v_director_id, 'director', 'pending', p_listing_id,
       'Director override (25%) for realtor ' || p_realtor_id::text)
    ON CONFLICT ON CONSTRAINT uq_commissions_tx_type_role DO NOTHING;
  END IF;

  -- Admin override (BUG-003: deterministic recipient, always the same designated admin)
  IF v_admin_id IS NOT NULL AND v_admin_share > 0 THEN
    INSERT INTO commissions
      (type, amount, source_transaction_id, recipient_user_id, recipient_role, status, listing_id, notes)
    VALUES
      (p_type, v_admin_share, p_transaction_id, v_admin_id, 'admin', 'pending', p_listing_id,
       'Admin override (15%) for platform transaction')
    ON CONFLICT ON CONSTRAINT uq_commissions_tx_type_role DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'inserted',        v_rows_inserted,
    'realtor_share',   v_realtor_share,
    'director_share',  v_director_share,
    'admin_share',     v_admin_share,
    'platform_share',  v_platform_share,
    'total',           v_total,
    'director_id',     v_director_id,
    'admin_id',        v_admin_id
  );
END;
$$;

-- Grant EXECUTE to authenticated and anon roles so Edge Functions can call it.
GRANT EXECUTE ON FUNCTION process_transaction_commissions(uuid, numeric, text, uuid, uuid)
  TO authenticated, anon;

-- =============================================================================
-- 4. Backfill existing commission records: set recipient_role from context
--
-- Best-effort: uses the recipient's DB role to determine the recipient_role.
-- Records for the platform cannot be auto-detected (there were none — BUG-002
-- means platform records simply didn't exist). Those remain as 'realtor'
-- unless manually corrected.
-- =============================================================================

UPDATE commissions c
   SET recipient_role = CASE p.role
                          WHEN 'director' THEN 'director'
                          WHEN 'admin'    THEN 'admin'
                          ELSE                 'realtor'
                        END
  FROM profiles p
 WHERE p.id = c.recipient_user_id
   AND c.recipient_role = 'realtor';   -- only touch default-value rows

-- =============================================================================
-- Done. Verify with:
--   \d commissions        -- check recipient_role column and uq index
--   SELECT proname, prosrc FROM pg_proc WHERE proname = 'process_transaction_commissions';
--   SELECT * FROM platform_settings WHERE key IN ('platform_admin_user_id','platform_account_id');
-- =============================================================================
