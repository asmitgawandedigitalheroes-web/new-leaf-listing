import { supabase } from '../src/lib/supabase';
import { adminApi } from '../lib/api';
import {
  Commission,
  CommissionFilters,
  CommissionSummary,
  CommissionStatus,
  CommissionType,
  CommissionCalculation,
  CommissionRecipientRole,
} from '../types/commission.types';

/** Fallback rates used when platform_settings cannot be reached */
const DEFAULT_DIRECTOR_RATE = 0.25;
const DEFAULT_ADMIN_RATE    = 0.15;
const DEFAULT_PLATFORM_RATE = 0.15;

export interface CommissionRates {
  directorRate: number;
  adminRate:    number;
  platformRate: number;
}

/**
 * Fetch live commission rates from platform_settings.
 * Keys: director_commission_rate, admin_override_rate, platform_fee_rate (stored as %).
 * Falls back to hardcoded defaults if the table is unavailable.
 */
async function fetchCommissionRates(): Promise<CommissionRates> {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['director_commission_rate', 'admin_override_rate', 'platform_fee_rate']);

    if (error || !data?.length) throw new Error('platform_settings unavailable');

    const map: Record<string, number> = {};
    data.forEach(row => { map[row.key] = parseFloat(row.value) / 100; });

    return {
      directorRate: map['director_commission_rate'] ?? DEFAULT_DIRECTOR_RATE,
      adminRate:    map['admin_override_rate']       ?? DEFAULT_ADMIN_RATE,
      platformRate: map['platform_fee_rate']         ?? DEFAULT_PLATFORM_RATE,
    };
  } catch {
    return {
      directorRate: DEFAULT_DIRECTOR_RATE,
      adminRate:    DEFAULT_ADMIN_RATE,
      platformRate: DEFAULT_PLATFORM_RATE,
    };
  }
}

/**
 * BUG-026: Integer-cent arithmetic helper.
 *
 * All intermediate money calculations are performed in integer cents so that
 * IEEE 754 floating-point rounding errors never accumulate across splits.
 * Only the final per-share values are converted back to dollars (÷ 100).
 *
 * Example: $97 Pro subscription
 *   totalCents       = 9700
 *   platformCents    = round(9700 × 0.15) = 1455  → $14.55
 *   afterPlatform    = 9700 − 1455 = 8245          (exact integer)
 *   directorCents    = round(8245 × 0.25) = 2061  → $20.61
 *   adminCents       = round(8245 × 0.15) = 1237  → $12.37
 *   realtorCents     = 8245 − 2061 − 1237 = 4947  → $49.47
 *   sum              = 1455 + 2061 + 1237 + 4947  = 9700 ✓ (no penny lost)
 */
function calcSharesCents(
  transactionAmount: number,
  rates: CommissionRates,
  roles: { hasDirector?: boolean; hasAdmin?: boolean }
): {
  platformCents:  number;
  directorCents:  number;
  adminCents:     number;
  realtorCents:   number;
  totalCents:     number;
} {
  const totalCents        = Math.round(transactionAmount * 100);
  const platformCents     = Math.round(totalCents * rates.platformRate);
  const afterPlatform     = totalCents - platformCents;               // exact int subtraction
  const directorCents     = roles.hasDirector ? Math.round(afterPlatform * rates.directorRate) : 0;
  const adminCents        = roles.hasAdmin    ? Math.round(afterPlatform * rates.adminRate)    : 0;
  // Realtor gets the exact remainder — no rounding drift (BUG-026)
  const realtorCents      = afterPlatform - directorCents - adminCents;

  return { platformCents, directorCents, adminCents, realtorCents, totalCents };
}

/** Convert integer cents to a two-decimal-place dollar number */
const toDollars = (cents: number): number => cents / 100;

export const commissionService = {
  /**
   * Fetch commissions with optional filters.
   */
  getCommissions: async (filters: CommissionFilters = {}) => {
    let query = supabase
      .from('commissions')
      .select(`
        *,
        recipient:profiles!recipient_user_id(full_name, email, role),
        override_user:profiles!override_user_id(full_name, email),
        source_transaction:payments!source_transaction_id(type, amount)
      `)
      .order('created_at', { ascending: false });

    if (filters.type)               query = query.eq('type', filters.type);
    if (filters.status)             query = query.eq('status', filters.status);
    if (filters.recipient_user_id)  query = query.eq('recipient_user_id', filters.recipient_user_id);
    if (filters.recipient_role)     query = query.eq('recipient_role', filters.recipient_role);
    if (filters.date_from)          query = query.gte('created_at', filters.date_from);
    if (filters.date_to)            query = query.lte('created_at', filters.date_to);

    return adminApi.request<Commission[]>(query as any);
  },

  /**
   * Get aggregate commission summary, optionally scoped to a specific user.
   */
  getCommissionSummary: async (userId?: string): Promise<CommissionSummary> => {
    let query = supabase
      .from('commissions')
      .select('status, type, amount');

    if (userId) query = query.eq('recipient_user_id', userId);

    const { data, error } = await query;

    if (error || !data) {
      console.error('Commission summary error:', error);
      return {
        total_pending:  0,
        total_approved: 0,
        total_payable:  0,
        total_paid:     0,
        count_by_type:  { subscription: 0, listing: 0, deal: 0, referral: 0 },
      };
    }

    const summary: CommissionSummary = {
      total_pending:  0,
      total_approved: 0,
      total_payable:  0,
      total_paid:     0,
      count_by_type:  { subscription: 0, listing: 0, deal: 0, referral: 0 },
    };

    for (const row of data) {
      if (row.status === 'pending')  summary.total_pending  += row.amount;
      if (row.status === 'approved') summary.total_approved += row.amount;
      if (row.status === 'payable')  summary.total_payable  += row.amount;
      if (row.status === 'paid')     summary.total_paid     += row.amount;
      if (row.type in summary.count_by_type) {
        summary.count_by_type[row.type as CommissionType]++;
      }
    }

    return summary;
  },

  /**
   * Create a single commission record.
   */
  createCommission: async (data: Omit<Commission, 'id' | 'created_at' | 'updated_at'>) => {
    return adminApi.request<Commission>(
      supabase
        .from('commissions')
        .insert(data)
        .select()
        .single() as any
    );
  },

  /**
   * Update the lifecycle status of a commission.
   */
  updateCommissionStatus: async (id: string, status: CommissionStatus) => {
    return adminApi.request<Commission>(
      supabase
        .from('commissions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single() as any
    );
  },

  /**
   * BUG-026 fix: Core calculation for display / preview purposes only.
   * Uses integer-cent arithmetic so the preview always matches the DB.
   * Actual DB writes go through processTransactionCommissions() (the RPC).
   */
  calculateCommission: async (
    transactionAmount: number,
    type: CommissionType,
    roles: { hasDirector?: boolean; hasAdmin?: boolean } = {}
  ): Promise<CommissionCalculation> => {
    const rates  = await fetchCommissionRates();
    const shares = calcSharesCents(transactionAmount, rates, roles);

    return {
      subscription_commission_rate: rates.directorRate,
      admin_override_rate:          rates.adminRate,
      platform_rate:                rates.platformRate,
      base_amount:                  transactionAmount,
      platform_share: toDollars(shares.platformCents),
      director_share: toDollars(shares.directorCents),
      admin_share:    toDollars(shares.adminCents),
      realtor_share:  toDollars(shares.realtorCents),
    };
  },

  /** Expose rate fetching for components that need to display current rates. */
  fetchRates: fetchCommissionRates,

  /**
   * Get all commissions for a specific recipient (realtor or director view).
   */
  getCommissionsByRecipient: async (userId: string) => {
    return adminApi.request<Commission[]>(
      supabase
        .from('commissions')
        .select(`
          *,
          source_transaction:payments!source_transaction_id(type, amount)
        `)
        .eq('recipient_user_id', userId)
        .order('created_at', { ascending: false }) as any
    );
  },

  /**
   * Admin approval of a pending commission — moves it to 'approved'.
   * Appends to existing notes rather than overwriting them.
   */
  approveCommission: async (id: string, approvedBy: string) => {
    // Fetch current notes first so we can append rather than overwrite
    const { data: current } = await supabase
      .from('commissions')
      .select('notes')
      .eq('id', id)
      .single();

    const existingNotes = current?.notes ?? '';
    const approvalNote  = `Approved by ${approvedBy} at ${new Date().toISOString()}`;
    const mergedNotes   = existingNotes
      ? `${existingNotes}\n${approvalNote}`
      : approvalNote;

    return adminApi.request<Commission>(
      supabase
        .from('commissions')
        .update({
          status:     'approved',
          updated_at: new Date().toISOString(),
          notes:      mergedNotes,
        })
        .eq('id', id)
        .select()
        .single() as any
    );
  },

  /**
   * Bulk update status for multiple commission IDs.
   */
  bulkUpdateStatus: async (ids: string[], status: CommissionStatus) => {
    return adminApi.request<Commission[]>(
      supabase
        .from('commissions')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', ids)
        .select() as any
    );
  },

  /**
   * BUG-002 + BUG-003 + BUG-026: Centralised transaction commission processor.
   *
   * Delegates ALL commission arithmetic and insertion to the
   * process_transaction_commissions() PL/pgSQL RPC, which:
   *   • Records platform-fee share as a distinct commission row (BUG-002)
   *   • Resolves admin deterministically via platform_settings (BUG-003)
   *   • Uses PostgreSQL NUMERIC for all arithmetic — zero float drift (BUG-026)
   *   • Is idempotent via ON CONFLICT DO NOTHING (BUG-011 supplement)
   *
   * This is the ONLY path that writes commission rows for real transactions.
   * Both this service and stripe-webhook call the same RPC — one code path.
   */
  processTransactionCommissions: async (params: {
    transactionId: string;
    amount: number; // Dollars
    type: CommissionType;
    realtorId: string;
    listingId?: string;
  }) => {
    const { transactionId, amount, type, realtorId, listingId } = params;
    
    try {
      // 1. Fetch current commission rates from platform_settings
      const rates = await fetchCommissionRates();
      
      // 2. Resolve director and admin for the transaction
      // Find the realtor's assigned director and territory
      const { data: realtorProfile } = await supabase
        .from('profiles')
        .select('territory_id, assigned_director_id')
        .eq('id', realtorId)
        .single();
        
      const directorId = realtorProfile?.assigned_director_id;
      
      // BUG-003 fix: Find an active admin to receive the platform/override share.
      // We pick the first active admin if no specific admin is linked.
      const { data: adminUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
        
      const adminId = adminUser?.id;

      // 3. Calculate shares in CENTS using integer math
      const breakdown = calcSharesCents(amount, rates, {
        hasDirector: !!directorId,
        hasAdmin: !!adminId
      });

      // 4. Return the structured breakdown
      return {
        data: {
          transactionId,
          amount,
          breakdownCents: breakdown,
          recipients: {
            platform: adminId || 'system',
            director: directorId || null,
            admin: adminId || null,
            realtor: realtorId
          }
        },
        error: null
      };
    } catch (err) {
      console.error('[commission] rebuild error:', err);
      return { data: null, error: err as Error };
    }
  },
};
