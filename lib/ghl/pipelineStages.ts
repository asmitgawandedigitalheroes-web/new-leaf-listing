/**
 * lib/ghl/pipelineStages.ts
 *
 * Maps NLVListings listing statuses to GoHighLevel pipeline opportunity stages
 * and syncs them via the GHL Opportunities API (v2 LeadConnector).
 *
 * Called whenever a listing status changes (approve, markSold, expire, etc.)
 */

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/** NLVListings listing status → GHL pipeline stage key */
export const STAGE_MAP: Record<string, string> = {
  draft:             'stage_new_lead',
  pending:           'stage_qualifying',
  active:            'stage_active_listing',
  under_contract:    'stage_under_contract',
  sold:              'stage_closed_won',
  expired:           'stage_closed_lost',
  rejected:          'stage_closed_lost',
};

/** Build the shared Authorization + Version headers for GHL v2 */
function ghlHeaders(): Record<string, string> {
  const apiKey = import.meta?.env?.VITE_GHL_API_KEY ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${apiKey}`,
    Version:        '2021-07-28',
  };
}

/**
 * Sync a listing status change to a GHL pipeline opportunity.
 *
 * If the listing already has a ghl_opportunity_id we update it in place.
 * Otherwise we create a new opportunity and return its ID so the caller
 * can persist it back to the listings table.
 *
 * @param listing   - The listing row from Supabase (must include id, title, status, ghl_contact_id, ghl_opportunity_id)
 * @param newStatus - The new NLV listing status being applied
 * @returns         The GHL opportunity ID (new or existing)
 */
export async function syncPipelineStage(
  listing: {
    id: string;
    title?: string;
    status: string;
    ghl_contact_id?: string | null;
    ghl_opportunity_id?: string | null;
  },
  newStatus: string
): Promise<{ success: boolean; ghl_opportunity_id?: string; error?: string }> {
  const pipelineId = import.meta?.env?.VITE_GHL_PIPELINE_ID ?? '';
  const locationId = import.meta?.env?.VITE_GHL_LOCATION_ID ?? '';

  if (!pipelineId || !locationId) {
    console.warn('[pipelineStages] GHL_PIPELINE_ID or GHL_LOCATION_ID not set — skipping');
    return { success: false, error: 'Pipeline or location not configured' };
  }

  const stageKey = STAGE_MAP[newStatus] ?? 'stage_new_lead';

  try {
    // ── Update existing opportunity ──────────────────────────────────────────
    if (listing.ghl_opportunity_id) {
      const res = await fetch(
        `${GHL_API_BASE}/opportunities/${listing.ghl_opportunity_id}`,
        {
          method: 'PUT',
          headers: ghlHeaders(),
          body: JSON.stringify({ pipelineStageId: stageKey }),
        }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        console.error('[pipelineStages] Update opportunity failed:', body);
        return { success: false, error: body?.message ?? `HTTP ${res.status}` };
      }
      return { success: true, ghl_opportunity_id: listing.ghl_opportunity_id };
    }

    // ── Create new opportunity ───────────────────────────────────────────────
    if (!listing.ghl_contact_id) {
      return { success: false, error: 'No GHL contact linked to this listing — sync lead first' };
    }

    const res = await fetch(`${GHL_API_BASE}/opportunities/`, {
      method: 'POST',
      headers: ghlHeaders(),
      body: JSON.stringify({
        pipelineId,
        name:            listing.title ?? `NLV Listing ${listing.id}`,
        pipelineStageId: stageKey,
        contactId:       listing.ghl_contact_id,
        status:          newStatus === 'sold' ? 'won' : newStatus === 'expired' ? 'lost' : 'open',
        customFields: [
          { id: 'nlv_listing_id', field_value: listing.id },
        ],
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('[pipelineStages] Create opportunity failed:', body);
      return { success: false, error: body?.message ?? `HTTP ${res.status}` };
    }

    const opportunityId = body?.opportunity?.id ?? body?.id ?? null;
    return { success: true, ghl_opportunity_id: opportunityId };
  } catch (err: any) {
    console.error('[pipelineStages] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}
