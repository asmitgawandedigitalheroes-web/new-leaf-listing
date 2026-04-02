export type CommissionType   = 'subscription' | 'listing' | 'deal' | 'referral';
export type CommissionStatus = 'pending' | 'approved' | 'payable' | 'paid';

/**
 * BUG-002 / BUG-003: Identifies which share a commission record represents.
 * Stored in commissions.recipient_role (see migrations_commission_fixes.sql).
 * The unique index uq_commissions_tx_type_role ensures exactly one row per
 * (source_transaction_id, type, recipient_role) so platform records cannot
 * collide with admin-override records even when the same user holds both roles.
 */
export type CommissionRecipientRole = 'realtor' | 'director' | 'admin' | 'platform';

export interface Commission {
  id:                   string;
  type:                 CommissionType;
  amount:               number;
  source_transaction_id: string | null;
  recipient_user_id:    string;
  recipient_role:       CommissionRecipientRole;
  override_user_id:     string | null;
  status:               CommissionStatus;
  created_at:           string;
  updated_at:           string;
  recipient?:           { full_name: string; email: string; role: string; };
  override_user?:       { full_name: string; email: string; };
  source_transaction?:  { type: string; amount: number; };
  notes?:               string | null;
  property?:            string | null;
  listing_id?:          string | null;
}

export interface CommissionFilters {
  type?:               CommissionType;
  status?:             CommissionStatus;
  recipient_user_id?:  string;
  recipient_role?:     CommissionRecipientRole;
  date_from?:          string;
  date_to?:            string;
}

export interface CommissionSummary {
  total_pending:  number;
  total_approved: number;
  total_payable:  number;
  total_paid:     number;
  count_by_type:  Record<CommissionType, number>;
}

/**
 * BUG-026: All share values here are computed with integer-cent arithmetic
 * (see calcSharesCents in commission.service.ts) so they match PostgreSQL
 * NUMERIC results from the process_transaction_commissions() RPC exactly.
 */
export interface CommissionCalculation {
  subscription_commission_rate: number;   // director rate (e.g. 0.25)
  admin_override_rate:          number;   // admin rate   (e.g. 0.15)
  platform_rate:                number;   // platform fee (e.g. 0.15)
  base_amount:                  number;   // gross transaction amount
  platform_share:               number;   // 15% of base_amount
  director_share:               number;   // 25% of after-platform
  admin_share:                  number;   // 15% of after-platform
  realtor_share:                number;   // exact remainder
}
