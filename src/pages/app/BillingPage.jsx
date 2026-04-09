import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { SectionCard } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ProgressBar from '../../components/ui/ProgressBar';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';

// Fallback plan catalog used only when the DB fetch fails or returns empty.
const planCatalog_FALLBACK = [
  { slug: 'starter',   name: 'Starter',   price: 29,  description: 'Up to 10 listings, 50 lead captures/mo, 1 territory, priority email support.',                                    maxListings: 10, maxLeads: 50  },
  { slug: 'pro',       name: 'Pro Agent', price: 79,  description: 'Up to 25 listings, 200 lead captures/mo, 3 territories, CRM integration, commission tracking.',                   maxListings: 25, maxLeads: 200 },
  { slug: 'dominator', name: 'Dominator', price: 199, description: 'Unlimited listings, unlimited leads, unlimited territories, top placement, dedicated account manager.',           maxListings: -1, maxLeads: -1  },
  { slug: 'sponsor',   name: 'Territory Sponsor', price: null, description: 'Exclusive territory lock, first-priority lead routing, co-branded marketing, custom commission splits. Contact sales.', maxListings: -1, maxLeads: -1  },
];

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount) {
  if (amount == null) return '—';
  // stripe-webhook stores amount already divided by 100 (in dollars)
  return `$${Number(amount).toFixed(2)}`;
}

export default function BillingPage() {
  const { user, profile, subscription } = useAuth();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Directors have their own billing page — redirect them if they land here
  // (e.g. after a Stripe checkout that used the realtor success URL)
  useEffect(() => {
    if (profile?.role === 'director') {
      const qs = searchParams.toString();
      navigate(`/director/billing${qs ? `?${qs}` : ''}`, { replace: true });
    }
  }, [profile?.role]);

  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [usageStats, setUsageStats] = useState({ listings: 0, leads: 0 });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [upgrading, setUpgrading] = useState(false);
  const [planCatalog, setPlanCatalog] = useState(planCatalog_FALLBACK);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Detect Stripe redirect success/cancel
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      addToast({ type: 'success', title: 'Subscription activated!', desc: 'Your plan has been updated.' });
    } else if (status === 'cancelled') {
      addToast({ type: 'warning', title: 'Checkout cancelled', desc: 'No changes were made.' });
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [paymentsRes, listingsRes, leadsRes, plansRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount, status, created_at, stripe_payment_id, description')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('realtor_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_realtor_id', user.id),
        supabase
          .from('pricing_plans')
          .select('slug, name, monthly_price, features')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ]);

      setPayments(paymentsRes.data || []);
      setUsageStats({
        listings: listingsRes.count ?? 0,
        leads: leadsRes.count ?? 0,
      });

      // Map DB pricing_plans to the shape the component needs
      if (plansRes.data && plansRes.data.length > 0) {
        const MAX_LISTINGS = { starter: 5, pro: -1, dominator: -1, sponsor: -1 };
        const MAX_LEADS    = { starter: 50, pro: 200, dominator: -1, sponsor: -1 };
        setPlanCatalog(plansRes.data.map(p => ({
          slug:        p.slug,
          name:        p.name,
          price:       p.monthly_price,
          description: Array.isArray(p.features) ? p.features.join(', ') : (p.features || ''),
          maxListings: MAX_LISTINGS[p.slug] ?? -1,
          maxLeads:    MAX_LEADS[p.slug] ?? -1,
        })));
      }
    } catch (err) {
      console.error('[BillingPage] loadData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Current plan from AuthContext subscription
  const currentPlanSlug = subscription?.plan ?? 'starter';
  const currentPlan = planCatalog.find(p => p.slug === currentPlanSlug) ?? planCatalog[0];
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  const nextBillingDate = subscription?.current_period_end
    ? formatDate(subscription.current_period_end)
    : '—';

  // Usage limits from plan catalog
  const listingMax = currentPlan.maxListings === -1 ? '∞' : currentPlan.maxListings;
  const listingUsed = usageStats.listings;
  const listingPct = currentPlan.maxListings === -1 ? 0 : Math.min(100, (listingUsed / currentPlan.maxListings) * 100);

  const leadMax = currentPlan.maxLeads === -1 ? '∞' : currentPlan.maxLeads;
  const leadUsed = usageStats.leads;
  const leadPct = currentPlan.maxLeads === -1 ? 0 : Math.min(100, (leadUsed / currentPlan.maxLeads) * 100);

  const handleUpgrade = async () => {
    if (!selectedPlan || selectedPlan === currentPlanSlug) {
      addToast({ type: 'warning', title: 'Already on this plan' });
      return;
    }
    setUpgrading(true);
    try {
      // BUG-010: Explicitly forward the session JWT to prevent 401 from the Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planKey: selectedPlan,
          userId: user.id,
          userEmail: user.email,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error || !data?.url) {
        throw new Error(error?.message || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('[BillingPage] Upgrade error:', err);
      const friendlyMsg = err.message?.includes('non-2xx') || err.message?.includes('Edge Function')
        ? 'Payment service is temporarily unavailable. Please try again later or contact support.'
        : (err.message || 'Something went wrong. Please try again.');
      addToast({ type: 'error', title: 'Upgrade failed', desc: friendlyMsg });
    } finally {
      setUpgrading(false);
      setUpgradeOpen(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelling', updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Subscription cancelled',
        desc: `Your access continues until ${nextBillingDate}. No further charges.`,
      });
      setCancelOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Cancellation failed', desc: 'Please contact support at billing@nlvlistings.com' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AppLayout
      role={profile?.role || 'realtor'}
      title="Billing"
      user={{
        name: profile?.full_name || 'User',
        role: profile?.role || 'realtor',
        initials: (profile?.full_name || 'U').slice(0, 2).toUpperCase(),
      }}
    >
      <div className="p-4 md:p-6 flex flex-col gap-6 max-w-4xl mx-auto">

        {/* Current Plan */}
        <SectionCard title="Current Plan">
          <div className="px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-5">
            {isLoading ? (
              <div className="flex-1">
                <Skeleton width="120px" height="24px" className="mb-2" />
                <Skeleton width="200px" height="14px" className="mb-1" />
                <Skeleton width="180px" height="14px" />
              </div>
            ) : (
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl font-black" style={{ color: '#111111' }}>
                    {currentPlan.name}
                  </span>
                  {subscription ? (
                    <Badge status={subscription.status === 'trialing' ? 'pending' : subscription.status} label={subscription.status === 'trialing' ? 'Trial' : 'Active'} />
                  ) : (
                    <Badge status="pending" label="No Plan" />
                  )}
                </div>
                <p className="text-sm mb-1" style={{ color: '#4B5563' }}>{currentPlan.description}</p>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {isActive && nextBillingDate !== '—' ? (
                    <>Next billing: <strong style={{ color: '#111111' }}>{nextBillingDate}</strong> — </>
                  ) : null}
                  <strong style={{ color: '#D4AF37' }}>
                    {currentPlan.price != null ? `$${currentPlan.price}/mo` : 'Contact Sales'}
                  </strong>
                </p>
              </div>
            )}
            <div className="flex gap-3 flex-shrink-0">
              <Button variant="primary" onClick={() => setUpgradeOpen(true)}>
                Upgrade Plan
              </Button>
              {subscription && isActive && (
                <Button variant="outline" onClick={() => setCancelOpen(true)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Plan Usage */}
        <SectionCard title="Plan Usage">
          <div className="px-5 py-5 grid sm:grid-cols-2 gap-6">
            {isLoading ? (
              <>
                {[...Array(2)].map((_, i) => (
                  <div key={i}>
                    <Skeleton width="160px" height="14px" className="mb-2" />
                    <Skeleton width="100%" height="8px" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium" style={{ color: '#111111' }}>Active Listings</span>
                    <span style={{ color: '#6B7280' }}>{listingUsed} / {listingMax}</span>
                  </div>
                  <ProgressBar value={listingPct} max={100} color="gold" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium" style={{ color: '#111111' }}>Assigned Leads</span>
                    <span style={{ color: '#6B7280' }}>{leadUsed} / {leadMax}</span>
                  </div>
                  <ProgressBar value={leadPct} max={100} color="green" />
                </div>
              </>
            )}
          </div>
        </SectionCard>

        {/* Invoice History */}
        <SectionCard title="Invoice History">
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="120px" height="12px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                      <td><Skeleton width="50px" height="12px" /></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="50px" height="28px" /></td>
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No payment history yet.
                    </td>
                  </tr>
                ) : payments.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-mono text-sm" style={{ color: '#4B5563' }}>
                      {inv.stripe_payment_id
                        ? inv.stripe_payment_id.slice(0, 16) + '…'
                        : `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                    </td>
                    <td style={{ color: '#6B7280' }}>{formatDate(inv.created_at)}</td>
                    <td className="font-semibold" style={{ color: '#111111' }}>
                      {formatCurrency(inv.amount)}
                    </td>
                    <td>
                      <Badge
                        status={inv.status === 'succeeded' ? 'active' : inv.status === 'pending' ? 'pending' : 'rejected'}
                        label={inv.status === 'succeeded' ? 'Paid' : inv.status}
                      />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addToast({ type: 'success', title: 'Invoice download', desc: 'PDF download coming soon.' })}
                      >
                        ↓ PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

      </div>

      {/* Upgrade Modal */}
      <Modal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Upgrade Plan"
        footer={
          <>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleUpgrade}
              disabled={upgrading || selectedPlan === currentPlanSlug}
            >
              {upgrading ? 'Redirecting…' : 'Go to Checkout'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {planCatalog.map(plan => {
            const isCurrent = plan.slug === currentPlanSlug;
            const isSelected = plan.slug === selectedPlan;
            return (
              <button
                key={plan.slug}
                onClick={() => !isCurrent && setSelectedPlan(plan.slug)}
                disabled={isCurrent}
                className="flex items-center gap-4 p-4 rounded-xl border text-left transition-all"
                style={{
                  borderColor: isSelected ? '#D4AF37' : '#E5E7EB',
                  background: isCurrent ? '#F9FAFB' : isSelected ? '#FEFCE8' : '#fff',
                  borderLeftWidth: isSelected ? '3px' : '1px',
                  opacity: isCurrent ? 0.6 : 1,
                  cursor: isCurrent ? 'default' : 'pointer',
                }}
              >
                {/* Radio */}
                <div
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors flex items-center justify-center"
                  style={{
                    borderColor: isSelected ? '#D4AF37' : '#CBD5E0',
                    background: isSelected ? '#D4AF37' : 'transparent',
                  }}
                >
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm" style={{ color: '#111111' }}>
                      {plan.name}
                      {isCurrent && (
                        <span className="ml-2 text-xs font-normal text-gray-400">(current)</span>
                      )}
                    </span>
                    <span className="font-bold text-sm" style={{ color: '#D4AF37' }}>
                      {plan.price != null && plan.price > 0 ? `$${plan.price}/mo` : 'Contact Sales'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{plan.description}</p>
                  {isSelected && plan.slug === 'starter' && (
                    <div className="mt-2 p-2.5 rounded-lg text-xs" style={{ background: 'rgba(212,175,55,0.1)', color: '#B8962E', border: '1px solid rgba(212,175,55,0.3)' }}>
                      Starter plan requires a <strong>12-month minimum commitment</strong>. Early cancellation does not waive the remaining monthly fees.
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Your Subscription?"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep Subscription</Button>
            <Button
              variant="primary"
              onClick={handleCancelSubscription}
              isLoading={cancelling}
              style={{ background: '#DC2626' }}
            >
              Cancel Subscription
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 mb-3">
          Your subscription will remain active until{' '}
          <strong>{nextBillingDate}</strong>. After that, your listings will be deactivated.
        </p>
        <p className="text-xs text-gray-400">
          You can reactivate at any time before the end date to avoid interruption.
        </p>
      </Modal>

    </AppLayout>
  );
}
