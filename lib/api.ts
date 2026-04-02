import { supabase } from '../src/lib/supabase';

// Generic API response interface
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export const adminApi = {
  // Helper for consistent error handling
  async request<T>(promise: Promise<{ data: T | null; error: any }>): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await promise;
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.error('API Error:', err);
      return { data: null, error: err };
    }
  }
};
