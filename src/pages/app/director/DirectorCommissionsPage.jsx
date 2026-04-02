import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import BarChart from '../../../components/shared/BarChart';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Skeleton from '../../../components/ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import {
  HiCalendarDays,
  HiArrowTrendingUp,
  HiClock,
  HiCurrencyDollar,
} from 'react-icons/hi2';

const STATUS_STYLES = {
  paid:     { bg: '#E8F3EE', text: '#1F4D3A' },
  approved: { bg: '#DBEAFE', text: '#1E40AF' },
  payable:  { bg: '#EDE9FE', text: '#5B21B6' },
  pending:  { bg: 'rgba(212,175,55,0.12)', text: '#B8962E' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function DirectorCommissionsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [commissions, setCommissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    async function fetchCommissions() {
      setIsLoading(true);
      const { data } = await supabase
        .from('commissions')
        .select('*, listing:listings(title, city)')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false });
      setCommissions(data || []);
      setIsLoading(false);
    }
    fetchCommissions();
  }, [user?.id]);

  // Timeline: last 6 months from real data
  const timelineData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      const total = commissions
        .filter(c => (c.created_at || '').startsWith(key))
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      months.push({ label, value: Math.round(total / 100) }); // in $100 units
    }
    return months;
  }, [commissions]);

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const types = ['subscription', 'deal', 'referral'];
    const colors = { subscription: '#D4AF37', deal: '#1F4D3A', referral: '#7C3AED' };
    return types.map(type => ({
      label: type.charAt(0).toUpperCase() + type.slice(1),
      amount: commissions
        .filter(c => (c.commission_type || '').toLowerCase() === type)
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
      color: colors[type],
    })).filter(s => s.amount > 0);
  }, [commissions]);
  const maxSource = Math.max(...sourceBreakdown.map(s => s.amount), 1);

  // Summary cards
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const thisMonth = commissions
    .filter(c => (c.created_at || '').startsWith(thisMonthKey))
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const ytd = commissions
    .filter(c => (c.created_at || '').startsWith(now.getFullYear().toString()))
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const pending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const payable = commissions.filter(c => c.status === 'payable').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const summaryCards = [
    { label: 'This Month', value: `$${thisMonth.toLocaleString()}`, color: '#D4AF37', icon: <HiCalendarDays className="w-3.5 h-3.5" /> },
    { label: 'YTD Earnings', value: `$${ytd.toLocaleString()}`, color: '#1F4D3A', icon: <HiArrowTrendingUp className="w-3.5 h-3.5" /> },
    { label: 'Pending', value: `$${pending.toLocaleString()}`, color: '#B8962E', icon: <HiClock className="w-3.5 h-3.5" /> },
    { label: 'Payable', value: `$${payable.toLocaleString()}`, color: '#7C3AED', icon: <HiCurrencyDollar className="w-3.5 h-3.5" /> },
  ];

  const handlePayoutRequest = () => {
    addToast({ type: 'info', title: 'Payout requested', desc: 'Your payout request will be processed within 3–5 business days.' });
    setPayoutOpen(false);
  };

  return (
    <AppLayout role="director" title="My Commissions">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Commissions</h2>
            <p className="text-sm text-gray-400">Director share on all territory activity</p>
          </div>
          <Button variant="primary" onClick={() => setPayoutOpen(true)}>Request Payout</Button>
        </div>

        {/* Summary cards */}
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

        {/* Chart + Source breakdown */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SectionCard title="Earnings Timeline (Last 6 Months)">
              <div className="px-6 py-5">
                {isLoading ? (
                  <Skeleton width="100%" height="160px" />
                ) : (
                  <>
                    <BarChart data={timelineData} color="gold" height={160} />
                    <div className="text-center text-xs text-gray-400 mt-1">(Values in $100 increments)</div>
                  </>
                )}
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Source Breakdown">
            <div className="px-6 py-5 flex flex-col gap-5">
              {isLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} width="100%" height="40px" />)
              ) : sourceBreakdown.length > 0 ? sourceBreakdown.map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600 font-medium">{s.label}</span>
                    <span className="font-semibold" style={{ color: s.color }}>${s.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(s.amount / maxSource) * 100}%`, background: s.color }} />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center py-4">No commissions yet</p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Commission Details Table */}
        <SectionCard title={`Commission History (${commissions.length})`}>
          <div className="data-table">
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
                      <td><Skeleton width="80px" height="20px" /></td>
                      <td><Skeleton width="80px" height="14px" /></td>
                      <td><Skeleton width="70px" height="20px" /></td>
                      <td><Skeleton width="90px" height="12px" /></td>
                    </tr>
                  ))
                ) : commissions.length > 0 ? commissions.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium text-gray-800 text-sm">
                      {c.listing?.title || c.source_payment_id || `Commission #${c.id?.slice(0, 8)}`}
                    </td>
                    <td>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold capitalize"
                        style={{
                          background: c.commission_type === 'deal' ? '#EDE9FE' : c.commission_type === 'referral' ? '#FEF3C7' : '#F3F4F6',
                          color: c.commission_type === 'deal' ? '#5B21B6' : c.commission_type === 'referral' ? '#92400E' : '#4B5563',
                        }}>
                        {c.commission_type || 'commission'}
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
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No commissions recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

      </div>

      {/* Payout Request Modal */}
      <Modal
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        title="Request Payout"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayoutOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handlePayoutRequest}>Submit Request</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-gray-50">
            <div className="text-sm text-gray-500 mb-1">Available for payout</div>
            <div className="text-3xl font-black" style={{ color: '#D4AF37' }}>
              ${payable.toLocaleString()}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount</label>
            <input
              type="number"
              placeholder="Enter amount"
              value={payoutAmount}
              onChange={e => setPayoutAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Payment Method</label>
            <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
              <option>Bank Transfer</option>
              <option>Add New Method</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
            <textarea rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" placeholder="Any notes for this payout..." />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
