-- Allow anonymous (public) users to submit lead inquiries from listing pages.
-- Restricts inserts to valid initial statuses only — prevents privilege escalation.
CREATE POLICY "allow_public_lead_inquiry"
ON leads
FOR INSERT
TO anon
WITH CHECK (
  status IN ('new', 'assigned')
  AND source IS NOT NULL
);

-- Allow anonymous users to submit contact form messages
CREATE POLICY "allow_public_contact_submissions"
ON contact_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
