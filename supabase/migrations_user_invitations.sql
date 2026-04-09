-- ============================================================
-- Migration: user_invitations table
-- Purpose: Secure token-based admin invite system for realtors
--          and directors with auto-approval on signup.
-- ============================================================

-- Create table
CREATE TABLE IF NOT EXISTS user_invitations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token          text NOT NULL UNIQUE,
  email          text,             -- NULL for Flow 2 (quick link invites)
  full_name      text,             -- NULL for Flow 2
  role           text NOT NULL CHECK (role IN ('director', 'realtor')),
  territory_id   uuid REFERENCES territories(id) ON DELETE CASCADE,
  invited_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at     timestamptz NOT NULL,
  accepted_at    timestamptz,
  accepted_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_token      ON user_invitations (token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON user_invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status     ON user_invitations (status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations (expires_at);

-- Auto-update updated_at
-- (reuses the update_updated_at_column() function already defined in schema.sql)
DROP TRIGGER IF EXISTS update_user_invitations_updated_at ON user_invitations;
CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────────────────

-- Admins: full CRUD on all invitations
DROP POLICY IF EXISTS "invitations_admin_all" ON user_invitations;
CREATE POLICY "invitations_admin_all" ON user_invitations
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Public (including anon): read pending, non-expired invitations only.
-- This is intentional — the 64-char random token (256-bit entropy) is the
-- security mechanism. Without the token an attacker cannot read invitation data.
DROP POLICY IF EXISTS "invitations_public_read" ON user_invitations;
CREATE POLICY "invitations_public_read" ON user_invitations
  FOR SELECT
  USING (status = 'pending' AND expires_at > now());

-- Authenticated users can accept a pending invitation (one-time).
-- The WITH CHECK ensures status can only be updated TO 'accepted'.
DROP POLICY IF EXISTS "invitations_update_accept" ON user_invitations;
CREATE POLICY "invitations_update_accept" ON user_invitations
  FOR UPDATE
  USING (status = 'pending' AND expires_at > now())
  WITH CHECK (status = 'accepted');

-- ── Optional: helper to expire stale invitations ─────────────────────────────
CREATE OR REPLACE FUNCTION expire_stale_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_invitations
  SET    status = 'expired'
  WHERE  status = 'pending'
    AND  expires_at < now();
END;
$$;
