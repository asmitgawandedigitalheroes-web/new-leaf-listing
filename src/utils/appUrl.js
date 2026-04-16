/**
 * APP_URL — canonical base URL for the application.
 *
 * In production this resolves to VITE_APP_URL (set in .env / Vercel env vars).
 * Falls back to window.location.origin so local development always works
 * without any extra configuration.
 */
export const APP_URL =
  import.meta.env.VITE_APP_URL?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');
