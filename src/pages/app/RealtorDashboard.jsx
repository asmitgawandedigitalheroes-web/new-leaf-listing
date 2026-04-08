import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import KPICard from '../../components/shared/KPICard';
import { SectionCard } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import LeadDrawer from '../../components/shared/LeadDrawer';
import { useAuth } from '../../context/AuthContext';
import { useListings } from '../../hooks/useListings';
import { useLeads } from '../../hooks/useLeads';
import { supabase } from '../../lib/supabase';
import { useEffect, useState, useMemo } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { maskName, maskEmail } from '../../utils/masking';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import {
  HiHome,
  HiUsers,
  HiBanknotes,
  HiCheckBadge,
  HiClock,
  HiExclamationTriangle,
  HiCreditCard,
  HiSparkles,
} from 'react-icons/hi2';

const TRIAL_DAYS = 14;

/**
 * Compute trial status from subscription object.
 * Returns: { isTrialing, isExpired, isPastDue, hasNoSub, daysLeft, trialEndDate }
 */
function getTrialInfo(subscription) {
  const now = Date.now();

  if (!subscription) {
    return { isTrialing: false, isExpired: false, isPastDue: false, hasNoSub: true, daysLeft: 0, trialEndDate: null };
  }

  const status = subscription.status;
  const isPastDue = status === 'past_due';

  // Determine trial end date:
  // 1. next_billing_date from Stripe (most accurate)
  // 2. created_at + 14 days (fallback)
  const endTs = subscription.next_billing_date
    ? new Date(subscription.next_billing_date).getTime()
    : new Date(subscription.created_at).getTime() + TRIAL_DAYS * 86400000;

  const trialEndDate = new Date(endTs);
  const msLeft = endTs - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const isExpired = msLeft <= 0;

  if (status === 'trialing') {
    return { isTrialing: true, isExpired, isPastDue: false, hasNoSub: false, daysLeft, trialEndDate };
  }
  if (isPastDue) {
    return { isTrialing: false, isExpired: false, isPastDue: true, hasNoSub: false, daysLeft: 0, trialEndDate };
  }

  return { isTrialing: false, isExpired: false, isPastDue: false, hasNoSub: false, daysLeft: 0, trialEndDate };
}

/** Banner shown during active trial */
function TrialBanner({ daysLeft, trialEndDate, onUpgrade }) {
  const pct = Math.max(0, Math.min(100, (daysLeft / TRIAL_DAYS) * 100));
  const urgent = daysLeft <= 3;
  const color = urgent ? '#DC2626' : '#D4AF37';
  const bgColor = urgent ? '#FEF2F2' : '#FFFBEB';
  const borderColor = urgent ? '#FECACA' : '#FDE68A';

  return (
    <div style={{
      borderRadius: 14, padding: '14px 18px',
      background: bgColor, border: `1px solid ${borderColor}`,
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: urgent ? 'rgba(220,38,38,0.12)' : 'rgba(212,175,55,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <HiClock size={18} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: urgent ? '#991B1B' : '#92400E', marginBottom: 3 }}>
          {urgent
            ? `⚠️ Only ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your free trial`
            : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining in your free trial`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 99, background: urgent ? '#FEE2E2' : '#FDE68A', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontSize: 11, color, fontWeight: 600, whiteSpace: 'nowrap' }}>{daysLeft}/{TRIAL_DAYS} days</span>
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF' }}>
          Trial ends {trialEndDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
      <button
        onClick={onUpgrade}
        style={{
          padding: '8px 18px', borderRadius: 9, border: 'none',
          background: color, color: '#fff',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          boxShadow: `0 2px 8px ${urgent ? 'rgba(220,38,38,0.3)' : 'rgba(212,175,55,0.3)'}`,
        }}
      >
        <HiSparkles size={13} /> Upgrade Now
      </button>
    </div>
  );
}

/** Banner shown when trial is expired or payment is past due */
function PaymentRequiredBanner({ isPastDue, onPay }) {
  return (
    <div style={{
      borderRadius: 14, padding: '14px 18px',
      background: '#FEF2F2', border: '1px solid #FECACA',
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'rgba(220,38,38,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <HiExclamationTriangle size={18} color="#DC2626" />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#991B1B', marginBottom: 2 }}>
          {isPastDue ? 'Payment overdue — your listings may be deactivated' : 'Your free trial has ended'}
        </div>
        <div style={{ fontSize: 12, color: '#B91C1C' }}>
          {isPastDue
            ? 'Please update your payment method to restore full access.'
            : 'Activate a plan to continue posting listings and receiving leads.'}
        </div>
      </div>
      <button
        onClick={onPay}
        style={{
          padding: '8px 18px', borderRadius: 9, border: 'none',
          background: '#DC2626', color: '#fff',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
        }}
      >
        <HiCreditCard size={13} /> {isPastDue ? 'Update Payment' : 'Activate Plan'}
      </button>
    </div>
  );
}

export default function RealtorDashboard() {
  useDocumentTitle('Realtor Dashboard');
  const navigate = useNavigate();
  const { profile, user, subscription } = useAuth();

  // DEV-only: ?__trial=N forces N days left; ?__trial=expired; ?__trial=pastdue
  const devParam = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get('__trial')
    : null;
  const devSub = devParam === 'expired'  ? { plan: 'starter', status: 'trialing', created_at: new Date(Date.now() - 20*86400000).toISOString() }
               : devParam === 'pastdue'  ? { plan: 'starter', status: 'past_due',  created_at: new Date(Date.now() - 30*86400000).toISOString() }
               : devParam               ? { plan: 'starter', status: 'trialing',  next_billing_date: new Date(Date.now() + Number(devParam)*86400000).toISOString(), created_at: new Date(Date.now() - (14-Number(devParam))*86400000).toISOString() }
               : null;
  const trialInfo = getTrialInfo(devSub ?? subscription);
  const { addToast } = useToast();
  const [selectedLead, setSelectedLead] = useState(null);
  const { listings: myListings, isLoading: listingsLoading, submitForApproval, deleteListing } = useListings();
  const { leads: myLeads, isLoading: leadsLoading } = useLeads();
  const [commissions, setCommissions] = useState([]);
  const [commissionsLoading, setCommissionsLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;
      
      // Commissions
      setCommissionsLoading(true);
      const { data: commData } = await supabase
        .from('commissions')
        .select('*, listing:listings(title, city)')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setCommissions(commData || []);
      setCommissionsLoading(false);

      // Activities
      setActivitiesLoading(true);
      const { data: actData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(5);
      setActivities(actData || []);
      setActivitiesLoading(false);
    }
    fetchDashboardData();
  }, [user?.id]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await deleteListing(deleteTarget.id);
    setIsDeleting(false);
    if (error) {
      addToast({ type: 'error', title: 'Delete failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Listing deleted successfully' });
    }
    setDeleteTarget(null);
  };

  const kpis = useMemo(() => [
    { label: 'My Listings',   value: myListings.length.toString(),                     trend: null, trendLabel: '', icon: <HiHome className="text-blue-600" /> },
    { label: 'Active Leads',  value: myLeads.filter(l => l.status !== 'converted').length.toString(), trend: null, trendLabel: '', icon: <HiUsers className="text-purple-600" /> },
    { label: 'Commission YTD', value: `$${commissions.reduce((s, c) => s + (Number(c.amount) || 0), 0).toLocaleString()}`, trend: null, trendLabel: '', icon: <HiBanknotes className="text-green-600" /> },
    { label: 'Closed Deals',  value: myLeads.filter(l => l.status === 'converted').length.toString(), trend: null, trendLabel: '', icon: <HiCheckBadge className="text-yellow-600" /> },
  ], [myListings, myLeads, commissions]);

  return (
    <AppLayout role="realtor" title="My Dashboard">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Trial / Payment banners */}
        {trialInfo.isTrialing && !trialInfo.isExpired && (
          <TrialBanner
            daysLeft={trialInfo.daysLeft}
            trialEndDate={trialInfo.trialEndDate}
            onUpgrade={() => navigate('/realtor/billing')}
          />
        )}
        {(trialInfo.isTrialing && trialInfo.isExpired) || trialInfo.isPastDue ? (
          <PaymentRequiredBanner
            isPastDue={trialInfo.isPastDue}
            onPay={() => navigate('/realtor/billing')}
          />
        ) : null}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(listingsLoading || leadsLoading) ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <Skeleton width="40px" height="40px" className="mb-3" />
                <Skeleton width="80px" height="24px" className="mb-2" />
                <Skeleton width="120px" height="14px" />
              </div>
            ))
          ) : kpis.map(kpi => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>

        {/* Listings + activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* My listings */}
          <div className="lg:col-span-2">
            <SectionCard title="My Listings" action={
              <Link to="/realtor/listings" className="inline-flex items-center justify-center px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-all font-headline no-underline" style={{ background: '#D4AF37' }}>
                + Add Listing
              </Link>
            }>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listingsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <tr key={i}>
                          <td><Skeleton width="140px" height="14px" /><Skeleton width="80px" height="10px" className="mt-1" /></td>
                          <td><Skeleton width="70px" height="14px" /></td>
                          <td><Skeleton width="60px" height="20px" /></td>
                        </tr>
                      ))
                    ) : myListings.slice(0, 4).map(l => (
                      <tr key={l.id}>
                        <td>
                          <div className="font-medium text-gray-900 text-sm">{l.title}</div>
                          <div className="text-xs text-gray-400">{l.city}</div>
                        </td>
                        <td className="font-semibold text-gray-900">${l.price?.toLocaleString()}</td>
                        <td><Badge status={l.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Recent Activity">
            <div className="px-5 py-4">
               {activitiesLoading ? (
                 <div className="flex flex-col gap-3">
                   <Skeleton width="100%" height="12px" />
                   <Skeleton width="80%" height="12px" />
                   <Skeleton width="90%" height="12px" />
                 </div>
               ) : activities.length > 0 ? (
                 <div className="space-y-4">
                   {activities.map((a, i) => (
                     <div key={i} className="flex gap-3 items-start">
                       <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#D4AF37' }} />
                       <div>
                         <p className="text-[13px] text-gray-700 leading-tight capitalize">
                           {a.action.replace(/\./g, ' ')} 
                           <span className="text-gray-400 ml-1">#{a.entity_id?.slice(-4)}</span>
                         </p>
                         <p className="text-[10px] text-gray-400 mt-1">{new Date(a.timestamp).toLocaleString()}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-xs text-gray-500 italic">No recent activity logs.</p>
               )}
            </div>
          </SectionCard>
        </div>

        {/* My leads */}
        <SectionCard title="My Leads" action={
          <Button variant="outline" size="sm" onClick={() => navigate('/realtor/leads')}>View All</Button>
        }>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Budget</th>
                  <th>Interest</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="120px" height="14px" /><Skeleton width="100px" height="10px" className="mt-1" /></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="80px" height="8px" /></td>
                      <td><Skeleton width="70px" height="12px" /></td>
                      <td><Skeleton width="90px" height="12px" /></td>
                      <td><Skeleton width="50px" height="32px" /></td>
                    </tr>
                  ))
                ) : myLeads.slice(0, 5).map(lead => (
                  <tr key={lead.id} className="cursor-pointer" onClick={() => setSelectedLead(lead)}>
                    <td>
                      <div className="font-medium text-gray-900" title="Full details available in Leads section">{maskName(lead.contact_name)}</div>
                      <div className="text-xs text-gray-400">{maskEmail(lead.contact_email)}</div>
                    </td>
                    <td><Badge status={lead.status} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full">
                          <div className="h-full rounded-full" style={{ width: `${lead.score}%`, background: '#D4AF37' }} />
                        </div>
                        <span className="text-xs text-gray-500">{lead.score}</span>
                      </div>
                    </td>
                    <td className="text-gray-600">${lead.budget_max?.toLocaleString() || 'N/A'}</td>
                    <td className="text-gray-500">{lead.listing?.title || lead.interest_type || 'General Inquiry'}</td>
                    <td>
                      <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setSelectedLead(lead); }}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

      </div>

      {/* Lead detail drawer */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Listing?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              isLoading={isDeleting}
              style={{ background: '#DC2626' }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>?{' '}
          This action cannot be undone.
        </p>
      </Modal>

    </AppLayout>
  );
}
                   