export interface Territory {
  id: string;
  country: string;
  state: string;
  city: string | null;
  director_id: string | null;
  created_at: string;
  director?: { full_name: string; email: string; };
  realtor_count?: number;
  listing_count?: number;
  lead_count?: number;
}

export interface TerritoryFilters {
  country?: string;
  state?: string;
  director_id?: string;
}

export interface TerritoryAssignment {
  territory_id: string;
  user_id: string;
  role: 'director' | 'realtor';
}
