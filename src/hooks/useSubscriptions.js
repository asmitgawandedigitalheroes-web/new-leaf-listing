import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to manage user subscriptions with real Supabase data.
 * Redirects to Stripe Checkout for subscription management.
 */
export function useSubscriptions() {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      setSubscription(data || null);
    } catch (err) {
      console.error('[useSubscriptions] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription, user]);

  /**
   * Redirect the user to Stripe Checkout to purchase a plan.
   * Calls a Supabase Edge Function to create the session.
   */
  const createCheckoutSession = async (planKey, options = {}) => {
    setIsLoading(true);
    try {
      // 1. Call the edge function
      // options.invitedFlow = true tells the edge function to use pricing-page
      // success/cancel URLs instead of the billing page URLs.
      const { data, error: sessionError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planKey,
          userId: user.id,
          userEmail: user.email,
          fullName: profile?.full_name || 'User',
          invitedFlow: options.invitedFlow === true,
        },
      });

      if (sessionError) throw sessionError;

      // 2. Redirect to Stripe Checkout URL
      if (data?.url) {
        window.location.assign(data.url);
      } else {
        throw new Error('No checkout URL returned from server.');
      }
    } catch (err) {
      console.error('[useSubscriptions] Checkout session error:', err);
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    subscription,
    isLoading,
    error,
    refresh: fetchSubscription,
    createCheckoutSession,
  };
}

export default useSubscriptions;
