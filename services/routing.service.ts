import { supabase } from '../src/lib/supabase';
import { RoutingContext, RoutingResult, PriorityCandidate } from '../types/routing.types';
import { territoryService } from './territory.service';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';
import { crmService } from './crm.service';

// ── Scoring constants ────────────────────────────────────────────────────────

/** Points awarded for subscription tier */
const TIER_SCORES: Record<string, number> = {
  dominator: 40,
  sponsor:   40,
  pro:       30,
  starter:   20,
  free:      10,
};

/** Points awarded for best active listing upgrade in the territory */
const UPGRADE_SCORES: Record<string, number> = {
  top:      20,
  featured: 10,
  standard:  5,
};

/** Bonus points for territory sponsor status */
const SPONSOR_BONUS = 25;

/** Points deducted per open lead (capped at MAX_LEAD_PENALTY) */
const LEAD_PENALTY = 2;
const MAX_LEAD_PENALTY = 20;

// ── Raw row returned by get_routing_candidates() RPC ────────────────────────

interface RoutingCandidateRow {
  realtor_id:        string;
  realtor_name:      string;
  subscription_plan: string;        // 'free' when no active subscription
  best_upgrade_type: string | null; // null when no active listing in territory
  is_sponsor:        boolean;
  open_lead_count:   number;
}

// ── Score calculation ────────────────────────────────────────────────────────

/** Convert a raw DB row from get_routing_candidates() into a scored PriorityCandidate. */
function scoreCandidate(row: RoutingCandidateRow): PriorityCandidate {
  const tier = row.subscription_plan ?? 'free';
  let score  = TIER_SCORES[tier] ?? 10;

  const upgradeType = row.best_upgrade_type ?? 'standard';
  score += UPGRADE_SCORES[upgradeType] ?? 0;

  if (row.is_sponsor) score += SPONSOR_BONUS;

  const penalty = Math.min((row.open_lead_count ?? 0) * LEAD_PENALTY, MAX_LEAD_PENALTY);
  score = Math.max(score - penalty, 0);

  return {
    realtor_id:           row.realtor_id,
    realtor_name:         row.realtor_name,
    priority_score:       score,
    subscription_tier:    tier,
    listing_upgrade:      row.best_upgrade_type ?? null,
    is_territory_sponsor: row.is_sponsor,
  };
}

// ── Routing service ──────────────────────────────────────────────────────────

export const routingService = {
  /**
   * Main lead routing engine.
   * Scores all eligible realtors in the territory and assigns the highest scorer.
   */
  routeLead: async (context: RoutingContext): Promise<RoutingResult> => {
    const timestamp = new Date().toISOString();

    // 1. Resolve territory from context or detect from lead location
    let territoryId = context.territory_id;
    if (!territoryId && context.lead.territory) {
      const detected = await territoryService.detectTerritory({
        country: 'US',
        state:   context.lead.territory,
      });
      if (detected) territoryId = detected.id;
    }

    if (!territoryId) {
      return {
        assigned_realtor_id:  null,
        assigned_director_id: null,
        routing_reason:       'No matching territory found for lead location',
        priority_score:       0,
        timestamp,
      };
    }

    // 2. If a listing_id is provided, prefer the listing owner
    if (context.listing_id) {
      const { data: listing } = await supabase
        .from('listings')
        .select('realtor_id')
        .eq('id', context.listing_id)
        .single();

      if (listing?.realtor_id) {
        const director = await routingService._getDirectorForTerritory(territoryId);
        return {
          assigned_realtor_id:  listing.realtor_id,
          assigned_director_id: director,
          routing_reason:       `Assigned to listing owner (listing_id: ${context.listing_id})`,
          priority_score:       100,
          timestamp,
        };
      }
    }

    // 3. Score all eligible realtors via single JOIN query (BUG-035 fix)
    const candidates = await routingService.getEligibleRealtors(territoryId);

    if (!candidates.length) {
      return {
        assigned_realtor_id:  null,
        assigned_director_id: await routingService._getDirectorForTerritory(territoryId),
        routing_reason:       'No eligible realtors found in territory',
        priority_score:       0,
        timestamp,
      };
    }

    // 4. Select highest scorer (stable sort: already sorted descending by getEligibleRealtors)
    const best     = candidates[0];
    const director = await routingService._getDirectorForTerritory(territoryId);

    return {
      assigned_realtor_id:  best.realtor_id,
      assigned_director_id: director,
      routing_reason:       `Highest priority score (${best.priority_score}) — tier: ${best.subscription_tier}, upgrade: ${best.listing_upgrade ?? 'none'}, sponsor: ${best.is_territory_sponsor}`,
      priority_score:       best.priority_score,
      timestamp,
    };
  },

  /**
   * BUG-035 fix: Get all scored realtor candidates for a territory using a
   * single JOIN query instead of 4 queries per candidate.
   *
   * Delegates to the get_routing_candidates() PL/pgSQL function which executes
   * one SQL statement covering subscriptions, listings, sponsors, and open-lead
   * counts via CTEs and LEFT JOINs — O(1) round-trips regardless of territory size.
   *
   * BUG-005 + BUG-006 confirmed at DB level: the RPC joins subscriptions and
   * territory_sponsors on user_id (not the incorrect realtor_id).
   */
  getEligibleRealtors: async (territoryId: string): Promise<PriorityCandidate[]> => {
    const { data: rows, error } = await supabase.rpc('get_routing_candidates', {
      p_territory_id: territoryId,
    });

    if (error) {
      console.error('[routing] get_routing_candidates RPC error:', error.message);
      return [];
    }

    if (!rows || rows.length === 0) return [];

    return (rows as RoutingCandidateRow[])
      .map(scoreCandidate)
      .sort((a, b) => b.priority_score - a.priority_score);
  },

  /**
   * Calculate the priority score for a single realtor in a territory.
   * Used for point-in-time re-scoring of an individual (e.g. after plan change).
   * For bulk territory scoring use getEligibleRealtors().
   *
   * BUG-005: subscriptions queried on user_id.
   * BUG-006: territory_sponsors queried on user_id.
   */
  getPriorityScore: async (realtorId: string, territoryId: string): Promise<number> => {
    // All four queries in parallel — acceptable for single-realtor use
    const [subRes, listingRes, sponsorRes, leadRes] = await Promise.all([
      // BUG-005 fix: user_id (not realtor_id)
      supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', realtorId)
        .eq('status', 'active')
        .maybeSingle(),

      // Fetch all active listings to find the highest-ranked upgrade type.
      // A simple .order('upgrade_type', { ascending: false }) uses alphabetical
      // order (top > standard > featured) which incorrectly ranks 'standard'
      // above 'featured'. Fetch all rows and pick the best by numeric rank.
      supabase
        .from('listings')
        .select('upgrade_type')
        .eq('realtor_id', realtorId)
        .eq('territory_id', territoryId)
        .eq('status', 'active'),

      // BUG-006 fix: user_id (not realtor_id)
      supabase
        .from('territory_sponsors')
        .select('id')
        .eq('user_id', realtorId)
        .eq('territory_id', territoryId)
        .eq('active', true)
        .maybeSingle(),

      // Only valid open statuses from the leads CHECK constraint (not 'qualified')
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_realtor_id', realtorId)
        .in('status', ['new', 'assigned', 'contacted', 'showing', 'offer']),
    ]);

    const tier    = subRes.data?.plan ?? 'free';
    let   score   = TIER_SCORES[tier] ?? 10;

    // Pick the highest-ranked upgrade type by numeric priority (not alphabetically).
    // UPGRADE_SCORES: top=20, featured=10, standard=5
    const listings = (listingRes.data ?? []) as Array<{ upgrade_type: string }>;
    const bestUpgrade = listings
      .map(l => l.upgrade_type)
      .sort((a, b) => (UPGRADE_SCORES[b] ?? 0) - (UPGRADE_SCORES[a] ?? 0))[0] ?? null;
    if (bestUpgrade) {
      score += UPGRADE_SCORES[bestUpgrade] ?? 0;
    }

    if (sponsorRes.data) score += SPONSOR_BONUS;

    const penalty = Math.min((leadRes.count ?? 0) * LEAD_PENALTY, MAX_LEAD_PENALTY);
    return Math.max(score - penalty, 0);
  },

  /**
   * Apply a routing result to a lead — updates the lead record, logs the
   * decision, fires notifications, and syncs to CRM.
   */
  applyRouting: async (leadId: string, result: RoutingResult): Promise<void> => {
    const updates: Record<string, unknown> = {
      status:     'assigned',
      updated_at: new Date().toISOString(),
    };

    if (result.assigned_realtor_id) {
      updates.assigned_realtor_id = result.assigned_realtor_id;
      updates.lock_until = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    }

    if (result.assigned_director_id) {
      updates.assigned_director_id = result.assigned_director_id;
    }

    await supabase.from('leads').update(updates).eq('id', leadId);

    await auditService.log(
      result.assigned_realtor_id ?? null,
      'lead.assigned',
      'lead',
      leadId,
      {
        assigned_realtor_id:  result.assigned_realtor_id,
        assigned_director_id: result.assigned_director_id,
        routing_reason:       result.routing_reason,
        priority_score:       result.priority_score,
        timestamp:            result.timestamp,
      }
    );

    if (result.assigned_realtor_id) {
      notificationService
        .notifyNewLead(leadId, result.assigned_realtor_id, result.assigned_director_id)
        .catch(err => console.error('[routing] notification failed:', err));
    }

    crmService.syncLead(leadId).catch(err =>
      console.error('[routing] CRM sync failed:', err)
    );
  },

  /**
   * Resolve the director assigned to a territory.
   * Previously missing from the service — called internally but never defined.
   */
  _getDirectorForTerritory: async (territoryId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('territories')
      .select('director_id')
      .eq('id', territoryId)
      .single();

    return data?.director_id ?? null;
  },
};
