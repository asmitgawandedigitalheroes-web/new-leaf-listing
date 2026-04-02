import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// ── Public pages ──────────────────────────────────────────────────
import HomePage        from './pages/public/HomePage';
import BrowseListings  from './pages/public/BrowseListings';
import PricingPage     from './pages/public/PricingPage';
import AboutPage       from './pages/public/AboutPage';
import ContactPage     from './pages/public/ContactPage';

// ── Auth pages ────────────────────────────────────────────────────
import LoginPage         from './pages/auth/LoginPage';
import SignupPage        from './pages/auth/SignupPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// ── Legal pages ───────────────────────────────────────────────────
import TermsOfService from './pages/legal/TermsOfService';
import PrivacyPolicy  from './pages/legal/PrivacyPolicy';
import PlatformRules  from './pages/legal/PlatformRules';
import FullContracts  from './pages/legal/FullContracts';

// ── Legacy /app/* routes (kept for backwards compat) ──────────────
import AdminDashboard    from './pages/app/AdminDashboard';
import DirectorDashboard from './pages/app/DirectorDashboard';
import RealtorDashboard  from './pages/app/RealtorDashboard';
import ListingsPage      from './pages/app/ListingsPage';
import LeadsPage         from './pages/app/LeadsPage';
import CommissionsPage   from './pages/app/CommissionsPage';
import BillingPage       from './pages/app/BillingPage';

// ── Admin pages ───────────────────────────────────────────────────
import TerritoriesPage      from './pages/app/admin/TerritoriesPage';
import SubscriptionsPage    from './pages/app/admin/SubscriptionsPage';
import CommissionsAdminPage from './pages/app/admin/CommissionsAdminPage';
import AuditLogPage         from './pages/app/admin/AuditLogPage';
import UsersPage            from './pages/app/admin/UsersPage';
import SettingsPage         from './pages/app/admin/SettingsPage';
import AdminPricingPage     from './pages/app/admin/PricingPage';

// ── Director pages ────────────────────────────────────────────────
import DirectorLeadsPage       from './pages/app/director/DirectorLeadsPage';
import DirectorRealtorsPage    from './pages/app/director/DirectorRealtorsPage';
import DirectorCommissionsPage from './pages/app/director/DirectorCommissionsPage';
import DirectorReportsPage     from './pages/app/director/DirectorReportsPage';

// ── Realtor pages ─────────────────────────────────────────────────
import RealtorListingsPage    from './pages/app/realtor/RealtorListingsPage';
import RealtorLeadsPage       from './pages/app/realtor/RealtorLeadsPage';
import RealtorCommissionsPage from './pages/app/realtor/RealtorCommissionsPage';
import RealtorProfilePage     from './pages/app/realtor/RealtorProfilePage';
import RealtorMessagesPage    from './pages/app/realtor/RealtorMessagesPage';
import RealtorReferralsPage   from './pages/app/realtor/RealtorReferralsPage';

// ── Listing detail + edit ─────────────────────────────────────────
import ListingDetail   from './pages/app/ListingDetail';
import ListingEditPage from './pages/app/ListingEditPage';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>

            {/* ── Public ──────────────────────────────────────── */}
            <Route path="/"                element={<HomePage />} />
            <Route path="/browse"          element={<BrowseListings />} />
            <Route path="/listing/:id"     element={<ListingDetail />} />
            <Route path="/pricing"         element={<PricingPage />} />
            <Route path="/about"   element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy"   element={<PrivacyPolicy />} />
            <Route path="/platform-rules"   element={<PlatformRules />} />
            <Route path="/full-contracts"   element={
              <ProtectedRoute allowedRoles={['admin', 'director']}>
                <FullContracts />
              </ProtectedRoute>
            } />

            {/* ── Auth ────────────────────────────────────────── */}
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/signup"         element={<SignupPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ── Admin routes ─────────────────────────────────── */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/listings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ListingsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/leads" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LeadsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/territories" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TerritoriesPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/subscriptions" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SubscriptionsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/commissions-admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CommissionsAdminPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/audit" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuditLogPage />
              </ProtectedRoute>
            } />
            {/* Alias so legacy navigate('/admin/audit-log') still works */}
            <Route path="/admin/audit-log" element={<Navigate to="/admin/audit" replace />} />
            {/* H-3 fix: redirect /admin/commissions to the correct route */}
            <Route path="/admin/commissions" element={<Navigate to="/admin/commissions-admin" replace />} />
            <Route path="/admin/settings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/pricing" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPricingPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            } />

            {/* ── Director routes ──────────────────────────────── */}
            <Route path="/director/dashboard" element={
              <ProtectedRoute allowedRoles={['admin', 'director']}>
                <DirectorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/director/leads" element={
              <ProtectedRoute allowedRoles={['admin', 'director']}>
                <DirectorLeadsPage />
              </ProtectedRoute>
            } />
            <Route path="/director/realtors" element={
              <ProtectedRoute allowedRoles={['admin', 'director']}>
                <DirectorRealtorsPage />
              </ProtectedRoute>
            } />
            <Route path="/director/commissions" element={
              <ProtectedRoute allowedRoles={['admin', 'director']}>
                <DirectorCommissionsPage />
              </ProtectedRoute>
            } />
            <Route path="/director/reports" element={
              <ProtectedRoute allowedRoles={['admin', 'director']}>
                <DirectorReportsPage />
              </ProtectedRoute>
            } />

            {/* ── Realtor routes ───────────────────────────────── */}
            <Route path="/realtor/dashboard" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <RealtorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/realtor/listings" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <RealtorListingsPage />
              </ProtectedRoute>
            } />
            <Route path="/realtor/leads" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <RealtorLeadsPage />
              </ProtectedRoute>
            } />
            <Route path="/realtor/commissions" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <RealtorCommissionsPage />
              </ProtectedRoute>
            } />
            <Route path="/realtor/billing" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <BillingPage />
              </ProtectedRoute>
            } />
            <Route path="/realtor/profile" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <RealtorProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/realtor/messages" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <RealtorMessagesPage />
              </ProtectedRoute>
            } />
            <Route path="/realtor/referrals" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <RealtorReferralsPage />
              </ProtectedRoute>
            } />

            {/* ── Authenticated listing detail + edit ─────────── */}
            <Route path="/listings/:id" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <ListingDetail />
              </ProtectedRoute>
            } />
            <Route path="/listings/:id/edit" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <ListingEditPage />
              </ProtectedRoute>
            } />

            {/* ── Legacy /app/* redirects ──────────────────────── */}
            <Route path="/app/admin"          element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/app/director"       element={<Navigate to="/director/dashboard" replace />} />
            <Route path="/app/realtor"        element={<Navigate to="/realtor/dashboard" replace />} />
            <Route path="/app/listings"           element={<Navigate to="/realtor/listings" replace />} />
            <Route path="/app/listings/:id/edit" element={
              <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                <ListingEditPage />
              </ProtectedRoute>
            } />
            <Route path="/app/leads"          element={<Navigate to="/realtor/leads" replace />} />
            <Route path="/app/commissions"    element={<Navigate to="/realtor/commissions" replace />} />
            <Route path="/app/billing"        element={<Navigate to="/realtor/billing" replace />} />
            <Route path="/app/dashboard"      element={<Navigate to="/realtor/dashboard" replace />} />

            {/* ── Catch-all 404 ────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
} 