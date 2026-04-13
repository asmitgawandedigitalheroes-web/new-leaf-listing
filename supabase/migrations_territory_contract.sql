-- =============================================================================
-- Migration: Territory Partner Agreement submission fields on profiles
-- Run this in the Supabase SQL Editor
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS territory_contract_signed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS territory_contract_entity_name text;
