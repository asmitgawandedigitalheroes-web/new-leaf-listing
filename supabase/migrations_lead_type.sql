-- Migration: Add lead_type column to differentiate realtor onboarding leads vs buyer/client leads
-- Safe to run on any existing database that already has the leads table.
-- If running schema.sql fresh, this column is already included — skip this file.

DO $$
BEGIN
  -- Only add the column if the leads table exists and the column does not yet exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'leads'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lead_type'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN lead_type text NOT NULL DEFAULT 'buyer'
      CHECK (lead_type IN ('buyer', 'realtor'));

    CREATE INDEX IF NOT EXISTS leads_lead_type_idx
      ON public.leads (lead_type);

    CREATE INDEX IF NOT EXISTS leads_territory_type_idx
      ON public.leads (territory_id, lead_type);

    RAISE NOTICE 'lead_type column added to leads table.';
  ELSE
    RAISE NOTICE 'Skipped: leads table does not exist or lead_type column already present.';
  END IF;
END;
$$;
