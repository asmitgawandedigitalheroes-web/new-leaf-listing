-- =============================================================================
-- FIX: CRIT-006 — Director territory scoping bug
-- Root cause: director@nlvlistings.com (Michael Torres) was reassigned via the
-- Admin UI to a Reno, Nevada territory, but all seed data (realtors, listings,
-- leads) is in the Austin, Texas territory (ID: 00000000-0000-0000-0000-000000000003).
-- This causes the Director Dashboard to show 0 realtors, 0 leads, 0 listings.
--
-- Fix: Re-align the director's territory_id to Austin, Texas and ensure the
-- Austin territory has the director assigned.
-- =============================================================================

-- Step 1: Reassign director profile to Austin, Texas territory
UPDATE profiles
SET territory_id = '00000000-0000-0000-0000-000000000003',
    updated_at   = NOW()
WHERE email = 'director@nlvlistings.com'
  AND role  = 'director';

-- Step 2: Ensure Austin territory's director_id points to Michael Torres
UPDATE territories
SET director_id = '00000000-0000-0000-0001-000000000002',
    updated_at  = NOW()
WHERE id = '00000000-0000-0000-0000-000000000003';

-- Step 3: Ensure all realtors in Austin territory have the correct assigned_director_id
UPDATE profiles
SET assigned_director_id = '00000000-0000-0000-0001-000000000002',
    updated_at            = NOW()
WHERE territory_id = '00000000-0000-0000-0000-000000000003'
  AND role         = 'realtor';

-- Step 4: Ensure all leads in Austin territory have the correct assigned_director_id
UPDATE leads
SET assigned_director_id = '00000000-0000-0000-0001-000000000002',
    updated_at            = NOW()
WHERE territory_id = '00000000-0000-0000-0000-000000000003'
  AND assigned_director_id IS DISTINCT FROM '00000000-0000-0000-0001-000000000002';

-- Verification query (run after applying):
-- SELECT p.full_name, p.email, p.role, t.city, t.state
-- FROM profiles p
-- LEFT JOIN territories t ON t.id = p.territory_id
-- WHERE p.role IN ('director', 'realtor')
-- ORDER BY p.role, p.full_name;
