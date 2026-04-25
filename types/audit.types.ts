export type AuditAction =
  | 'user.created' | 'user.updated' | 'user.deleted' | 'user.approved' | 'user.suspended'
  | 'listing.created' | 'listing.updated' | 'listing.approved' | 'listing.rejected' | 'listing.upgraded'
  | 'lead.created' | 'lead.assigned' | 'lead.status_changed' | 'lead.converted'
  | 'commission.created' | 'commission.approved' | 'commission.paid'
  | 'subscription.created' | 'subscription.upgraded' | 'subscription.cancelled'
  | 'payment.succeeded' | 'payment.failed'
  | 'territory.assigned' | 'territory.updated'
  | 'auth.login' | 'auth.logout'
  | 'contract.signed';

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  timestamp: string;
  metadata: Record<string, any> | null;
  user?: { full_name: string; email: string; role: string; };
}

export interface AuditFilters {
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  action?: AuditAction;
  date_from?: string;
  date_to?: string;
}
