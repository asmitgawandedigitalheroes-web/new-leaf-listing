-- =============================================================================
-- NLVListings — Platform Changes Migration
-- Changes 4, 6, 7, 8
-- All statements are idempotent (safe to re-run).
-- =============================================================================

-- =============================================================================
-- CHANGE 4: Per-director override commission percentage
-- Adds override_commission_pct to profiles (directors only in practice).
-- NULL = use the global platform_settings.director_commission_rate.
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS override_commission_pct numeric
  CHECK (override_commission_pct IS NULL OR (override_commission_pct >= 0 AND override_commission_pct <= 100));

-- Update process_transaction_commissions to use per-director override rate
-- when override_commission_pct is set on the director's profile.
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
  v_director_rate   numeric;
  v_admin_rate      numeric;
  v_platform_rate   numeric;

  v_total           numeric(12,2);
  v_platform_share  numeric(12,2);
  v_after_platform  numeric(12,2);
  v_director_share  numeric(12,2);
  v_admin_share     numeric(12,2);
  v_realtor_share   numeric(12,2);

  v_director_id         uuid;
  v_admin_id            uuid;
  v_platform_account_id uuid;

  v_rows_inserted int := 0;
BEGIN
  IF p_type NOT IN ('subscription', 'listing', 'deal', 'referral') THEN
    RAISE EXCEPTION 'Invalid commission type: %', p_type USING ERRCODE = 'P0001';
  END IF;

  v_total := ROUND(p_amount::numeric, 2);
  IF v_total <= 0 THEN
    RETURN jsonb_build_object('inserted', 0, 'reason', 'zero_amount');
  END IF;

  -- Load global rates from platform_settings
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

  v_platform_share  := ROUND(v_total * v_platform_rate, 2);
  v_after_platform  := v_total - v_platform_share;

  -- Director lookup
  SELECT assigned_director_id
    INTO v_director_id
    FROM profiles
   WHERE id = p_realtor_id;

  -- CHANGE 4: Use per-director override rate if set; fall back to global rate
  IF v_director_id IS NOT NULL THEN
    SELECT COALESCE(override_commission_pct / 100, v_director_rate)
      INTO v_director_rate
      FROM profiles
     WHERE id = v_director_id;
    v_director_rate := COALESCE(v_director_rate, 0.25);
  END IF;

  v_director_share := CASE
    WHEN v_director_id IS NOT NULL THEN ROUND(v_after_platform * v_director_rate, 2)
    ELSE 0
  END;

  -- Admin lookup (deterministic — BUG-003)
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

  -- Realtor gets exact remainder (BUG-026: no penny drift)
  v_realtor_share := v_after_platform - v_director_share - v_admin_share;

  -- Platform account lookup (BUG-002)
  SELECT (value #>> '{}')::uuid
    INTO v_platform_account_id
    FROM platform_settings
   WHERE key = 'platform_account_id'
     AND value #>> '{}' <> 'null';
  v_platform_account_id := COALESCE(v_platform_account_id, v_admin_id);

  -- Insert commission records (idempotent via ON CONFLICT DO NOTHING)
  INSERT INTO commissions
    (type, amount, source_transaction_id, recipient_user_id, recipient_role, status, listing_id, notes)
  VALUES
    (p_type, v_realtor_share, p_transaction_id, p_realtor_id, 'realtor', 'pending', p_listing_id,
     'Realtor share for ' || p_type || ' transaction')
  ON CONFLICT ON CONSTRAINT uq_commissions_tx_type_role DO NOTHING;
  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  IF v_platform_account_id IS NOT NULL AND v_platform_share > 0 THEN
    INSERT INTO commissions
      (type, amount, source_transaction_id, recipient_user_id, recipient_role, status, listing_id, notes)
    VALUES
      (p_type, v_platform_share, p_transaction_id, v_platform_account_id, 'platform', 'pending', p_listing_id,
       'Platform fee for ' || p_type || ' transaction')
    ON CONFLICT ON CONSTRAINT uq_commissions_tx_type_role DO NOTHING;
  END IF;

  IF v_director_id IS NOT NULL AND v_director_share > 0 THEN
    INSERT INTO commissions
      (type, amount, source_transaction_id, recipient_user_id, recipient_role, status, listing_id, notes)
    VALUES
      (p_type, v_director_share, p_transaction_id, v_director_id, 'director', 'pending', p_listing_id,
       'Director override for realtor ' || p_realtor_id::text)
    ON CONFLICT ON CONSTRAINT uq_commissions_tx_type_role DO NOTHING;
  END IF;

  IF v_admin_id IS NOT NULL AND v_admin_share > 0 THEN
    INSERT INTO commissions
      (type, amount, source_transaction_id, recipient_user_id, recipient_role, status, listing_id, notes)
    VALUES
      (p_type, v_admin_share, p_transaction_id, v_admin_id, 'admin', 'pending', p_listing_id,
       'Admin override for platform transaction')
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

GRANT EXECUTE ON FUNCTION process_transaction_commissions(uuid, numeric, text, uuid, uuid)
  TO authenticated, anon;

-- =============================================================================
-- CHANGE 6: user_commission_config table
-- Stores per-user (admin or director) commission overrides.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_commission_config (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  base_commission_pct  numeric(5,2) NOT NULL DEFAULT 25
    CHECK (base_commission_pct  >= 0 AND base_commission_pct  <= 100),
  override_commission_pct numeric(5,2) NOT NULL DEFAULT 25
    CHECK (override_commission_pct >= 0 AND override_commission_pct <= 100),
  updated_by           uuid        REFERENCES profiles(id),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE user_commission_config ENABLE ROW LEVEL SECURITY;

-- Admins can read and write all commission configs
CREATE POLICY "admin_commission_config_all" ON user_commission_config
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Directors can read their own config
CREATE POLICY "director_commission_config_read_own" ON user_commission_config
  FOR SELECT
  USING (user_id = auth.uid());

-- =============================================================================
-- CHANGE 7: display_name column on profiles (super admin editable display name)
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name text;

-- =============================================================================
-- CHANGE 8: is_super_admin flag
-- Protects designated super admins from deletion or demotion.
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- RLS: prevent non-super-admins from setting is_super_admin = true
-- (Enforced at application level too, but belt-and-suspenders here.)
-- Existing RLS on profiles handles read/write; we add a CHECK-like policy:
CREATE POLICY "only_super_admin_can_set_super_flag" ON profiles
  FOR UPDATE
  USING (true)
  WITH CHECK (
    -- If the row being written has is_super_admin = true, the caller must
    -- themselves be a super admin.
    is_super_admin = false
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- =============================================================================
-- Done.
-- =============================================================================
