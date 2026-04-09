-- ── FIX: Director can see leads directly assigned to them ──────────────────
-- The existing "leads_select_director_territory" policy only allows directors
-- to see leads whose territory_id is in their managed territories.
-- When admin assigns a lead directly to a director (assigned_director_id),
-- the lead may have a territory_id that doesn't match, so RLS blocks it.
-- This migration extends the policy to also allow directors to read leads
-- where assigned_director_id = auth.uid().

DROP POLICY IF EXISTS "leads_select_director_territory" ON leads;
CREATE POLICY "leads_select_director_territory" ON leads
  FOR SELECT
  TO authenticated
  USING (
    -- Leads in any territory this director manages
    EXISTS (
      SELECT 1 FROM territories t
      WHERE t.director_id = auth.uid()
        AND t.id = leads.territory_id
    )
    -- OR leads directly assigned to this director (regardless of territory)
    OR leads.assigned_director_id = auth.uid()
  );
