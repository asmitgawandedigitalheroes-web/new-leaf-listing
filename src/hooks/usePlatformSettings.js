import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to manage platform-wide settings stored in Supabase.
 */
export function usePlatformSettings() {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('platform_settings')
        .select('*');

      if (fetchError) throw fetchError;

      // Group by key: { key: value, ... }
      const settingsObj = (data || []).reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});

      setSettings(settingsObj);
    } catch (err) {
      console.error('[usePlatformSettings] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    const t = setTimeout(() => setIsLoading(false), 10000);
    return () => clearTimeout(t);
  }, [fetchSettings]);

  const updateSetting = async (key, value) => {
    try {
      const { data, error: updateError } = await supabase
        .from('platform_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() })
        .select();
      if (updateError) throw updateError;
      // Always optimistically update local state regardless of returned rows
      setSettings(prev => ({ ...prev, [key]: value }));
      return { data: (data && data.length > 0) ? data[0] : { key, value }, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  /**
   * Bulk update settings.
   * @param {Object} batch - { key1: val1, key2: val2, ... }
   */
  const updateBatch = async (batch) => {
    const rows = Object.entries(batch).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString()
    }));
    try {
      const { error: batchError } = await supabase
        .from('platform_settings')
        .upsert(rows);
      if (batchError) throw batchError;
      
      setSettings(prev => ({ ...prev, ...batch }));
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  return { 
    settings, 
    isLoading, 
    error, 
    refresh: fetchSettings, 
    updateSetting, 
    updateBatch 
  };
}

export default usePlatformSettings;
