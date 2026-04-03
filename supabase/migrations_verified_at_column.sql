-- ============================================================
-- MIGRATION: Add verified_at column to profiles table
-- This column was referenced in code but never added to schema.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.profiles.verified_at IS
  'Timestamp when an admin granted the verification badge. NULL = unverified.';
