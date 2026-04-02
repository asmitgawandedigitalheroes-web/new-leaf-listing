import { supabase } from '../src/lib/supabase';
import { adminApi } from '../lib/api';
import { Territory, TerritoryFilters } from '../types/territory.types';

export const territoryService = {
  /**
   * List territories with optional filters.
   */
  getTerritories: async (filters: TerritoryFilters = {}) => {
    let query = supabase
      .from('territories')
      .select('*, director:profiles!director_id(full_name, email)')
      .order('country', { ascending: true })
      .order('state', { ascending: true });

    if (filters.country) query = query.eq('country', filters.country);
    if (filters.state) query = query.eq('state', filters.state);
    if (filters.director_id) query = query.eq('director_id', filters.director_id);

    return adminApi.request<Territory[]>(query as any);
  },

  /**
   * Fetch a single territory by ID, including aggregate stats.
   */
  getTerritoryById: async (id: string) => {
    const { data: territory, error } = await supabase
      .from('territories')
      .select('*, director:profiles!director_id(full_name, email)')
      .eq('id', id)
      .single();

    if (error || !territory) {
      return { data: null, error };
    }

    // Fetch aggregate counts in parallel
    const [
      { count: realtorCount },
      { count: listingCount },
      { count: leadCount },
    ] = await Promise.all([
      supabase.from('territory_realtors').select('*', { count: 'exact', head: true }).eq('territory_id', id),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('territory_id', id),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('territory_id', id),
    ]);

    return {
      data: {
        ...territory,
        realtor_count: realtorCount ?? 0,
        listing_count: listingCount ?? 0,
        lead_count: leadCount ?? 0,
      } as Territory,
      error: null,
    };
  },

  /**
   * Create a new territory.
   */
  createTerritory: async (data: Omit<Territory, 'id' | 'created_at' | 'director' | 'realtor_count' | 'listing_count' | 'lead_count'>) => {
    return adminApi.request<Territory>(
      supabase
        .from('territories')
        .insert(data)
        .select()
        .single() as any
    );
  },

  /**
   * Update territory fields.
   */
  updateTerritory: async (id: string, data: Partial<Territory>) => {
    return adminApi.request<Territory>(
      supabase
        .from('territories')
        .update(data)
        .eq('id', id)
        .select()
        .single() as any
    );
  },

  /**
   * Assign a director to a territory.
   */
  assignDirector: async (territoryId: string, directorId: string) => {
    return adminApi.request<Territory>(
      supabase
        .from('territories')
        .update({ director_id: directorId })
        .eq('id', territoryId)
        .select()
        .single() as any
    );
  },

  /**
   * Add a realtor to a territory via the territory_realtors join table.
   */
  assignRealtor: async (userId: string, territoryId: string) => {
    return adminApi.request<{ user_id: string; territory_id: string }>(
      supabase
        .from('territory_realtors')
        .upsert({ user_id: userId, territory_id: territoryId }, { onConflict: 'user_id,territory_id' })
        .select()
        .single() as any
    );
  },

  /**
   * List all realtors assigned to a territory.
   */
  getRealtorsByTerritory: async (territoryId: string) => {
    return adminApi.request<Array<{
      user_id: string;
      territory_id: string;
      user: { full_name: string; email: string; role: string; };
    }>>(
      supabase
        .from('territory_realtors')
        .select('*, user:profiles!user_id(full_name, email, role)')
        .eq('territory_id', territoryId) as any
    );
  },

  /**
   * Detect the best-matching territory for a given location.
   * Tries city-level first, then state-level, then country-level.
   * @param location - { country, state, city? }
   */
  detectTerritory: async (location: { country: string; state?: string | null; city?: string | null }): Promise<Territory | null> => {
    // 1. Try city-level match (most specific)
    if (location.city && location.state) {
      const { data: cityMatch } = await supabase
        .from('territories')
        .select('*')
        .eq('country', location.country)
        .eq('state',  location.state)
        .eq('city',   location.city)
        .maybeSingle();

      if (cityMatch) return cityMatch as Territory;
    }

    // 2. Try state-level match: same country + same state + city IS NULL
    if (location.state) {
      const { data: stateMatch } = await supabase
        .from('territories')
        .select('*')
        .eq('country', location.country)
        .eq('state',  location.state)
        .is('city',   null)
        .maybeSingle();

      if (stateMatch) return stateMatch as Territory;
    }

    // 3. BUG-023 fix: country-level fallback MUST filter state IS NULL.
    //
    // Without the state IS NULL filter, this query matched any territory that
    // had no city (i.e., state-level territories from OTHER states), routing
    // leads to the wrong director. Country-level territories are stored with
    // state = NULL (requires territories.state to be nullable — see
    // migrations_routing_fixes.sql step 1).
    const { data: countryMatch } = await supabase
      .from('territories')
      .select('*')
      .eq('country', location.country)
      .is('state',  null)   // BUG-023 fix: only true country-level rows
      .is('city',   null)
      .maybeSingle();

    return (countryMatch as Territory) ?? null;
  },
};
