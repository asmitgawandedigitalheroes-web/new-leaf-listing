import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to fetch a single listing by ID.
 */
export function useListing(id) {
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchListing = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('listings')
        .select(`
          *,
          realtor:profiles!listings_realtor_id_fkey(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setListing(data);
    } catch (err) {
      console.error('[useListing] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  return {
    listing,
    isLoading,
    error,
    refresh: fetchListing,
  };
}

export default useListing;
