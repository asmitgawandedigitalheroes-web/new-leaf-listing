export type UserRole = 'admin' | 'director' | 'realtor';

// Matches profiles.status CHECK constraint: ('active','pending','suspended').
// 'rejected' is NOT a valid DB value — it would fail the CHECK constraint.
export type AccountStatus = 'pending' | 'active' | 'suspended';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  status: AccountStatus;
  territory_id: string | null;   // uuid FK → territories.id (not a text 'territory' column)
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  license_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFilters {
  role?: UserRole;
  status?: AccountStatus;
  territory_id?: string;
  search?: string;
}
