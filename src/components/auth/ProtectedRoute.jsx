import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { APP_URL } from '../../utils/appUrl';

const GOLD  = '#D4AF37';
const GREEN = '#1F4D3A';

/**
 * Full-page loading spinner shown while auth state is resolving.
 */
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading"
        />
        <p className="text-sm text-gray-500">Checking authentication...</p>
      </div>
    </div>
  );
}

/**
 * Shown when the signed-in user's email address has not been confirmed yet.
 */
function EmailVerificationRequired({ email }) {
  const { logout } = useAuth();
  const [resent, setResent]     = useState(false);
  const [sending, setSending]   = useState(false);
  const [resendErr, setResendErr] = useState('');

  const handleResend = async () => {
    setSending(true);
    setResendErr('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${APP_URL}/login` },
    });
    setSending(false);
    if (error) {
      setResendErr(error.message);
    } else {
      setResent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center"
        style={{ boxShadow: '0 8px 32px rgba(26,32,44,0.08)' }}
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(212,175,55,0.1)', border: `1.5px solid rgba(212,175,55,0.3)` }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <h1 className="text-xl font-black text-gray-900 mb-2">Verify Your Email Address</h1>

        <p className="text-sm text-gray-500 leading-relaxed mb-1">
          We sent a confirmation link to:
        </p>
        <p className="text-sm font-semibold text-gray-800 mb-6 break-all">{email}</p>

        <div
          className="rounded-xl px-5 py-4 mb-6 text-left text-xs leading-relaxed text-gray-600"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
        >
          <p className="font-semibold text-gray-700 mb-1">Next steps:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open the email from <strong>NLV Listings</strong></li>
            <li>Click the <strong>"Confirm Email"</strong> link</li>
            <li>Return here and sign in</li>
          </ol>
          <p className="mt-2 text-gray-400">Check your spam or promotions folder if you don't see it.</p>
        </div>

        {resent ? (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
            style={{ background: 'rgba(31,77,58,0.08)', color: GREEN, border: `1px solid rgba(31,77,58,0.2)` }}
          >
            ✓ Confirmation email resent — check your inbox.
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="w-full py-2.5 rounded-xl text-sm font-bold mb-3 transition-all disabled:opacity-50"
            style={{ background: GOLD, color: '#fff' }}
            onMouseEnter={e => { if (!sending) e.currentTarget.style.background = '#B8962E'; }}
            onMouseLeave={e => { if (!sending) e.currentTarget.style.background = GOLD; }}
          >
            {sending ? 'Sending…' : 'Resend Confirmation Email'}
          </button>
        )}

        {resendErr && (
          <p className="text-xs text-red-500 mb-3">{resendErr}</p>
        )}

        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
        >
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
}

/**
 * 403 Forbidden page shown when a user lacks the required role.
 */
function ForbiddenPage({ currentRole, allowedRoles }) {
  const isUnknown = !currentRole || currentRole === 'unknown';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md text-center px-6 py-10 bg-white rounded-xl shadow-md border border-gray-100">
        <div className="text-6xl mb-6 font-headline font-black text-gray-200">403</div>
        <h1 className="text-2xl font-headline font-black text-gray-800 mb-3">Access Denied</h1>

        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6 inline-block border border-red-100">
          {isUnknown ? (
            <p>Your profile role could not be identified. Please ensure your account is fully set up.</p>
          ) : (
            <p>
              Your role (<strong>{currentRole}</strong>) does not have permission to view this page.
            </p>
          )}
        </div>

        {allowedRoles && allowedRoles.length > 0 && (
          <p className="text-gray-400 text-[11px] uppercase tracking-widest font-semibold mb-8">
            Access restricted to: {allowedRoles.join(', ')}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <a
            href="/"
            className="w-full px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            Return to Homepage
          </a>
          <a
            href="/login"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
          >
            Try signing in with a different account
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute — guards a route against unauthenticated or unauthorized access.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - the route content to render if allowed
 * @param {string[]} [props.allowedRoles] - if provided, only these roles may access the route.
 *   If omitted, any authenticated user is permitted.
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, profile, isLoading } = useAuth();
  const location = useLocation();

  // 1. Show spinner while auth is resolving
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 2. Redirect to /login if not authenticated, preserving the intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Email verification gate — show friendly screen instead of blank/spinner
  //    Supabase sets email_confirmed_at once the user clicks the confirmation link.
  const emailConfirmed = !!(user.email_confirmed_at || user.confirmed_at);
  if (!emailConfirmed) {
    return <EmailVerificationRequired email={user.email} />;
  }

  // 4. Check role access if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0) {
    // If user is authenticated but role hasn't resolved yet, wait for it
    if (!role) {
      return <LoadingSpinner />;
    }
    if (!allowedRoles.includes(role)) {
      return <ForbiddenPage currentRole={role} allowedRoles={allowedRoles} />;
    }
  }

  // 5. Status gating — admins bypass; only affects realtors/directors
  //    pending  → hold on the approval waiting page
  //    suspended → blocked page
  if (role !== 'admin' && !location.pathname.startsWith('/onboarding')) {
    if (profile?.status === 'pending') {
      return <Navigate to="/onboarding/pending" replace />;
    }
    if (profile?.status === 'suspended') {
      return <Navigate to="/onboarding/suspended" replace />;
    }
  }

  // 6. Render the protected content
  return children;
}

export default ProtectedRoute;
