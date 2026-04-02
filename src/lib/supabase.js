import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable the Navigator Web Lock. The default lock serialises all auth
    // operations across browser tabs via navigator.locks.request(), which
    // causes NavigatorLockAcquireTimeoutError in React StrictMode (where
    // effects fire twice) and in single-tab apps where it adds no benefit.
    // A no-op lock is safe here because this app does not need cross-tab
    // auth synchronisation beyond the existing storage-based session sharing.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
})
