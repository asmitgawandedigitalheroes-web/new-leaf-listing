-- Fix 1: Broaden leads_update_director_territory RLS policy
-- Old policy used profiles.territory_id (single value) which doesn't cover
-- directors managing multiple territories via the territories table.
-- Also adds coverage for leads directly assigned to the director.

DROP POLICY IF EXISTS "leads_update_director_territory" ON public.leads;

CREATE POLICY "leads_update_director_territory"
  ON public.leads FOR UPDATE
  USING (
    -- Lead belongs to a territory this director manages
    EXISTS (
      SELECT 1 FROM public.territories t
      WHERE t.director_id = auth.uid()
        AND t.id = leads.territory_id
    )
    OR
    -- Lead was directly assigned to this director
    leads.assigned_director_id = auth.uid()
  );


-- Fix 2: Update enforce_lead_lock trigger to also allow directors
-- Directors should be able to reassign leads in their territory
-- (e.g. after releasing the lock, or when a realtor leaves).

CREATE OR REPLACE FUNCTION enforce_lead_lock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce when reassigning to a different realtor
  IF NEW.assigned_realtor_id IS DISTINCT FROM OLD.assigned_realtor_id THEN
    IF OLD.lock_until IS NOT NULL
       AND OLD.lock_until > NOW()
       AND NOT is_admin()
       -- Allow directors who manage this lead's territory
       AND NOT EXISTS (
         SELECT 1 FROM public.territories t
         WHERE t.director_id = auth.uid()
           AND t.id = OLD.territory_id
       )
       -- Allow the director directly assigned to this lead
       AND OLD.assigned_director_id IS DISTINCT FROM auth.uid()
    THEN
      RAISE EXCEPTION 'lead_locked: Lead % is locked until %. Reassignment blocked.',
        OLD.id, OLD.lock_until
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
