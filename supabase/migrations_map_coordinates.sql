-- =============================================================================
-- Migration: Add map coordinates to listings
-- Run in Supabase SQL Editor
-- =============================================================================

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS latitude  numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

-- Index for fast coordinate-based queries (only indexes rows that have coords)
CREATE INDEX IF NOT EXISTS idx_listings_coordinates
  ON listings (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN listings.latitude  IS 'WGS84 latitude — required for map pin display';
COMMENT ON COLUMN listings.longitude IS 'WGS84 longitude — required for map pin display';
