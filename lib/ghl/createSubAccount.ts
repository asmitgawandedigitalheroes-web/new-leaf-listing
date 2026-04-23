/**
 * lib/ghl/createSubAccount.ts
 *
 * Creates or links a GHL sub-account (Location) when a new Realtor is approved.
 * Stores the returned location_id back against the user's profile in Supabase.
 *
 * GHL API: POST /locations/  (Agency-level endpoint — requires agency API key)
 *
 * NOTE: Sub-account creation requires an Agency API key, not a PIT token.
 * Store it as VITE_GHL_AGENCY_API_KEY separately from the location PIT token.
 */

import { supabase } from '../../src/lib/supabase';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/** Custom field IDs to register on every new sub-account */
const CUSTOM_FIELDS = [
  { name: 'listing_id',          dataType: 'TEXT',     model: 'contact' },
  { name: 'territory',           dataType: 'TEXT',     model: 'contact' },
  { name: 'attribution_flag',    dataType: 'TEXT',     model: 'contact' },
  { name: 'attribution_expiry',  dataType: 'DATE',     model: 'contact' },
  { name: 'commission_type',     dataType: 'TEXT',     model: 'contact' },
  { name: 'platform_lead',       dataType: 'CHECKBOX', model: 'contact' },
  { name: 'assigned_realtor_id', dataType: 'TEXT',     model: 'contact' },
  { name: 'assigned_director_id',dataType: 'TEXT',     model: 'contact' },
];

function agencyHeaders(): Record<string, string> {
  // Agency-level operations require the agency key, not a PIT token
  const agencyKey = import.meta?.env?.VITE_GHL_AGENCY_API_KEY ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${agencyKey}`,
    Version:        '2021-07-28',
  };
}

/**
 * Create a GHL sub-account for a newly approved realtor and persist the
 * returned location_id to the profiles table.
 *
 * @param realtorId    - Supabase user ID of the approved realtor
 * @param realtorName  - Full name (used as the GHL location name)
 * @param email        - Realtor's email
 * @param territory    - Territory name/label for the sub-account
 */
export async function createRealtorSubAccount(
  realtorId:   string,
  realtorName: string,
  email:       string,
  territory:   string
): Promise<{ success: boolean; ghl_location_id?: string; error?: string }> {
  const agencyKey = import.meta?.env?.VITE_GHL_AGENCY_API_KEY ?? '';
  if (!agencyKey) {
    console.warn('[createSubAccount] VITE_GHL_AGENCY_API_KEY not set — skipping sub-account creation');
    return { success: false, error: 'Agency API key not configured' };
  }

  try {
    // ── 1. Create GHL Location (sub-account) ─────────────────────────────────
    const locRes = await fetch(`${GHL_API_BASE}/locations/`, {
      method: 'POST',
      headers: agencyHeaders(),
      body: JSON.stringify({
        name:    `${realtorName} — ${territory}`,
        email,
        address: territory,
        timezone: 'America/New_York',
        settings: {
          allowDuplicateContact: false,
          allowDuplicateOpportunity: false,
        },
      }),
    });

    const locBody = await locRes.json().catch(() => null);
    if (!locRes.ok) {
      console.error('[createSubAccount] Create location failed:', locBody);
      return { success: false, error: locBody?.message ?? `HTTP ${locRes.status}` };
    }

    const ghlLocationId: string = locBody?.location?.id ?? locBody?.id;
    if (!ghlLocationId) {
      return { success: false, error: 'GHL did not return a location ID' };
    }

    // ── 2. Register custom fields on the new location ─────────────────────────
    await Promise.allSettled(
      CUSTOM_FIELDS.map(field =>
        fetch(`${GHL_API_BASE}/locations/${ghlLocationId}/customFields`, {
          method: 'POST',
          headers: agencyHeaders(),
          body: JSON.stringify(field),
        })
      )
    );

    // ── 3. Persist location ID back to the realtor's profile ─────────────────
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ghl_location_id: ghlLocationId,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', realtorId);

    if (updateError) {
      console.warn('[createSubAccount] Profile update failed:', updateError.message);
      // Non-fatal — GHL location was created; admin can link manually
    }

    console.info(`[createSubAccount] Created GHL location ${ghlLocationId} for realtor ${realtorId}`);
    return { success: true, ghl_location_id: ghlLocationId };
  } catch (err: any) {
    console.error('[createSubAccount] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}
