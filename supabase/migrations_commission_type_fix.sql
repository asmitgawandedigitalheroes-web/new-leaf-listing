-- =============================================================================
-- NLVListings — Commission Type Fix Migration (HP-15)
-- Adds 'product' to the commissions.type CHECK constraint for NLV referrals.
-- Safe to re-run: drops existing CHECK before re-adding.
-- =============================================================================

-- Drop existing CHECK constraint on commissions.type (if it exists by name)
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_type_check;

-- Add new CHECK constraint that includes 'product' for NLV product referrals
ALTER TABLE commissions
  ADD CONSTRAINT commissions_type_check
  CHECK (type IN ('subscription','listing','deal','referral','product'));
