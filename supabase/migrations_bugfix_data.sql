-- ============================================================
-- BUG FIX MIGRATION: Data Corrections
-- Fixes: E-2 (test data in production), E-3 (Sarah Kim verified)
-- ============================================================

-- ── E-2: Hide test listing from public browse ────────────────
-- "Email Test Listing 2" by Kaisha should not appear publicly.
-- Set status to 'draft' so it is excluded from the active query.
UPDATE listings
SET status = 'draft', updated_at = NOW()
WHERE title ILIKE '%email test listing%'
   OR title ILIKE '%test listing%';


-- ── E-3: Fix Sarah Kim's verified status ────────────────────
-- Active Pro realtor shows status = 'pending' despite having live listings.
-- The profiles table uses status IN ('active','pending','suspended') — no
-- separate 'verified' column exists. Set status to 'active' to resolve.
UPDATE profiles
SET status = 'active', updated_at = NOW()
WHERE email = 'realtor@nlvlistings.com'
  AND status = 'pending';
