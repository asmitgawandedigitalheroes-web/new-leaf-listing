-- Add GHL tracking columns to listings and profiles tables

-- listings: store the GHL opportunity ID for pipeline stage syncing
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS ghl_opportunity_id TEXT DEFAULT NULL;

-- profiles: store the GHL sub-account location ID per realtor
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ghl_location_id TEXT DEFAULT NULL;
