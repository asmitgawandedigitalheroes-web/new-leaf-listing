-- ──────────────────────────────────────────────────────────────────────
-- Migration: Contact Form Submissions (Enquiries)
-- Creates the contact_submissions table to store public contact form data.
-- Admins can view all submissions and convert them to leads.
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contact_submissions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  phone             TEXT,
  subject           TEXT,
  message           TEXT,
  status            TEXT        NOT NULL DEFAULT 'new'
                                CHECK (status IN ('new', 'converted', 'dismissed')),
  converted_lead_id UUID        REFERENCES leads(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can INSERT a contact form submission
CREATE POLICY "public_insert_contact_submissions"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);

-- Only admins can SELECT all submissions
CREATE POLICY "admins_read_contact_submissions"
  ON contact_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Only admins can UPDATE (e.g. mark as converted/dismissed)
CREATE POLICY "admins_update_contact_submissions"
  ON contact_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Index for fast ordering
CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
  ON contact_submissions (created_at DESC);
