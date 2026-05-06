import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SiteSettingsProvider } from './context/SiteSettingsContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ChatWidget from './components/ui/ChatWidget';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// ── Public pages ──────────────────────────────────────────────────
import HomePage from './pages/public/HomePage';
import BrowseListings from './pages/public/BrowseListings';
import MapPage from './pages/public/MapPage';
import PricingPage from './pages/public/PricingPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';

// ── Auth pages ────────────────────────────────────────────────────
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// ── Legal pages ───────────────────────────────────────────────────
import TermsOfService from './pages/legal/TermsOfService';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import PlatformRules from './pages/legal/PlatformRules';
import FullContracts from './pages/legal/FullContracts';

// ── Legacy /app/* routes (kept for backwards compat) ──────────────
import AdminDashboard from './pages/app/AdminDashboard';
import DirectorDashboard from './pages/app/DirectorDashboard';
import RealtorDashboard from './pages/app/RealtorDashboard';
import ListingsPage from './pages/app/ListingsPage';
import LeadsPage from './pages/app/LeadsPage';
import CommissionsPage from './pages/app/CommissionsPage';
import BillingPage from './pages/app/BillingPage';

// ── Admin pages ───────────────────────────────────────────────────
import TerritoriesPage from './pages/app/admin/TerritoriesPage';
import SubscriptionsPage from './pages/app/admin/SubscriptionsPage';
import CommissionsAdminPage from './pages/app/admin/CommissionsAdminPage';
import AuditLogPage from './pages/app/admin/AuditLogPage';
import UsersPage from './pages/app/admin/UsersPage';
import ApprovalsPage from './pages/app/admin/ApprovalsPage';
import AddUserPage from './pages/app/admin/AddUserPage';
import AcceptInvitePage from './pages/onboarding/AcceptInvitePage';
import SignContractPage from './pages/onboarding/SignContractPage';
import SettingsPage from './pages/app/admin/SettingsPage';
import AdminPricingPage from './pages/app/admin/PricingPage';
import EnquiriesPage from './pages/app/admin/EnquiriesPage';
import DisputesPage from './pages/app/admin/DisputesPage';
import PayoutsPage from './pages/app/admin/PayoutsPage';
import ContractEditorPage from './pages/app/admin/ContractEditorPage';
import ContractSignaturesPage from './pages/app/admin/ContractSignaturesPage';
import AdminProfilePage from './pages/app/admin/AdminProfilePage';

// ── Director pages ────────────────────────────────────────────────
import DirectorListingsPage from './pages/app/director/DirectorListingsPage';
import DirectorLeadsPage from './pages/app/director/DirectorLeadsPage';
import DirectorRealtorsPage from './pages/app/director/DirectorRealtorsPage';
import DirectorCommissionsPage from './pages/app/director/DirectorCommissionsPage';
import DirectorReportsPage from './pages/app/director/DirectorReportsPage';
import DirectorContractsPage from './pages/app/director/DirectorContractsPage';
import DirectorBillingPage from './pages/app/director/DirectorBillingPage';
import DirectorConversationsPage from './pages/app/director/DirectorConversationsPage';
import DirectorApprovalsPage from './pages/app/director/DirectorApprovalsPage';

// ── Realtor pages ─────────────────────────────────────────────────
import RealtorListingsPage from './pages/app/realtor/RealtorListingsPage';
import RealtorLeadsPage from './pages/app/realtor/RealtorLeadsPage';
import RealtorCommissionsPage from './pages/app/realtor/RealtorCommissionsPage';
import RealtorProfilePage from './pages/app/realtor/RealtorProfilePage';
import RealtorMessagesPage from './pages/app/realtor/RealtorMessagesPage';
import RealtorReferralsPage from './pages/app/realtor/RealtorReferralsPage';
import RealtorAnalyticsPage from './pages/app/realtor/RealtorAnalyticsPage';

// ── Onboarding pages ─────────────────────────────────────────────
import PendingApprovalPage from './pages/onboarding/PendingApprovalPage';
import NotFoundPage from './pages/NotFoundPage';

// ── Listing detail + edit ─────────────────────────────────────────
import ListingDetail from './pages/app/ListingDetail';
import PublicListingDetail from './pages/public/PublicListingDetail';
import ListingEditPage from './pages/app/ListingEditPage';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SiteSettingsProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Routes>

                {/* ── Public ──────────────────────────────────────── */}
                <Route path="/" element={<HomePage />} />
                <Route path="/browse" element={<BrowseListings />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/listing/:id" element={<PublicListingDetail />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                {/* BUG-002: /terms short URL redirect */}
                <Route path="/terms" element={<Navigate to="/terms-of-service" replace />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/platform-rules" element={<PlatformRules />} />
                <Route path="/full-contracts" element={
                  <ProtectedRoute allowedRoles={['admin', 'director']}>
                    <FullContracts />
                  </ProtectedRoute>
                } />

                {/* ── Auth ────────────────────────────────────────── */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                {/* Accept admin invite — public, user is not yet authenticated */}
                <Route path="/accept-invite" element={<AcceptInvitePage />} />

                {/* ── Onboarding (post-signup status pages) ───────── */}
                <Route path="/onboarding/sign-contract" element={<SignContractPage />} />
                <Route path="/onboarding/pending" element={<PendingApprovalPage />} />
                <Route path="/onboarding/suspended" element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-md text-center bg-white p-10 rounded-2xl shadow-md border border-gray-100">
                      <div className="text-5xl mb-4">🚫</div>
                      <h1 className="text-2xl font-black text-gray-800 mb-3">Account Suspended</h1>
                      <p className="text-sm text-gray-500 mb-6">Your account has been suspended. Please contact support for assistance.</p>
                      <a href="mailto:support@nlvlistings.com" className="inline-block px-6 py-2.5 bg-gray-800 text-white text-sm font-bold rounded-lg hover:bg-gray-700">
                        Contact Support
                      </a>
                    </div>
                  </div>
                } />

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
                <Route path="/admin/enquiries" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <EnquiriesPage />
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
                <Route path="/admin/disputes" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DisputesPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/payouts" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <PayoutsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/contract" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ContractEditorPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/contract-signatures" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ContractSignaturesPage />
                  </ProtectedRoute>
                } />
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
                {/* FIX: CRIT-002 — Added missing /admin/approvals route */}
                <Route path="/admin/approvals" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ApprovalsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/profile" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminProfilePage />
                  </ProtectedRoute>
                } />
                {/* Add User — unified invite page (replaces invite-director) */}
                <Route path="/admin/add-user" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AddUserPage />
                  </ProtectedRoute>
                } />
                {/* Backwards compat: old invite-director URL redirects to add-user */}
                <Route path="/admin/invite-director" element={<Navigate to="/admin/add-user" replace />} />

                {/* ── Director routes ──────────────────────────────── */}
                <Route path="/director/dashboard" element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/director/listings" element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorListingsPage />
                  </ProtectedRoute>
                } />
                <Route path="/director/leads" element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorLeadsPage />
                  </ProtectedRoute>
                } />
                <Route path="/director/realtors" element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorRealtorsPage />
                  </ProtectedRoute>
                } />
                <Route path="/director/approvals" element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorApprovalsPage />
                  </ProtectedRoute>
                } />
                <Route path="/director/commissions" element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorCommissionsPage />
                  </ProtectedRoute>
                } />
                <Route path="/director/reports" element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorReportsPage />
                  </ProtectedRoute>
                } />
                <Route path="/director/contracts" element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorContractsPage />
                  </ProtectedRoute>
                } />
                <Route path="/director/billing" element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorBillingPage />
                  </ProtectedRoute>
                } />
                <Route path="/director/conversations" element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorConversationsPage />
                  </ProtectedRoute>
                } />
                {/* BUG-005: /director/legal → /director/contracts redirect */}
                <Route path="/director/legal" element={<Navigate to="/director/contracts" replace />} />

                {/* ── Realtor routes ───────────────────────────────── */}
                <Route path="/realtor/dashboard" element={
                  <ProtectedRoute allowedRoles={['director', 'realtor']}>
                    <RealtorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/realtor/listings" element={
                  <ProtectedRoute allowedRoles={['director', 'realtor']}>
                    <RealtorListingsPage />
                  </ProtectedRoute>
                } />
                <Route path="/realtor/leads" element={
                  <ProtectedRoute allowedRoles={['director', 'realtor']}>
                    <RealtorLeadsPage />
                  </ProtectedRoute>
                } />
                <Route path="/realtor/commissions" element={
                  <ProtectedRoute allowedRoles={['director', 'realtor']}>
                    <RealtorCommissionsPage />
                  </ProtectedRoute>
                } />
                <Route path="/realtor/billing" element={
                  <ProtectedRoute allowedRoles={['director', 'realtor']}>
                    <BillingPage />
                  </ProtectedRoute>
                } />
                <Route path="/realtor/profile" element={
                  <ProtectedRoute allowedRoles={['director', 'realtor']}>
                    <RealtorProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="/realtor/messages" element={
                  <ProtectedRoute allowedRoles={['director', 'realtor']}>
                    <RealtorMessagesPage />
                  </ProtectedRoute>
                } />
                <Route path="/realtor/referrals" element={
                  <ProtectedRoute allowedRoles={['director', 'realtor']}>
                    <RealtorReferralsPage />
                  </ProtectedRoute>
                } />
                <Route path="/realtor/analytics" element={
                  <ProtectedRoute allowedRoles={['director', 'realtor']}>
                    <RealtorAnalyticsPage />
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
                <Route path="/app/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/app/director" element={<Navigate to="/director/dashboard" replace />} />
                <Route path="/app/realtor" element={<Navigate to="/realtor/dashboard" replace />} />
                <Route path="/app/listings" element={<Navigate to="/realtor/listings" replace />} />
                <Route path="/app/listings/:id/edit" element={
                  <ProtectedRoute allowedRoles={['admin', 'director', 'realtor']}>
                    <ListingEditPage />
                  </ProtectedRoute>
                } />
                <Route path="/app/leads" element={<Navigate to="/realtor/leads" replace />} />
                <Route path="/app/commissions" element={<Navigate to="/realtor/commissions" replace />} />
                <Route path="/app/billing" element={<Navigate to="/realtor/billing" replace />} />
                <Route path="/app/dashboard" element={<Navigate to="/realtor/dashboard" replace />} />

                {/* ── Catch-all 404 ────────────────────────────────── */}
                <Route path="*" element={<NotFoundPage />} />

              </Routes>
              <ChatWidget />
            </BrowserRouter>
          </SiteSettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
} 