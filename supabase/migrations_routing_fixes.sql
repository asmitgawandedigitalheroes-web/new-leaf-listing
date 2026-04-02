-- =============================================================================
-- NLVListings — Routing System Fix Migration
-- Fixes: BUG-005, BUG-006 (verified column names), BUG-023 (territory fallback),
--        BUG-035 (N+1 → single JOIN query via RPC)
-- All statements are idempotent (safe to re-run).
-- =============================================================================

-- =============================================================================
-- 1. BUG-023: Make territories.state nullable
--
-- The country-level detectTerritory() fallback needs to distinguish between:
--   • State-level territories  (country=USA, state='California', city=NULL)
--   • Country-level territories (country=USA, state=NULL,        city=NULL)
--
-- With state NOT NULL, the country fallback query matches state-level rows
-- from OTHER states and routes leads to the wrong director.
-- Making state nullable lets country-level territories be represented correctly
-- (state = NULL) and lets the fallback query filter IS NULL on state safely.
--
-- Existing seed rows are unaffected — they all have real state values.
-- =============================================================================

ALTER TABLE territories
  ALTER COLUMN state DROP NOT NULL;

-- =============================================================================
-- 2. BUG-035: Composite indexes for the get_routing_candidates() JOIN query
--
-- Without these, the single JOIN degrades to full table scans on large datasets.
-- Each index covers exactly the columns the join predicate touches.
-- =============================================================================

-- subscriptions: joined on (user_id, status='active')
-- The partial unique index from migrations_critical_fixes covers SELECT too.
-- Add a covering index that also returns the plan column without a heap fetch.
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active_plan
  ON subscriptions (user_id, plan)
  WHERE status = 'active';

-- listings: best upgrade in territory — joined on (territory_id, status='active'),
-- ordered by upgrade priority for DISTINCT ON.
CREATE INDEX IF NOT EXISTS idx_listings_territory_status_upgrade
  ON listings (territory_id, status, realtor_id, upgrade_type)
  WHERE status = 'active';

-- territory_sponsors: joined on (territory_id, user_id, active=true)
CREATE INDEX IF NOT EXISTS idx_territory_sponsors_territory_user_active
  ON territory_sponsors (territory_id, user_id)
  WHERE active = true;

-- leads: open-lead count aggregation per realtor
-- Valid open statuses from the CHECK constraint: new, assigned, contacted, showing, offer
CREATE INDEX IF NOT EXISTS idx_leads_open_by_realtor
  ON leads (assigned_realtor_id, status)
  WHERE status IN ('new', 'assigned', 'contacted', 'showing', 'offer');

-- profiles: territory member lookup — joined on (territory_id, role, status)
CREATE INDEX IF NOT EXISTS idx_profiles_territory_role_status
  ON profiles (territory_id, role, status)
  WHERE role = 'realtor' AND status = 'active';

-- territory_realtors: already has idx_territory_realtors_territory; verify user index
CREATE INDEX IF NOT EXISTS idx_territory_realtors_territory_user
  ON territory_realtors (territory_id, user_id);

-- =============================================================================
-- 3. BUG-035 + BUG-005 + BUG-006: get_routing_candidates() — single JOIN RPC
--
-- Replaces the N+1 loop in getEligibleRealtors() (4 queries × N realtors).
-- For N=100 realtors: 400+ round-trips → 1 round-trip.
--
-- Correctness guarantees:
--   • subscriptions joined on user_id (BUG-005 fix confirmed at DB level)
--   • territory_sponsors joined on user_id (BUG-006 fix confirmed at DB level)
--   • DISTINCT ON + upgrade priority ensures best upgrade per realtor
--   • Only valid open-lead statuses used in penalty aggregation
--   • SECURITY DEFINER so anon/service callers can invoke it safely
-- =============================================================================

CREATE OR REPLACE FUNCTION get_routing_candidates(p_territory_id uuid)
RETURNS TABLE (
  realtor_id        uuid,
  realtor_name      text,
  subscription_plan text,
  best_upgrade_type text,
  is_sponsor        boolean,
  open_lead_count   bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH
  -- ── All active realtors in this territory ────────────────────────────────
  -- Union of profiles.territory_id and the territory_realtors junction table
  -- (the junction table is the authoritative source post-phase-2 migration;
  -- profiles.territory_id is kept as a fallback for legacy rows).
  territory_members AS (
    SELECT DISTINCT p.id AS rid, p.full_name AS rname
    FROM   profiles p
    WHERE  p.role   = 'realtor'
      AND  p.status = 'active'
      AND  (
        p.territory_id = p_territory_id
        OR EXISTS (
          SELECT 1
          FROM   territory_realtors tr
          WHERE  tr.user_id      = p.id
            AND  tr.territory_id = p_territory_id
        )
      )
  ),

  -- ── Best listing upgrade per realtor in this territory ───────────────────
  -- DISTINCT ON picks the highest-priority upgrade_type for each realtor.
  -- Priority ordering: top(3) > featured(2) > standard(1).
  -- BUG-006 n/a here — listings join on realtor_id (correct column).
  best_listing AS (
    SELECT DISTINCT ON (l.realtor_id)
      l.realtor_id,
      l.upgrade_type
    FROM   listings l
    WHERE  l.territory_id = p_territory_id
      AND  l.status       = 'active'
    ORDER  BY
      l.realtor_id,
      CASE l.upgrade_type
        WHEN 'top'      THEN 3
        WHEN 'featured' THEN 2
        WHEN 'standard' THEN 1
        ELSE                 0
      END DESC
  ),

  -- ── Open-lead count per realtor (penalty) ────────────────────────────────
  -- Uses the exact set of statuses from the leads CHECK constraint.
  -- 'qualified' is NOT a valid status and was removed from the original query.
  open_leads AS (
    SELECT
      l.assigned_realtor_id,
      COUNT(*) AS cnt
    FROM   leads l
    WHERE  l.status IN ('new', 'assigned', 'contacted', 'showing', 'offer')
      AND  l.assigned_realtor_id IS NOT NULL
    GROUP  BY l.assigned_realtor_id
  )

  -- ── Final SELECT: one row per realtor, all scoring inputs in one pass ─────
  SELECT
    tm.rid                                      AS realtor_id,
    tm.rname                                    AS realtor_name,
    -- BUG-005 fix: subscriptions joined on user_id (not realtor_id)
    COALESCE(s.plan, 'free')                    AS subscription_plan,
    -- Null when realtor has no active listing in this territory
    bl.upgrade_type                             AS best_upgrade_type,
    -- BUG-006 fix: territory_sponsors joined on user_id (not realtor_id)
    (ts.user_id IS NOT NULL)                    AS is_sponsor,
    COALESCE(ol.cnt, 0)                         AS open_lead_count
  FROM       territory_members tm
  -- Subscription tier (BUG-005: user_id is the correct FK)
  LEFT JOIN  subscriptions s
             ON s.user_id = tm.rid
            AND s.status  = 'active'
  -- Best listing upgrade
  LEFT JOIN  best_listing bl
             ON bl.realtor_id = tm.rid
  -- Territory sponsor flag (BUG-006: user_id is the correct FK)
  LEFT JOIN  territory_sponsors ts
             ON ts.user_id      = tm.rid
            AND ts.territory_id = p_territory_id
            AND ts.active       = true
  -- Open-lead penalty
  LEFT JOIN  open_leads ol
             ON ol.assigned_realtor_id = tm.rid;
$$;

-- Grant execute to roles the routing service runs as
GRANT EXECUTE ON FUNCTION get_routing_candidates(uuid)
  TO authenticated, anon;

-- =============================================================================
-- 4. _get_territory_director() helper
--    Used by the routing service to resolve the director for a territory.
--    Kept as a DB function so both service and webhook can call it consistently.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_territory_director(p_territory_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT director_id
  FROM   territories
  WHERE  id = p_territory_id;
$$;

GRANT EXECUTE ON FUNCTION get_territory_director(uuid)
  TO authenticated, anon;

-- =============================================================================
-- Done. Verify with:
--   SELECT * FROM get_routing_candidates('00000000-0000-0000-0000-000000000001');
--   SELECT get_territory_director('00000000-0000-0000-0000-000000000001');
--   \d territories   -- confirm state is now nullable
-- =============================================================================
