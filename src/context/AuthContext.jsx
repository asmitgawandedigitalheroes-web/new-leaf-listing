import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} full_name
 * @property {string} email
 * @property {string} role - 'admin' | 'director' | 'realtor'
 * @property {string} [avatar_url]
 * @property {string} [phone]
 * @property {string} status - 'active' | 'suspended' | 'pending'
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {import('@supabase/supabase-js').User|null} user
 * @property {UserProfile|null} profile
 * @property {string|null} role
 * @property {Object|null} subscription
 * @property {boolean} isLoading
 * @property {function} login
 * @property {function} signup
 * @property {function} logout
 * @property {function} updateProfile
 */

const AuthContext = createContext(/** @type {AuthContextValue} */ ({}));

/**
 * AuthProvider wraps the app and provides auth state + methods to all children.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Prevent concurrent loadUserData calls — only one in-flight at a time
  const loadingRef = React.useRef(false);

  /** Fetch profile and subscription for a given Supabase auth user. */
  const loadUserData = useCallback(async (authUser) => {
    if (loadingRef.current) return null; // already loading, skip
    loadingRef.current = true;
    if (!authUser) {
      setProfile(null);
      setRole(null);
      setSubscription(null);
      loadingRef.current = false;
      return;
    }

    try {
      // Helper for timeout
      const withTimeout = (promise, ms) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
        ]);
      };

      // 1. Fetch profile and subscription in parallel with a 30s timeout
      console.log(`[AuthContext] loadUserData: fetching data for ${authUser.id}...`);
      const start = Date.now();
      
      const [profileRes, subRes] = await withTimeout(Promise.all([
        supabase
          .from('profiles')
          .select(`
            *,
            territory:territories(city, state)
          `)
          .eq('id', authUser.id)
          .maybeSingle()
          .then(res => {
            console.log(`[AuthContext] Profile fetch took ${Date.now() - start}ms`);
            return res;
          }),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .maybeSingle()
          .then(res => {
            console.log(`[AuthContext] Subscription fetch took ${Date.now() - start}ms`);
            return res;
          })
      ]), 10000); // H-1 fix: reduced from 30s to 10s

      // If the API returns 400 it means the JWT is malformed/corrupted (not just
      // expired — expired = 401). A malformed token causes auth.uid() to return
      // NULL in Postgres, making every RLS policy fail silently. Force sign-out
      // so the user lands on the login page with a clean session.
      if (profileRes.error?.status === 400) {
        console.warn('[AuthContext] Bad JWT detected (HTTP 400). Forcing sign-out.');
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setRole(null);
        setSubscription(null);
        return null;
      }

      // 2. Fallback: If profile by ID is not found, try searching by email.
      // This is common for demo accounts where placeholder UUIDs in seed data
      // don't match the actual Supabase Auth IDs.
      let finalProfile = profileRes.data;
      if (!finalProfile) {
        console.warn(`[AuthContext] Profile not found for ID ${authUser.id}. Attempting email fallback...`);
        const { data: emailData, error: emailError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', authUser.email)
          .single();

        if (!emailError && emailData) {
          console.info('[AuthContext] Profile successfully recovered via email match.');
          finalProfile = emailData;
        }
      }

      // BUG-009: REMOVED metadata role fallback.
      // authUser.user_metadata is writable by the client at signup time.
      // Trusting it for role resolution allows privilege escalation.
      // If no DB profile exists the user is treated as unauthenticated until
      // their profile row is created (e.g., after email confirmation).
      if (!finalProfile?.role) {
        console.warn('[AuthContext] Profile missing role. Treating as unauthenticated.');
      }

      if (profileRes.error && !finalProfile && profileRes.error.code !== 'PGRST116') {
        console.error('[AuthContext] Profile fetch error:', profileRes.error);
      } else {
        console.log(`[AuthContext] Setting profile and role:`, { 
          id: authUser.id, 
          email: authUser.email, 
          role: finalProfile?.role 
        });
        setProfile(finalProfile);
        setRole(finalProfile?.role ?? null);
      }

      if (subRes.error) {
        console.error('[AuthContext] Subscription fetch error:', subRes.error);
      } else {
        setSubscription(subRes.data);
      }
      return finalProfile;
    } catch (err) {
      const isTimeout = err.message === 'Timeout';
      console.error('[AuthContext] loadUserData error:', isTimeout ? `Request timed out after 10s` : err);
      return null;
    } finally {
      loadingRef.current = false;
    }
  }, []);

  /** Bootstrap: check existing session on mount and listen to auth state changes. */
  useEffect(() => {
    // Supabase v2 recommended pattern: use ONLY onAuthStateChange for all auth state,
    // including initial session detection via the INITIAL_SESSION event.
    //
    // Why not getSession():
    //   • It acquires a Navigator Web Lock internally. In React StrictMode, the
    //     effect runs twice and two concurrent getSession() calls fight for the
    //     same lock, causing NavigatorLockAcquireTimeoutError.
    //   • INITIAL_SESSION is fired synchronously when onAuthStateChange is first
    //     registered, giving us the stored session without a separate round-trip.
    let mounted = true;

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          setUser(session?.user ?? null);
          if (session?.user) {
            // Skip re-fetching profile on token refresh — fires every ~60 min or
            // rapidly on flaky connections; loadUserData times out in those cases.
            // Also skip repeated SIGNED_IN events if profile already loaded (prevents
            // thundering-herd from invalid refresh token retry loops).
            const skipRefetch = event === 'TOKEN_REFRESHED';
            if (!skipRefetch) {
              await loadUserData(session.user);
            }
          } else {
            // No user — clear profile state and stop loading
            setProfile(null);
            setRole(null);
            setSubscription(null);
          }
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setRole(null);
          setSubscription(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.unsubscribe();
    };
  }, [loadUserData]);

  /**
   * Log in with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{error: Error|null}>}
   */
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setIsLoading(false);
        return { error, profile: null };
      }

      const profileData = await loadUserData(data.user);
      return { error: null, profile: profileData };
    } catch (err) {
      console.error('[AuthContext] Login unexpected error:', err);
      return { error: err, profile: null };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign up a new user.
   * @param {Object} signupData
   * @param {string} signupData.email
   * @param {string} signupData.password
   * @param {string} signupData.full_name
   * @param {string} [signupData.role] - default 'realtor'
   * @param {string} [signupData.phone]
   * @param {string} [signupData.company]
   * @returns {Promise<{data: any, error: Error|null}>}
   */
  const signup = async ({ email, password, full_name, company = null, phone = null, country = null, state = null, city = null, role = 'realtor' }) => {
    setIsLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // BUG-009 prevention: do NOT store role in user_metadata.
        // Only non-privileged display fields go here.
        data: { full_name },
      },
    });

    if (authError) {
      setIsLoading(false);
      return { data: null, error: authError };
    }

    // Create profile row
    if (authData.user) {
      console.log(`[AuthContext] Creating profile for ${email} with role: ${role}`);
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name,
          company,
          role,  // Support flexible roles (defaults to realtor)
          phone,
          country,
          state,
          city,
          status: 'pending',
          accepted_terms_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('[AuthContext] Profile creation failed:', profileError);
      }

      await loadUserData(authData.user);
    }

    setIsLoading(false);
    return { data: authData, error: null };
  };

  /**
   * Log out the current user.
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setRole(null);
      setSubscription(null);
      setIsLoading(false);
      // Ensure all storage is cleared to prevent "ghost" sessions
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('supabase.auth.token');
        window.sessionStorage.clear();
      }
    }
  };

  /**
   * Update the current user's profile fields.
   * @param {Partial<UserProfile>} updates
   * @returns {Promise<{data: UserProfile|null, error: Error|null}>}
   */
  const updateProfile = async (updates) => {
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select();

    if (!error) {
      const updated = (data && data.length > 0) ? data[0] : null;
      if (updated) {
        setProfile(updated);
        if (updated.role) setRole(updated.role);
      } else {
        // Row updated but not returned — re-fetch profile
        const { data: fresh } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (fresh) {
          setProfile(fresh);
          if (fresh.role) setRole(fresh.role);
        }
      }
    }

    return { data: data?.[0] ?? null, error };
  };

  const value = {
    user,
    profile,
    role,
    subscription,
    isLoading,
    login,
    signup,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * Must be used inside <AuthProvider>.
 * @returns {AuthContextValue}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
