/**
 * lib/ghl/commissionTrigger.ts
 *
 * Handles the "listing sold" event:
 *   1. Updates the GHL opportunity stage to "stage_closed_won"
 *   2. Creates commission_records rows for realtor, director, and admin splits
 *
 * Commission splits (matching commission.service.ts defaults):
 *   Platform cut : 15%  (goes to admin)
 *   Director     : 25%  of after-platform remainder
 *   Admin override: 15% of after-platform remainder
 *   Realtor       : remainder
 */

import { supabase } from '../../src/lib/supabase';
import { syncPipelineStage } from './pipelineStages';

const DEFAULT_PLATFORM_RATE = 0.15;
const DEFAULT_DIRECTOR_RATE = 0.25;
const DEFAULT_ADMIN_RATE    = 0.15;

/** Integer-cent split (mirrors commission.service.ts calcSharesCents) */
function calcSplitCents(
  salePrice: number,
  platformRate = DEFAULT_PLATFORM_RATE,
  directorRate = DEFAULT_DIRECTOR_RATE,
  adminRate    = DEFAULT_ADMIN_RATE,
  hasDirector  = true
) {
  const totalCents    = Math.round(salePrice * 100);
  const platformCents = Math.round(totalCents * platformRate);
  const after         = totalCents - platformCents;
  const directorCents = hasDirector ? Math.round(after * directorRate) : 0;
  const adminCents    = Math.round(after * adminRate);
  const realtorCents  = after - directorCents - adminCents;
  return { totalCents, platformCents, directorCents, adminCents, realtorCents };
}

/**
 * Fired when a listing is marked as "sold".
 *
 * @param listing - The listing row (must include id, title, sale_price, realtor_id,
 *                  ghl_contact_id, ghl_opportunity_id, assigned_director_id)
 */
export async function onListingSold(listing: {
  id:                   string;
  title?:               string;
  sale_price?:          number | null;
  realtor_id?:          string | null;
  assigned_director_id?: string | null;
  ghl_contact_id?:      string | null;
  ghl_opportunity_id?:  string | null;
  status:               string;
}): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  // ── 1. Update GHL opportunity to "Closed Won" ────────────────────────────
  const pipelineResult = await syncPipelineStage(listing, 'sold');
  if (!pipelineResult.success) {
    // Non-fatal — log and continue to commission creation
    console.warn('[commissionTrigger] GHL pipeline update failed:', pipelineResult.error);
    errors.push(`GHL pipeline: ${pipelineResult.error}`);
  }

  // ── 2. Create commission records ─────────────────────────────────────────
  const salePrice = listing.sale_price ?? 0;
  if (salePrice <= 0) {
    console.warn(`[commissionTrigger] Listing ${listing.id} has no sale_price — skipping commission`);
    return { success: errors.length === 0, errors };
  }

  const hasDirector = Boolean(listing.assigned_director_id);
  const splits = calcSplitCents(salePrice, DEFAULT_PLATFORM_RATE, DEFAULT_DIRECTOR_RATE, DEFAULT_ADMIN_RATE, hasDirector);

  // Fetch admin user id (first admin in the system)
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single();

  const records: Array<{
    listing_id:        string;
    recipient_user_id: string | null;
    recipient_role:    string;
    type:              string;
    amount:            number;
    status:            string;
    source_event:      string;
    metadata:          Record<string, any>;
  }> = [];

  // Realtor share
  if (listing.realtor_id && splits.realtorCents > 0) {
    records.push({
      listing_id:        listing.id,
      recipient_user_id: listing.realtor_id,
      recipient_role:    'realtor',
      type:              'deal',
      amount:            splits.realtorCents / 100,
      status:            'pending',
      source_event:      'listing.sold',
      metadata:          { listing_title: listing.title, sale_price: salePrice },
    });
  }

  // Director share
  if (hasDirector && listing.assigned_director_id && splits.directorCents > 0) {
    records.push({
      listing_id:        listing.id,
      recipient_user_id: listing.assigned_director_id,
      recipient_role:    'director',
      type:              'deal',
      amount:            splits.directorCents / 100,
      status:            'pending',
      source_event:      'listing.sold',
      metadata:          { listing_title: listing.title, sale_price: salePrice },
    });
  }

  // Admin / platform share
  if (adminProfile?.id && splits.platformCents + splits.adminCents > 0) {
    records.push({
      listing_id:        listing.id,
      recipient_user_id: adminProfile.id,
      recipient_role:    'admin',
      type:              'deal',
      amount:            (splits.platformCents + splits.adminCents) / 100,
      status:            'pending',
      source_event:      'listing.sold',
      metadata:          {
        listing_title:  listing.title,
        sale_price:     salePrice,
        platform_cut:   splits.platformCents / 100,
        admin_override: splits.adminCents / 100,
      },
    });
  }

  if (records.length > 0) {
    const { error: insertError } = await supabase
      .from('commission_records')
      .insert(records);

    if (insertError) {
      console.error('[commissionTrigger] Commission insert failed:', insertError.message);
      errors.push(`Commission DB: ${insertError.message}`);
    } else {
      console.info(`[commissionTrigger] Created ${records.length} commission records for listing ${listing.id}`);
    }
  }

  return { success: errors.length === 0, errors };
}
