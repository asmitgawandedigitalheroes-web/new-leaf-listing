import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// Tier priority for sort: lower number = displayed first
const TIER_PRIORITY = { top: 1, featured: 2, standard: 3 };

/**
 * Public listings hook — does NOT require authentication.
 * Used by BrowseListings and the public marketplace.
 *
 * Only fetches listings with status = 'active' or 'under_contract'.
 * Applies priority sort: top → featured → standard → newest within each tier.
 *
 * @param {object} filters
 * @param {string} filters.search       - Title/city/address search (ilike)
 * @param {string} filters.upgradeType  - 'all' | 'featured' | 'top'
 * @param {number} filters.minPrice
 * @param {number} filters.maxPrice
 * @param {string} filters.propertyType - 'Any Type' or specific type
 * @param {boolean} filters.includeUnderContract - include under_contract listings (default true)
 */
export function usePublicListings(filters = {}) {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Base query — only publicly visible statuses
      let query = supabase
        .from('listings')
        .select(`
          *,
          realtor:profiles!listings_realtor_id_fkey(full_name, email, avatar_url),
          territory:territories(city, state)
        `)
        .in('status', ['active', 'under_contract']);

      if (filters.search) {
        // Search title, city, or address
        query = query.or(
          `title.ilike.%${filters.search}%,city.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
        );
      }

      if (filters.upgradeType && filters.upgradeType !== 'all') {
        query = query.eq('upgrade_type', filters.upgradeType);
      }

      if (filters.propertyType && filters.propertyType !== 'Any Type') {
        query = query.eq('property_type', filters.propertyType);
      }

      if (filters.minPrice != null && filters.minPrice !== '') {
        query = query.gte('price', Number(filters.minPrice));
      }

      if (filters.maxPrice != null && filters.maxPrice !== '') {
        query = query.lte('price', Number(filters.maxPrice));
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Apply priority sort client-side:
      // 1. Top tier first
      // 2. Featured second
      // 3. Standard last
      // 4. Within each tier, newest first
      const sorted = (data || []).sort((a, b) => {
        const tierA = TIER_PRIORITY[a.upgrade_type] ?? 3;
        const tierB = TIER_PRIORITY[b.upgrade_type] ?? 3;
        if (tierA !== tierB) return tierA - tierB;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setListings(sorted);
    } catch (err) {
      console.error('[usePublicListings] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.search,
    filters.upgradeType,
    filters.propertyType,
    filters.minPrice,
    filters.maxPrice,
  ]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return { listings, isLoading, error, refresh: fetchListings };
}

export default usePublicListings;
