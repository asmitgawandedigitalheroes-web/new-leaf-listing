import { useState, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import KPICard from '../../../components/shared/KPICard';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { useAdminSubscriptions } from '../../../hooks/useAdminSubscriptions';
import {
  HiArrowTrendingUp,
  HiCheckBadge,
  HiExclamationCircle,
  HiArrowTrendingDown,
  HiCreditCard,
  HiArrowPath,
} from 'react-icons/hi2';

const PLAN_STYLES = {
  starter:   { bg: '#F3F4F6', text: '#4B5563' },
  pro:       { bg: 'rgba(212,175,55,0.12)', text: '#B8962E' },
  dominator: { bg: '#EDE9FE', text: '#5B21B6' },
  sponsor:   { bg: '#DBEAFE', text: '#1D4ED8' },
};

const SUB_STATUS_STYLES = {
  active:    { bg: '#E8F3EE', text: '#1F4D3A', dot: '#22C55E' },
  past_due:  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  cancelled: { bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' },
  trialing:  { bg: 'rgba(212,175,55,0.12)', text: '#B8962E', dot: '#D4AF37' },
};

function PlanBadge({ plan }) {
  const s = PLAN_STYLES[plan] || PLAN_STYLES.starter;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize"
      style={{ background: s.bg, color: s.text }}>{plan}</span>
  );
}

function SubStatusBadge({ status }) {
  const s = SUB_STATUS_STYLES[status] || SUB_STATUS_STYLES.cancelled;
  const label = status === 'past_due' ? 'Past Due' : (status || '').charAt(0).toUpperCase() + (status || '').slice(1);
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {label}
    </span>
  );
}

export default function SubscriptionsPage() {
  const { addToast } = useToast();
  const { subscriptions, isLoading, mrr, refresh, cancelSubscription, reactivateSubscription } = useAdminSubscriptions();
  const [filterPlan, setFilterPlan]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = useMemo(() => subscriptions.filter(s => {
    if (filterPlan !== 'all' && s.plan !== filterPlan) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  }), [subscriptions, filterPlan, filterStatus]);

  const active    = subscriptions.filter(s => s.status === 'active').length;
  const pastDue   = subscriptions.filter(s => s.status === 'past_due').length;
  const cancelled = subscriptions.filter(s => s.status === 'cancelled').length;
  const churnRate = subscriptions.length > 0 ? Math.round((cancelled / subscriptions.length) * 100) : 0;

  // Plan distribution from real data
  const planDist = ['starter', 'pro', 'dominator', 'sponsor'].map(plan => ({
    plan,
    count: subscriptions.filter(s => s.plan === plan).length,
    color: { starter: '#6B7280', pro: '#D4AF37', dominator: '#7C3AED', sponsor: '#1D4ED8' }[plan],
  })).filter(p => p.count > 0);
  const maxPlan = Math.max(...planDist.map(p => p.count), 1);

  const kpis = [
    { label: 'MRR',         value: `$${mrr.toLocaleString()}`, trend: null, trendLabel: '',           icon: <HiArrowTrendingUp className="text-green-600" /> },
    { label: 'Active Subs', value: active.toString(),           trend: null, trendLabel: '',           icon: <HiCheckBadge className="text-blue-600" /> },
    { label: 'Past Due',    value: pastDue.toString(),          trend: null, trendLabel: '',           icon: <HiExclamationCircle className="text-red-500" /> },
    { label: 'Churn Rate',  value: `${churnRate}%`,             trend: null, trendLabel: '',           icon: <HiArrowTrendingDown className="text-yellow-600" /> },
  ];

  const handleCancel = async (id) => {
    const { error } = await cancelSubscription(id);
    addToast(error
      ? { type: 'error', title: 'Cancel failed', desc: error.message }
      : { type: 'success', title: 'Subscription cancelled' });
  };

  const handleReactivate = async (id) => {
    const { error } = await reactivateSubscription(id);
    addToast(error
      ? { type: 'error', title: 'Reactivate failed', desc: error.message }
      : { type: 'success', title: 'Subscription reactivated' });
  };

  const selectClass = 'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white';

  return (
    <AppLayout role="admin" title="Subscriptions">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Subscriptions</h2>
            <p className="text-sm text-gray-400 mt-0.5">{subscriptions.length} total records</p>
          </div>
          <button onClick={refresh} title="Refresh" className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
            <HiArrowPath size={16} className="text-gray-500" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(k => <KPICard key={k.label} {...k} />)}
        </div>

        {/* Plan Distribution */}
        {planDist.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-6">
            <SectionCard title="Plan Distribution">
              <div className="px-6 py-5 flex flex-col gap-4">
                {planDist.map(p => (
                  <div key={p.plan}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium capitalize">{p.plan}</span>
                      <span className="font-semibold" style={{ color: p.color }}>{p.count} subs</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(p.count / maxPlan) * 100}%`, background: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <div className="lg:col-span-2">
              <SectionCard title="Cancelled Subscriptions">
                <div className="data-table">
                  <table>
                    <thead><tr><th>User</th><th>Plan</th><th>Cancelled At</th><th>Reason</th></tr></thead>
                    <tbody>
                      {subscriptions.filter(s => s.status === 'cancelled').slice(0, 5).map(s => (
                        <tr key={s.id}>
                          <td className="font-medium text-gray-900">{s.profile?.full_name || '—'}</td>
                          <td><PlanBadge plan={s.plan} /></td>
                          <td className="text-gray-400 text-sm">{s.cancelled_at ? new Date(s.cancelled_at).toLocaleDateString() : '—'}</td>
                          <td className="text-gray-500 text-sm">{s.cancel_reason || 'Not specified'}</td>
                        </tr>
                      ))}
                      {subscriptions.filter(s => s.status === 'cancelled').length === 0 && (
                        <tr><td colSpan={4} className="py-6 text-center text-gray-400 text-sm">No cancelled subscriptions</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className={selectClass}>
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="dominator">Dominator</option>
            <option value="sponsor">Sponsor</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectClass}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="trialing">Trialing</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <SectionCard title={`Subscriptions (${filtered.length})`}>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Next Billing</th>
                  <th>Stripe ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td><div className="flex items-center gap-3"><Skeleton variant="circle" width="32px" height="32px" /><Skeleton width="120px" height="12px" /></div></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                      <td><Skeleton width="100px" height="12px" /></td>
                      <td><Skeleton width="80px" height="28px" /></td>
                    </tr>
                  ))
                ) : filtered.map(s => {
                  const initials = (s.profile?.full_name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const nextBill = s.next_billing_date
                    ? new Date(s.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : (s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} size="sm" color="gold" />
                          <div>
                            <div className="font-medium text-gray-900">{s.profile?.full_name || '—'}</div>
                            <div className="text-xs text-gray-400">{s.profile?.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td><PlanBadge plan={s.plan} /></td>
                      <td><SubStatusBadge status={s.status} /></td>
                      <td className="text-gray-500 text-sm">{nextBill}</td>
                      <td className="font-mono text-xs text-gray-400">{s.stripe_customer_id ? `${s.stripe_customer_id.slice(0, 16)}…` : '—'}</td>
                      <td>
                        <div className="flex gap-1.5">
                          {(s.status === 'active' || s.status === 'trialing') && (
                            <Button variant="danger" size="sm" onClick={() => handleCancel(s.id)}>Cancel</Button>
                          )}
                          {s.status === 'cancelled' && (
                            <Button variant="green" size="sm" onClick={() => handleReactivate(s.id)}>Reactivate</Button>
                          )}
                          {s.status === 'past_due' && (
                            <Button variant="outline" size="sm" onClick={() => addToast({ type: 'info', title: 'Retry payment', desc: 'Webhook will retry automatically, or connect Stripe.' })}>Retry</Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => window.open(`https://dashboard.stripe.com/customers/${s.stripe_customer_id}`, '_blank')}>View</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <HiCreditCard className="mx-auto text-4xl text-gray-200 mb-4" />
              <p className="font-medium">No subscriptions found</p>
            </div>
          )}
        </SectionCard>
      </div>
    </AppLayout>
  );
}
