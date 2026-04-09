import { useState, useMemo, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';
import Modal from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useUsers } from '../../../hooks/useUsers';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import { sendInviteEmail } from '../../../utils/email';
import { ActionPill } from '../../../components/shared/TableActions';
import MobileCard, { MobileCardRow, MobileCardActions } from '../../../components/shared/MobileCard';
import {
  HiUserPlus, HiLink, HiClipboardDocument, HiCheckCircle,
  HiCurrencyDollar, HiArrowTrendingUp, HiExclamationTriangle,
  HiPaperAirplane,
} from 'react-icons/hi2';

const PLAN_STYLES = {
  starter:   { bg: '#F3F4F6', text: '#4B5563' },
  pro:       { bg: 'rgba(212,175,55,0.12)', text: '#B8962E' },
  dominator: { bg: '#EDE9FE', text: '#5B21B6' },
  sponsor:   { bg: '#DBEAFE', text: '#1D4ED8' },
};

const PLAN_PRICE = { starter: 97, pro: 197, dominator: 397, sponsor: 597 };
const DIRECTOR_CUT = 0.25;

export default function DirectorRealtorsPage() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const { users, isLoading, updateUser } = useUsers();
  const [viewStatsId, setViewStatsId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState('');

  // Invite state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteGenerated, setInviteGenerated] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Subscription revenue state
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(true);

  const [territoryIds, setTerritoryIds] = useState([]);
  useEffect(() => {
    if (!profile?.id) return;
    supabase.from('territories').select('id').eq('director_id', profile.id)
      .then(({ data }) => setTerritoryIds((data || []).map(t => t.id)));
  }, [profile?.id]);

  const realtors = useMemo(
    () => users.filter(u => u.role === 'realtor' && (territoryIds.length === 0 || territoryIds.includes(u.territory_id))),
    [users, territoryIds]
  );

  const pendingRealtors = realtors.filter(r => r.status === 'pending');
  const activeRealtors  = useMemo(() => {
    const all = realtors.filter(r => r.status !== 'pending');
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(r =>
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q)
    );
  }, [realtors, search]);

  // Fetch subscriptions for territory realtors
  useEffect(() => {
    if (!realtors.length) { setSubsLoading(false); return; }
    const realtorIds = realtors.map(r => r.id);
    setSubsLoading(true);
    supabase
      .from('subscriptions')
      .select('user_id, plan, status, current_period_end')
      .in('user_id', realtorIds)
      .then(({ data }) => {
        setSubscriptions(data || []);
        setSubsLoading(false);
      });
  }, [realtors.length]);

  // Revenue calculations
  const revenueMetrics = useMemo(() => {
    const activeSubs  = subscriptions.filter(s => s.status === 'active');
    const pastDueSubs = subscriptions.filter(s => s.status === 'past_due');
    const monthlyRevenue = activeSubs.reduce((sum, s) => sum + (PLAN_PRICE[s.plan] || 0), 0);
    const directorMRR    = Math.round(monthlyRevenue * DIRECTOR_CUT);
    return { activeSubs: activeSubs.length, pastDue: pastDueSubs.length, monthlyRevenue, directorMRR };
  }, [subscriptions]);

  const getRealtorSub = (realtorId) => subscriptions.find(s => s.user_id === realtorId);

  const statsRealtor = viewStatsId ? realtors.find(r => r.id === viewStatsId) : null;

  const handleStatus = async (id, status) => {
    setActionLoading(id + status);
    const { error } = await updateUser(id, { status });
    setActionLoading(null);
    if (error) addToast({ type: 'error', title: 'Update failed', desc: error.message });
    else addToast({ type: 'success', title: `Realtor ${status}` });
  };

  const generateInviteLink = () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      addToast({ type: 'error', title: 'Required', desc: 'Please enter the realtor\'s name and email.' });
      return;
    }
    const params = new URLSearchParams({
      director_id: profile?.id || '',
      name: inviteForm.name.trim(),
      email: inviteForm.email.trim(),
    });
    if (territoryIds.length > 0) params.set('territory_id', territoryIds[0]);
    else if (profile?.territory_id) params.set('territory_id', profile.territory_id);
    setInviteLink(`${window.location.origin}/signup?${params.toString()}`);
    setInviteGenerated(true);
    setEmailSent(false);
  };

  const handleSendEmail = async () => {
    setEmailSending(true);
    const { sent, error } = await sendInviteEmail({
      to: inviteForm.email.trim(),
      fullName: inviteForm.name.trim(),
      role: 'realtor',
      inviteUrl: inviteLink,
      territory,
      isDetailedInvite: false,
    });
    setEmailSending(false);
    if (sent) {
      setEmailSent(true);
      addToast({ type: 'success', title: 'Email sent!', desc: `Invite sent to ${inviteForm.email}` });
    } else {
      addToast({ type: 'error', title: 'Email failed', desc: error || 'Could not send email. Please try again.' });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      addToast({ type: 'error', title: 'Copy failed', desc: 'Please copy the link manually.' });
    }
  };

  const territory = profile?.territory || 'My Territory';

  return (
    <AppLayout role="director" title="My Realtors">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Territory</div>
            <h2 className="text-xl font-bold text-gray-900">My Realtors</h2>
            <p className="text-sm text-gray-400 mt-0.5">{territory}</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-white rounded-xl px-4 py-2.5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="text-lg font-black text-gray-900">{realtors.filter(r => r.status === 'active').length}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Active</div>
            </div>
            <div className="bg-white rounded-xl px-4 py-2.5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="text-lg font-black text-yellow-600">{pendingRealtors.length}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Pending</div>
            </div>
            <div className="bg-white rounded-xl px-4 py-2.5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="text-lg font-black text-gray-900">{realtors.length}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Total</div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setInviteOpen(true); setLinkCopied(false); }}
              className="flex items-center gap-2"
            >
              <HiUserPlus className="w-4 h-4" />
              Invite Realtor
            </Button>
          </div>
        </div>

        {/* Revenue / MRR Dashboard */}
        <SectionCard
          title="Territory Revenue"
          action={
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(31,77,58,0.08)', color: '#1F4D3A' }}>
              25% Override Commission
            </span>
          }
        >
          <div className="p-4 md:p-6">
            {subsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} width="100%" height="70px" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <HiArrowTrendingUp className="w-5 h-5" style={{ color: '#1F4D3A' }} />, label: 'Territory MRR', value: `$${revenueMetrics.monthlyRevenue.toLocaleString()}`, sub: 'Total agent subscriptions', accent: '#E8F3EE', textColor: '#1F4D3A' },
                  { icon: <HiCurrencyDollar className="w-5 h-5" style={{ color: '#D4AF37' }} />, label: 'Your Override (25%)', value: `$${revenueMetrics.directorMRR.toLocaleString()}`, sub: 'Monthly recurring to you', accent: 'rgba(212,175,55,0.10)', textColor: '#B8962E' },
                  { icon: <HiCheckCircle className="w-5 h-5" style={{ color: '#059669' }} />, label: 'Active Subscriptions', value: revenueMetrics.activeSubs, sub: `of ${realtors.length} realtors`, accent: '#F0FDF4', textColor: '#059669' },
                  { icon: <HiExclamationTriangle className="w-5 h-5" style={{ color: revenueMetrics.pastDue > 0 ? '#DC2626' : '#9CA3AF' }} />, label: 'Past Due', value: revenueMetrics.pastDue, sub: revenueMetrics.pastDue > 0 ? 'Need attention' : 'All good', accent: revenueMetrics.pastDue > 0 ? '#FEF2F2' : '#F9FAFB', textColor: revenueMetrics.pastDue > 0 ? '#DC2626' : '#9CA3AF' },
                ].map((m, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: m.accent }}>
                    <div className="flex items-center gap-2 mb-2">{m.icon}</div>
                    <div className="text-xl font-black" style={{ color: m.textColor }}>{m.value}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">{m.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{m.sub}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Per-Realtor Billing Health */}
            {!subsLoading && realtors.filter(r => r.status === 'active').length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Agent Billing Health</div>
                <div className="flex flex-col gap-2">
                  {realtors.filter(r => r.status === 'active').map(r => {
                    const sub = getRealtorSub(r.id);
                    const isPastDue  = sub?.status === 'past_due';
                    const isTrialing = !sub || sub?.status === 'trialing';
                    const isActive   = sub?.status === 'active';
                    return (
                      <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Avatar initials={r.initials || '??'} size="xs" color={isActive ? 'green' : 'gold'} />
                          <span className="text-sm font-medium text-gray-800">{r.full_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {sub && !isTrialing ? (
                            <>
                              <span className="text-xs font-semibold capitalize" style={{ color: PLAN_STYLES[sub.plan]?.text || '#6B7280' }}>{sub.plan}</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: isPastDue ? '#FEF2F2' : '#F0FDF4', color: isPastDue ? '#DC2626' : '#059669' }}>
                                {isPastDue ? 'Past Due' : 'Active'}
                              </span>
                              <span className="text-xs text-gray-400">${PLAN_PRICE[sub.plan] || 0}/mo</span>
                            </>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(212,175,55,0.12)', color: '#B8962E' }}>
                              Free Trial
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Pending Approvals */}
        {isLoading ? (
          <SectionCard title="Pending Approval">
            <div className="hidden md:block data-table">
              <table><thead><tr><th>Realtor</th><th>Plan</th><th>Actions</th></tr></thead>
              <tbody>
                {[...Array(2)].map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton width="160px" height="14px" /></td>
                    <td><Skeleton width="60px" height="20px" /></td>
                    <td><Skeleton width="140px" height="28px" /></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
            <div className="md:hidden flex flex-col gap-3 p-4">
              {[...Array(2)].map((_, i) => (
                <MobileCard key={i}>
                  <Skeleton width="60%" height="14px" className="mb-2" />
                  <Skeleton width="40%" height="12px" />
                </MobileCard>
              ))}
            </div>
          </SectionCard>
        ) : pendingRealtors.length > 0 && (
          <SectionCard title="Pending Approval" action={
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#B8962E' }}>
              {pendingRealtors.length} pending
            </span>
          }>
            {/* Desktop table */}
            <div className="hidden md:block data-table">
              <table>
                <thead><tr><th>Realtor</th><th>Plan</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {pendingRealtors.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar initials={r.initials || '??'} size="sm" color="gold" />
                          <div>
                            <div className="font-medium text-gray-900">{r.full_name}</div>
                            <div className="text-xs text-gray-400">{r.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {r.plan ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                            style={{ background: PLAN_STYLES[r.plan]?.bg || '#F3F4F6', color: PLAN_STYLES[r.plan]?.text || '#4B5563' }}>
                            {r.plan}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="text-gray-400 text-sm">{r.joined}</td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="green" size="sm" isLoading={actionLoading === r.id + 'active'} onClick={() => handleStatus(r.id, 'active')}>Approve</Button>
                          <Button variant="danger" size="sm" isLoading={actionLoading === r.id + 'suspended'} onClick={() => handleStatus(r.id, 'suspended')}>Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3 p-4">
              {pendingRealtors.map(r => (
                <MobileCard key={r.id} highlight="#B8962E">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar initials={r.initials || '??'} size="sm" color="gold" />
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{r.full_name}</div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                    </div>
                  </div>
                  <MobileCardRow label="Plan">
                    {r.plan ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                        style={{ background: PLAN_STYLES[r.plan]?.bg || '#F3F4F6', color: PLAN_STYLES[r.plan]?.text || '#4B5563' }}>
                        {r.plan}
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </MobileCardRow>
                  <MobileCardRow label="Joined">
                    <span className="text-gray-400 text-xs">{r.joined}</span>
                  </MobileCardRow>
                  <MobileCardActions>
                    <Button variant="green" size="sm" isLoading={actionLoading === r.id + 'active'} onClick={() => handleStatus(r.id, 'active')}>Approve</Button>
                    <Button variant="danger" size="sm" isLoading={actionLoading === r.id + 'suspended'} onClick={() => handleStatus(r.id, 'suspended')}>Reject</Button>
                  </MobileCardActions>
                </MobileCard>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Realtors Table */}
        <SectionCard title={`Realtors (${activeRealtors.length})`} action={
          <input
            type="text"
            placeholder="Search realtors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none w-44"
            onFocus={e => e.target.style.borderColor = '#D4AF37'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'}
          />
        }>
          {/* Desktop table */}
          <div className="hidden md:block data-table">
            <table>
              <thead>
                <tr>
                  <th>Realtor</th>
                  <th>Plan</th>
                  <th>Billing</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td><div className="flex items-center gap-3"><Skeleton variant="circle" width="32px" height="32px" /><Skeleton width="120px" height="12px" /></div></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                      <td><Skeleton width="140px" height="28px" /></td>
                    </tr>
                  ))
                ) : activeRealtors.length > 0 ? activeRealtors.map(r => {
                  const sub = getRealtorSub(r.id);
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar initials={r.initials || '??'} size="sm" color={r.status === 'active' ? 'green' : 'gold'} />
                          <div>
                            <div className="font-medium text-gray-900">{r.full_name}</div>
                            <div className="text-xs text-gray-400">{r.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {r.plan ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                            style={{ background: PLAN_STYLES[r.plan]?.bg || '#F3F4F6', color: PLAN_STYLES[r.plan]?.text || '#4B5563' }}>
                            {r.plan}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td>
                        {!sub || sub.status === 'trialing' ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(212,175,55,0.12)', color: '#B8962E' }}>
                            Free Trial
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: sub.status === 'past_due' ? '#FEF2F2' : '#F0FDF4',
                              color: sub.status === 'past_due' ? '#DC2626' : '#059669',
                            }}>
                            {sub.status === 'past_due' ? 'Past Due' : 'Active'}
                          </span>
                        )}
                      </td>
                      <td><Badge status={r.status || 'active'} /></td>
                      <td className="text-gray-400 text-sm">{r.joined}</td>
                      <td>
                        <div className="flex gap-1.5 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => setViewStatsId(viewStatsId === r.id ? null : r.id)}>
                            {viewStatsId === r.id ? 'Hide' : 'Stats'}
                          </Button>
                          {r.status === 'active' ? (
                            <Button variant="ghost" size="sm" isLoading={actionLoading === r.id + 'suspended'} style={{ color: '#DC2626' }} onClick={() => handleStatus(r.id, 'suspended')}>Suspend</Button>
                          ) : r.status === 'suspended' ? (
                            <Button variant="green" size="sm" isLoading={actionLoading === r.id + 'active'} onClick={() => handleStatus(r.id, 'active')}>Reactivate</Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="py-10 text-center text-gray-400">No realtors in your territory yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3 p-4">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <MobileCard key={i}>
                  <Skeleton width="60%" height="14px" className="mb-2" />
                  <Skeleton width="40%" height="12px" />
                </MobileCard>
              ))
            ) : activeRealtors.length > 0 ? activeRealtors.map(r => {
              const sub = getRealtorSub(r.id);
              return (
                <MobileCard key={r.id} highlight={r.status === 'active' ? '#059669' : r.status === 'suspended' ? '#DC2626' : '#D4AF37'}>
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar initials={r.initials || '??'} size="sm" color={r.status === 'active' ? 'green' : 'gold'} />
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{r.full_name}</div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                    </div>
                  </div>
                  <MobileCardRow label="Plan">
                    {r.plan ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                        style={{ background: PLAN_STYLES[r.plan]?.bg || '#F3F4F6', color: PLAN_STYLES[r.plan]?.text || '#4B5563' }}>
                        {r.plan}
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </MobileCardRow>
                  <MobileCardRow label="Billing">
                    {!sub || sub.status === 'trialing' ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(212,175,55,0.12)', color: '#B8962E' }}>
                        Free Trial
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: sub.status === 'past_due' ? '#FEF2F2' : '#F0FDF4',
                          color: sub.status === 'past_due' ? '#DC2626' : '#059669',
                        }}>
                        {sub.status === 'past_due' ? 'Past Due' : 'Active'}
                      </span>
                    )}
                  </MobileCardRow>
                  <MobileCardRow label="Status">
                    <Badge status={r.status || 'active'} />
                  </MobileCardRow>
                  <MobileCardRow label="Joined">
                    <span className="text-gray-400 text-xs">{r.joined}</span>
                  </MobileCardRow>
                  <MobileCardActions>
                    <Button variant="outline" size="sm" onClick={() => setViewStatsId(viewStatsId === r.id ? null : r.id)}>
                      {viewStatsId === r.id ? 'Hide' : 'Stats'}
                    </Button>
                    {r.status === 'active' ? (
                      <Button variant="ghost" size="sm" isLoading={actionLoading === r.id + 'suspended'} style={{ color: '#DC2626' }} onClick={() => handleStatus(r.id, 'suspended')}>Suspend</Button>
                    ) : r.status === 'suspended' ? (
                      <Button variant="green" size="sm" isLoading={actionLoading === r.id + 'active'} onClick={() => handleStatus(r.id, 'active')}>Reactivate</Button>
                    ) : null}
                  </MobileCardActions>
                </MobileCard>
              );
            }) : (
              <p className="text-center text-gray-400 py-8 text-sm">No realtors in your territory yet</p>
            )}
          </div>

          {/* Inline stats expansion */}
          {statsRealtor && (
            <div className="mx-6 mb-5 p-5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="font-semibold text-gray-800 mb-3">Profile: {statsRealtor.full_name}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Plan', value: statsRealtor.plan || '—' },
                  { label: 'Status', value: statsRealtor.status || 'active' },
                  { label: 'Territory', value: statsRealtor.territory || '—' },
                  { label: 'Joined', value: statsRealtor.joined || '—' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-lg p-3">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</div>
                    <div className="text-sm font-bold text-gray-900 mt-1 capitalize">{s.value}</div>
                  </div>
                ))}
                {(() => {
                  const sub = getRealtorSub(statsRealtor.id);
                  const isTrialing = !sub || sub.status === 'trialing';
                  return (
                    <>
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Subscription</div>
                        <div className="text-sm font-bold mt-1 capitalize"
                          style={{ color: isTrialing ? '#B8962E' : (PLAN_STYLES[sub?.plan]?.text || '#111') }}>
                          {isTrialing ? 'Free Trial' : sub.plan}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Billing Status</div>
                        <div className="text-sm font-bold mt-1"
                          style={{ color: isTrialing ? '#B8962E' : (sub?.status === 'past_due' ? '#DC2626' : '#059669') }}>
                          {isTrialing ? 'Free Trial' : (sub?.status === 'past_due' ? 'Past Due' : 'Active')}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Your Override</div>
                        <div className="text-sm font-bold text-yellow-600 mt-1">
                          {isTrialing ? '$0/mo' : `$${Math.round((PLAN_PRICE[sub?.plan] || 0) * DIRECTOR_CUT)}/mo`}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </SectionCard>

      </div>

      {/* Invite Realtor Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); setInviteForm({ name: '', email: '' }); setInviteLink(''); setInviteGenerated(false); setLinkCopied(false); setEmailSent(false); setEmailSending(false); }}
        title="Invite Realtor to Your Territory"
        footer={<Button variant="ghost" onClick={() => { setInviteOpen(false); setInviteForm({ name: '', email: '' }); setInviteLink(''); setInviteGenerated(false); setLinkCopied(false); setEmailSent(false); setEmailSending(false); }}>Close</Button>}
      >
        <div className="flex flex-col gap-5">
          {/* How it works */}
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <HiUserPlus className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#D4AF37' }} />
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-1">How it works</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Enter the realtor's details to generate a personalised invite link. Share it or send it directly via email — they'll be assigned to your territory upon signup.
              </p>
            </div>
          </div>

          {/* Step 1 — Name & Email inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={inviteForm.name}
                onChange={e => { setInviteForm(f => ({ ...f, name: e.target.value })); setInviteGenerated(false); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                onFocus={e => e.target.style.borderColor = '#D4AF37'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={inviteForm.email}
                onChange={e => { setInviteForm(f => ({ ...f, email: e.target.value })); setInviteGenerated(false); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                onFocus={e => e.target.style.borderColor = '#D4AF37'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          </div>

          {/* Generate button */}
          {!inviteGenerated && (
            <Button variant="primary" onClick={generateInviteLink}>
              Generate Invite Link
            </Button>
          )}

          {/* Step 2 — Show generated link + actions */}
          {inviteGenerated && (
            <>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Invite Link</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg truncate text-gray-600">
                    {inviteLink}
                  </div>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex-shrink-0"
                    style={{
                      background: linkCopied ? '#F0FDF4' : '#1F4D3A',
                      color: linkCopied ? '#059669' : '#fff',
                      border: linkCopied ? '1px solid #BBF7D0' : 'none',
                    }}
                  >
                    {linkCopied ? <><HiCheckCircle className="w-4 h-4" /> Copied!</> : <><HiClipboardDocument className="w-4 h-4" /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Send via Email */}
              {emailSent ? (
                <div className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold"
                  style={{ background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }}>
                  <HiCheckCircle className="w-4 h-4" />
                  Email sent to {inviteForm.email}
                  <button
                    onClick={handleSendEmail}
                    disabled={emailSending}
                    className="ml-auto text-xs font-bold"
                    style={{ color: '#065F46', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Resend
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: emailSending ? '#F3F4F6' : 'rgba(212,175,55,0.1)',
                    color: emailSending ? '#9CA3AF' : '#B8962E',
                    border: `1px solid ${emailSending ? '#E5E7EB' : 'rgba(212,175,55,0.3)'}`,
                    cursor: emailSending ? 'not-allowed' : 'pointer',
                  }}
                >
                  <HiPaperAirplane className="w-4 h-4" />
                  {emailSending ? 'Sending…' : 'Send via Email'}
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Territory</div>
                  <div className="text-sm font-bold text-gray-900">{territory}</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">After Signup</div>
                  <div className="text-sm font-bold text-gray-900">Pending Your Approval</div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
