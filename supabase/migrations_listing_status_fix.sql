-- =============================================================================
-- NLVListings — Listing Status Fix Migration
-- Adds 'under_contract' to the listings.status CHECK constraint.
-- Safe to re-run: uses DROP CONSTRAINT IF EXISTS before re-adding.
-- =============================================================================

-- Drop existing CHECK constraint on listings.status (if it exists by name)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;

-- Add new CHECK constraint that includes 'under_contract'
ALTER TABLE listings
  ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft','pending','active','under_contract','sold','expired','rejected'));
