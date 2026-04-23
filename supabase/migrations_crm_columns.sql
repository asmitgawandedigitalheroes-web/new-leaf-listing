-- Add CRM sync tracking columns to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS crm_sync_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ghl_contact_id  TEXT DEFAULT NULL;
