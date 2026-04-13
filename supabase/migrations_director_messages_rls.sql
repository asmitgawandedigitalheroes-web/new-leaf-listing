-- Migration: Allow directors to read messages for leads in their territory,
-- directly assigned to them, OR assigned to their realtors (even if from another territory).

DROP POLICY IF EXISTS "messages_select_director" ON public.messages;

CREATE POLICY "messages_select_director"
  ON public.messages FOR SELECT
  USING (
    -- Lead belongs to a territory this director manages
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.territories t ON t.id = l.territory_id
      WHERE l.id = messages.lead_id
        AND t.director_id = auth.uid()
    )
    OR
    -- Lead was directly assigned to this director
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = messages.lead_id
        AND l.assigned_director_id = auth.uid()
    )
    OR
    -- Lead is assigned to a realtor who belongs to this director's territory
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.profiles p ON p.id = l.assigned_realtor_id
      JOIN public.territories t ON t.id = p.territory_id
      WHERE l.id = messages.lead_id
        AND t.director_id = auth.uid()
    )
  );
