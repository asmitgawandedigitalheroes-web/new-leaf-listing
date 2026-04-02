import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
 *
 * @example
 * // Any authenticated user
 * <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 *
 * // Admin only
 * <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
 *
 * // Admin or director
 * <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'director']}><Reports /></ProtectedRoute>} />
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  // 1. Show spinner while auth is resolving
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 2. Redirect to /login if not authenticated, preserving the intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Check role access if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return <ForbiddenPage currentRole={role} allowedRoles={allowedRoles} />;
    }
  }

  // 4. Render the protected content
  return children;
}

export default ProtectedRoute;
