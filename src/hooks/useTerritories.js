import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to manage platform territories and their assigned directors.
 */
export function useTerritories() {
  const [territories, setTerritories] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTerritories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch territories with director info
      const { data: terrData, error: terrError } = await supabase
        .from('territories')
        .select(`
          *,
          director:profiles!fk_territories_director (
            id,
            full_name,
            avatar_url
          )
        `)
        .order('city');

      if (terrError) throw terrError;

      // 2. Fetch counts for each territory (Realtors, Listings, Leads)
      // Note: In a larger app, using a database view or RPC is better.
      const [realtorsRes, listingsRes, leadsRes] = await Promise.all([
        supabase.from('profiles').select('id, territory_id').eq('role', 'realtor'),
        supabase.from('listings').select('id, territory_id'),
        supabase.from('leads').select('id, territory_id')
      ]);

      const realtorsMap = (realtorsRes.data || []).reduce((acc, r) => {
        if (r.territory_id) acc[r.territory_id] = (acc[r.territory_id] || 0) + 1;
        return acc;
      }, {});

      const listingsMap = (listingsRes.data || []).reduce((acc, l) => {
        if (l.territory_id) acc[l.territory_id] = (acc[l.territory_id] || 0) + 1;
        return acc;
      }, {});

      const leadsMap = (leadsRes.data || []).reduce((acc, ld) => {
        if (ld.territory_id) acc[ld.territory_id] = (acc[ld.territory_id] || 0) + 1;
        return acc;
      }, {});

      // 3. Transform for UI
      const transformed = (terrData || []).map(t => ({
        ...t,
        directorName: t.director?.full_name || null,
        directorInitials: t.director?.full_name 
          ? t.director.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          : null,
        realtorsCount: realtorsMap[t.id] || 0,
        listingsCount: listingsMap[t.id] || 0,
        leadsCount: leadsMap[t.id] || 0,
        status: t.director_id ? 'active' : 'unassigned'
      }));

      setTerritories(transformed);

      // 4. Fetch potential directors
      const { data: dirData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'director');
      
      setDirectors(dirData || []);
    } catch (err) {
      console.error('[useTerritories] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerritories();
    const t = setTimeout(() => setIsLoading(false), 10000);
    return () => clearTimeout(t);
  }, [fetchTerritories]);

  const addTerritory = async (formData) => {
    try {
      const { data, error: addError } = await supabase
        .from('territories')
        .insert([formData])
        .select()
        .single();
      if (addError) throw addError;
      await fetchTerritories();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const updateTerritory = async (id, updates) => {
    try {
      const { error: updateError } = await supabase
        .from('territories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      // Always re-fetch so counts and director joins stay accurate
      await fetchTerritories();
      return { data: { id, ...updates }, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const deleteTerritory = async (id) => {
    try {
      const { error: delError } = await supabase
        .from('territories')
        .delete()
        .eq('id', id);
      if (delError) throw delError;
      setTerritories(prev => prev.filter(t => t.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  return { 
    territories, 
    directors, 
    isLoading, 
    error, 
    refresh: fetchTerritories, 
    addTerritory, 
    updateTerritory, 
    deleteTerritory 
  };
}

export default useTerritories;
