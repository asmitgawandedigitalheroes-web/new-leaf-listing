import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Skeleton from '../../../components/ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import { ActionPill } from '../../../components/shared/TableActions';
import MobileCard, { MobileCardRow, MobileCardActions } from '../../../components/shared/MobileCard';
import {
  HiCalendarDays,
  HiArrowTrendingUp,
  HiClock,
  HiCurrencyDollar,
  HiUsers,
  HiIdentification,
} from 'react-icons/hi2';

const STATUS_STYLES = {
  paid:     { bg: '#E8F3EE', text: '#1F4D3A' },
  approved: { bg: '#DBEAFE', text: '#1E40AF' },
  payable:  { bg: '#EDE9FE', text: '#5B21B6' },
  pending:  { bg: 'rgba(212,175,55,0.12)', text: '#B8962E' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount) {
  if (amount == null) return '—';
  return `$${Number(amount).toFixed(2)}`;
}

export default function DirectorBillingPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [isLoading, setIsLoading]         = useState(true);
  const [commissions, setCommissions]     = useState([]);
  const [payments, setPayments]           = useState([]);
  const [territoryStats, setTerritoryStats] = useState({ realtors: 0, activeSubs: 0 });

  // Payout request state
  const [payoutOpen, setPayoutOpen]           = useState(false);
  const [payoutAmount, setPayoutAmount]       = useState('');
  const [payoutNotes, setPayoutNotes]         = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Step 1: resolve all territories this director manages
      const { data: territories } = await supabase
        .from('territories')
        .select('id')
        .eq('director_id', user.id);
      const territoryIds = (territories || []).map(t => t.id);

      // Step 2: fetch active realtors across those territories
      let realtorIds = [];
      if (territoryIds.length > 0) {
        const { data: realtors } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'realtor')
          .eq('status', 'active')
          .in('territory_id', territoryIds);
        realtorIds = (realtors || []).map(r => r.id);
      }

      // Step 2: count active subscriptions for those realtors
      let activeSubs = 0;
      if (realtorIds.length > 0) {
        const { count } = await supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .in('user_id', realtorIds)
          .in('status', ['active', 'trialing']);
        activeSubs = count ?? 0;
      }

      setTerritoryStats({ realtors: realtorIds.length, activeSubs });

      // Step 3: commissions earned by this director
      const { data: commissionsData } = await supabase
        .from('commissions')
        .select('id, amount, status, type, created_at, source_transaction_id')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false });

      setCommissions(commissionsData || []);

      // Step 4: payment records for invoice history (unlikely for directors but keep clean state)
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, amount, status, created_at, stripe_payment_id, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12);

      setPayments(paymentsData || []);
    } catch (err) {
      console.error('[DirectorBillingPage] loadData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Earnings summary calculations
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const totalEarned = commissions
    .filter(c => ['paid', 'payable', 'approved'].includes(c.status))
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const pendingAmt = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const payableAmt = commissions
    .filter(c => c.status === 'payable')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const paidAmt = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const thisMonthAmt = commissions
    .filter(c => (c.created_at || '').startsWith(thisMonthKey))
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const summaryCards = [
    { label: 'Total Earned',  value: `$${totalEarned.toLocaleString()}`, color: '#D4AF37', icon: <HiArrowTrendingUp className="w-3.5 h-3.5" /> },
    { label: 'Pending',       value: `$${pendingAmt.toLocaleString()}`,  color: '#B8962E', icon: <HiClock className="w-3.5 h-3.5" /> },
    { label: 'Payable',       value: `$${payableAmt.toLocaleString()}`,  color: '#7C3AED', icon: <HiCurrencyDollar className="w-3.5 h-3.5" /> },
    { label: 'Paid Out',      value: `$${paidAmt.toLocaleString()}`,     color: '#1F4D3A', icon: <HiCalendarDays className="w-3.5 h-3.5" /> },
  ];

  // Payout request handler
  const handlePayoutRequest = async () => {
    const amount = Number(payoutAmount);
    if (!amount || amount <= 0) {
      addToast({ type: 'error', title: 'Invalid amount', desc: 'Please enter a valid payout amount.' });
      return;
    }
    if (amount > payableAmt) {
      addToast({ type: 'error', title: 'Amount too high', desc: `You can only request up to $${payableAmt.toLocaleString()} (your payable balance).` });
      return;
    }
    setPayoutSubmitting(true);
    const { error } = await supabase.from('payout_requests').insert({
      user_id: user.id,
      amount,
      payment_method: 'bank_transfer',
      notes: payoutNotes || null,
      status: 'pending',
    });
    setPayoutSubmitting(false);
    if (error) {
      addToast({ type: 'error', title: 'Request failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Payout requested', desc: `$${amount.toLocaleString()} payout request submitted. It will be processed within 3–5 business days.` });
      setPayoutOpen(false);
      setPayoutAmount('');
      setPayoutNotes('');
    }
  };

  return (
    <AppLayout role="director" title="Earnings & Payouts">
      <div className="p-4 md:p-6 flex flex-col gap-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Earnings &amp; Payouts</h2>
            <p className="text-sm text-gray-400">Your commission income from territory realtor subscriptions</p>
          </div>
          <Button variant="primary" onClick={() => setPayoutOpen(true)}>
            Request Payout
          </Button>
        </div>

        {/* Territory Summary Banner */}
        <div className="grid grid-cols-3 gap-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <Skeleton width="60px" height="12px" className="mb-2" />
                <Skeleton width="50px" height="28px" />
              </div>
            ))
          ) : [
            { label: 'Active Realtors',        value: territoryStats.realtors,  icon: <HiIdentification className="w-4 h-4" />, color: '#1F4D3A' },
            { label: 'Active Subscriptions',   value: territoryStats.activeSubs, icon: <HiUsers className="w-4 h-4" />,        color: '#D4AF37' },
            { label: 'This Month Earned',      value: `$${thisMonthAmt.toLocaleString()}`, icon: <HiCurrencyDollar className="w-4 h-4" />, color: '#7C3AED' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: `3px solid ${stat.color}` }}>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: stat.color }}>
                {stat.icon}<span>{stat.label}</span>
              </div>
              <div className="text-2xl font-black text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Earnings Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <Skeleton width="60px" height="12px" className="mb-2" />
                <Skeleton width="80px" height="28px" />
              </div>
            ))
          ) : summaryCards.map(c => (
            <div key={c.label} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)', borderLeft: `3px solid ${c.color}` }}>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{c.icon}<span>{c.label}</span></div>
              <div className="text-2xl font-black" style={{ color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Commission History */}
        <SectionCard title={`Commission History (${commissions.length})`}>
          {/* Desktop table */}
          <div className="hidden md:block data-table">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="160px" height="14px" /></td>
                      <td><Skeleton width="80px"  height="20px" /></td>
                      <td><Skeleton width="80px"  height="14px" /></td>
                      <td><Skeleton width="70px"  height="20px" /></td>
                      <td><Skeleton width="90px"  height="12px" /></td>
                    </tr>
                  ))
                ) : commissions.length > 0 ? commissions.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium text-gray-800 text-sm">
                      {c.source_transaction_id
                        ? `Tx #${c.source_transaction_id.slice(0, 8)}`
                        : `Commission #${c.id?.slice(0, 8)}`}
                    </td>
                    <td>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold capitalize"
                        style={{
                          background: c.type === 'deal' ? '#EDE9FE' : c.type === 'referral' ? '#FEF3C7' : '#F3F4F6',
                          color: c.type === 'deal' ? '#5B21B6' : c.type === 'referral' ? '#92400E' : '#4B5563',
                        }}>
                        {c.type || 'commission'}
                      </span>
                    </td>
                    <td className="font-bold text-gray-900">${Number(c.amount || 0).toLocaleString()}</td>
                    <td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase"
                        style={STATUS_STYLES[c.status] || STATUS_STYLES.pending}>
                        {c.status}
                      </span>
                    </td>
                    <td className="text-gray-400 text-sm">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No commissions recorded yet. Commissions are generated when realtors in your territory are billed.</td></tr>
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
            ) : commissions.length > 0 ? commissions.map(c => (
              <MobileCard key={c.id} highlight={(STATUS_STYLES[c.status] || STATUS_STYLES.pending).text}>
                <div className="font-semibold text-gray-800 text-sm mb-2">
                  {c.source_transaction_id
                    ? `Tx #${c.source_transaction_id.slice(0, 8)}`
                    : `Commission #${c.id?.slice(0, 8)}`}
                </div>
                <MobileCardRow label="Type">
                  <span className="text-xs px-2 py-0.5 rounded font-semibold capitalize"
                    style={{
                      background: c.type === 'deal' ? '#EDE9FE' : c.type === 'referral' ? '#FEF3C7' : '#F3F4F6',
                      color: c.type === 'deal' ? '#5B21B6' : c.type === 'referral' ? '#92400E' : '#4B5563',
                    }}>
                    {c.type || 'commission'}
                  </span>
                </MobileCardRow>
                <MobileCardRow label="Amount">
                  <span className="font-bold text-gray-900">${Number(c.amount || 0).toLocaleString()}</span>
                </MobileCardRow>
                <MobileCardRow label="Status">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase"
                    style={STATUS_STYLES[c.status] || STATUS_STYLES.pending}>
                    {c.status}
                  </span>
                </MobileCardRow>
                <MobileCardRow label="Date">
                  <span className="text-gray-400 text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                  </span>
                </MobileCardRow>
              </MobileCard>
            )) : (
              <p className="text-center text-gray-400 py-8 text-sm">No commissions recorded yet. Commissions are generated when realtors in your territory are billed.</p>
            )}
          </div>
        </SectionCard>

        {/* Invoice History (platform payments to this account — typically empty for directors) */}
        <SectionCard title="Payment Records">
          {/* Desktop table */}
          <div className="hidden md:block data-table">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(2)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="120px" height="12px" /></td>
                      <td><Skeleton width="80px"  height="12px" /></td>
                      <td><Skeleton width="50px"  height="12px" /></td>
                      <td><Skeleton width="60px"  height="20px" /></td>
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">
                      No payment records on file for your account.
                    </td>
                  </tr>
                ) : payments.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-mono text-sm" style={{ color: '#4B5563' }}>
                      {inv.stripe_payment_id
                        ? inv.stripe_payment_id.slice(0, 16) + '…'
                        : `PAY-${inv.id.slice(0, 8).toUpperCase()}`}
                    </td>
                    <td style={{ color: '#6B7280' }}>{formatDate(inv.created_at)}</td>
                    <td className="font-semibold" style={{ color: '#111111' }}>{formatCurrency(inv.amount)}</td>
                    <td>
                      <Badge
                        status={inv.status === 'succeeded' ? 'active' : inv.status === 'pending' ? 'pending' : 'rejected'}
                        label={inv.status === 'succeeded' ? 'Paid' : inv.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3 p-4">
            {isLoading ? (
              [...Array(2)].map((_, i) => (
                <MobileCard key={i}>
                  <Skeleton width="60%" height="14px" className="mb-2" />
                  <Skeleton width="40%" height="12px" />
                </MobileCard>
              ))
            ) : payments.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No payment records on file for your account.</p>
            ) : payments.map(inv => (
              <MobileCard key={inv.id}>
                <div className="font-mono text-sm font-semibold text-gray-700 mb-2">
                  {inv.stripe_payment_id
                    ? inv.stripe_payment_id.slice(0, 16) + '…'
                    : `PAY-${inv.id.slice(0, 8).toUpperCase()}`}
                </div>
                <MobileCardRow label="Date">
                  <span className="text-gray-500 text-xs">{formatDate(inv.created_at)}</span>
                </MobileCardRow>
                <MobileCardRow label="Amount">
                  <span className="font-semibold text-gray-900">{formatCurrency(inv.amount)}</span>
                </MobileCardRow>
                <MobileCardRow label="Status">
                  <Badge
                    status={inv.status === 'succeeded' ? 'active' : inv.status === 'pending' ? 'pending' : 'rejected'}
                    label={inv.status === 'succeeded' ? 'Paid' : inv.status}
                  />
                </MobileCardRow>
              </MobileCard>
            ))}
          </div>
        </SectionCard>

      </div>

      {/* Payout Request Modal */}
      <Modal
        open={payoutOpen}
        onClose={() => { setPayoutOpen(false); setPayoutAmount(''); setPayoutNotes(''); }}
        title="Request Payout"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setPayoutOpen(false); setPayoutAmount(''); setPayoutNotes(''); }}>Cancel</Button>
            <Button variant="primary" onClick={handlePayoutRequest} isLoading={payoutSubmitting}>Submit Request</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-gray-50">
            <div className="text-sm text-gray-500 mb-1">Available for payout</div>
            <div className="text-3xl font-black" style={{ color: '#D4AF37' }}>
              ${payableAmt.toLocaleString()}
            </div>
            {payableAmt === 0 && (
              <p className="text-xs text-gray-400 mt-1">No payable balance at this time. Commissions move to payable once approved by admin.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount *</label>
            <input
              type="number"
              placeholder={`Max $${payableAmt.toLocaleString()}`}
              value={payoutAmount}
              min="1"
              max={payableAmt}
              onChange={e => setPayoutAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Payment Method</label>
            <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
            <textarea
              rows={2}
              value={payoutNotes}
              onChange={e => setPayoutNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
              placeholder="Any notes for this payout request..."
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
