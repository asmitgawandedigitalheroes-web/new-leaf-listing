-- =============================================================================
-- NLVListings — Phase 2 QA Fix Migrations
-- Run in Supabase SQL Editor. All statements are idempotent (safe to re-run).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles — add accepted_terms_at (Terms of Service acceptance timestamp)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. subscriptions — add current_period_end (Stripe billing period end)
-- ---------------------------------------------------------------------------
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- ---------------------------------------------------------------------------
-- 3. territory_realtors — maps realtors to territories (many-to-many)
--    Used by routing engine to find eligible realtors in a territory.
--    Pre-populated from profiles.territory_id via trigger or manual upsert.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS territory_realtors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL REFERENCES territories (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (territory_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_territory_realtors_territory ON territory_realtors (territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_realtors_user      ON territory_realtors (user_id);

ALTER TABLE territory_realtors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "territory_realtors_select" ON territory_realtors;
CREATE POLICY "territory_realtors_select" ON territory_realtors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "territory_realtors_insert_admin" ON territory_realtors;
CREATE POLICY "territory_realtors_insert_admin" ON territory_realtors
  FOR INSERT WITH CHECK (is_admin());

-- Backfill from profiles.territory_id for existing realtors
INSERT INTO territory_realtors (territory_id, user_id)
SELECT territory_id, id
FROM profiles
WHERE role = 'realtor'
  AND territory_id IS NOT NULL
  AND status = 'active'
ON CONFLICT (territory_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. territory_sponsors — tracks which realtors are "territory sponsors"
--    (premium placement bonus in lead routing score)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS territory_sponsors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL REFERENCES territories (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  active       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (territory_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_territory_sponsors_territory ON territory_sponsors (territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_sponsors_user      ON territory_sponsors (user_id);

ALTER TABLE territory_sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "territory_sponsors_select" ON territory_sponsors;
CREATE POLICY "territory_sponsors_select" ON territory_sponsors
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 5. Sync trigger: keep territory_realtors in sync when profiles.territory_id changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_territory_realtors()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Remove old territory membership if territory_id changed
  IF OLD.territory_id IS NOT NULL AND OLD.territory_id IS DISTINCT FROM NEW.territory_id THEN
    DELETE FROM territory_realtors
    WHERE user_id = NEW.id AND territory_id = OLD.territory_id;
  END IF;

  -- Add new territory membership
  IF NEW.territory_id IS NOT NULL AND NEW.role = 'realtor' THEN
    INSERT INTO territory_realtors (territory_id, user_id)
    VALUES (NEW.territory_id, NEW.id)
    ON CONFLICT (territory_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_territory_realtors ON profiles;
CREATE TRIGGER trg_sync_territory_realtors
  AFTER UPDATE OF territory_id ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_territory_realtors();

-- ---------------------------------------------------------------------------
-- Done.
-- Verify with:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
--   SELECT * FROM territory_realtors LIMIT 5;
--   SELECT * FROM territory_sponsors LIMIT 1;
-- ---------------------------------------------------------------------------
