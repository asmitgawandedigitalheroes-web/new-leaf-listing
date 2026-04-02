// Matches the leads.status CHECK constraint in schema.sql exactly.
// 'closed' and 'qualified' are NOT valid DB values — use 'converted' for won deals.
export type LeadStatus =
  | 'new'
  | 'assigned'
  | 'contacted'
  | 'showing'
  | 'offer'
  | 'converted'
  | 'lost';

export interface Lead {
  id: string;
  source: string | null;
  territory_id: string | null;      // uuid FK → territories.id
  assigned_realtor_id: string | null;
  assigned_director_id: string | null;
  status: LeadStatus;
  lock_until: string | null;
  contact_name: string | null;
  contact_masked_email: string | null;
  listing_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadFilters {
  source?: string;
  territory_id?: string;
  assigned_realtor_id?: string;
  status?: LeadStatus;
}
