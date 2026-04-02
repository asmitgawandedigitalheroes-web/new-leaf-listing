// Matches listings.status CHECK constraint in schema.sql + migrations_listing_lifecycle.sql.
export type ListingStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'under_contract'
  | 'sold'
  | 'expired'
  | 'rejected';

export type UpgradeType = 'standard' | 'featured' | 'top';

export interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  // territory_id (uuid FK) — not a free-text "territory" column
  territory_id: string | null;
  // realtor_id is the DB column name — not owner_id
  realtor_id: string | null;
  status: ListingStatus;
  // upgrade_type is the DB column — not is_featured/is_top booleans
  upgrade_type: UpgradeType;
  upgrade_expires_at: string | null;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  realtor?: {
    full_name: string;
    email: string;
  };
}

export interface ListingFilters {
  status?: ListingStatus;
  territory_id?: string;
  realtor_id?: string;
  search?: string;
}
