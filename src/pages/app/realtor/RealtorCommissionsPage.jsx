import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Skeleton from '../../../components/ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  HiCalendarDays,
  HiClock,
  HiArrowTrendingUp,
  HiCurrencyDollar,
  HiHome,
  HiClipboardDocumentList,
  HiLockClosed,
} from 'react-icons/hi2';

const STATUS_STYLES = {
  paid:     { bg: '#E8F3EE', text: '#1F4D3A' },
  approved: { bg: '#DBEAFE', text: '#1E40AF' },
  payable:  { bg: '#EDE9FE', text: '#5B21B6' },
  pending:  { bg: 'rgba(212,175,55,0.12)', text: '#B8962E' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function RealtorCommissionsPage() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeComm, setActiveComm] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    async function fetchCommissions() {
      setIsLoading(true);
      const { data } = await supabase
        .from('commissions')
        .select('*, listing:listings(title, city, price)')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false });
      setCommissions(data || []);
      setIsLoading(false);
    }
    fetchCommissions();
  }, [user?.id]);

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ytdKey = now.getFullYear().toString();

  const thisMonth = commissions.filter(c => (c.created_at || '').startsWith(thisMonthKey)).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const pending   = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const ytd       = commissions.filter(c => (c.created_at || '').startsWith(ytdKey)).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const upcoming  = commissions.filter(c => c.status === 'payable').reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const summaryCards = [
    { label: 'This Month', value: `$${thisMonth.toLocaleString()}`, color: '#D4AF37', icon: <HiCalendarDays className="w-3.5 h-3.5" /> },
    { label: 'Pending',    value: `$${pending.toLocaleString()}`,   color: '#B8962E', icon: <HiClock className="w-3.5 h-3.5" /> },
    { label: 'YTD',        value: `$${ytd.toLocaleString()}`,       color: '#1F4D3A', icon: <HiArrowTrendingUp className="w-3.5 h-3.5" /> },
    { label: 'Upcoming',   value: `$${upcoming.toLocaleString()}`,  color: '#7C3AED', icon: <HiCurrencyDollar className="w-3.5 h-3.5" /> },
  ];

  return (
    <AppLayout role="realtor" title="Commissions">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Summary Cards */}
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

        {/* How commissions work */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">ℹ️</span>
            <span className="font-semibold text-gray-800">How Commissions Work</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { icon: <HiHome className="w-5 h-5 text-blue-600" />, title: 'Deal Commission', desc: 'You earn your share of the deal commission when a lead you managed converts to a sale.' },
              { icon: <HiClipboardDocumentList className="w-5 h-5 text-purple-600" />, title: 'Subscription', desc: 'Monthly subscription fees (Standard/Featured/Top) are tracked as commission entries.' },
              { icon: <HiLockClosed className="w-5 h-5" style={{ color: '#B8962E' }} />, title: '180-Day Protection', desc: 'Any lead assigned to you is yours for 180 days. No commission disputes during this window.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <div className="font-semibold text-gray-800 mb-0.5">{item.title}</div>
                  <div className="text-gray-500 text-xs leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commission History Table */}
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
                  <>
                    <tr key={c.id} className="cursor-pointer" onClick={() => setActiveComm(activeComm === c.id ? null : c.id)}>
                      <td>
                        <div className="font-medium text-gray-900 text-sm">
                          {c.listing?.title || c.source_payment_id || `Commission #${c.id?.slice(0, 8)}`}
                        </div>
                        {c.listing?.city && <div className="text-xs text-gray-400">{c.listing.city}</div>}
                      </td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold capitalize"
                          style={{
                            background: c.commission_type === 'deal' ? '#EDE9FE' : '#F3F4F6',
                            color: c.commission_type === 'deal' ? '#5B21B6' : '#4B5563',
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
                    {activeComm === c.id && (
                      <tr key={`${c.id}-detail`} className="bg-gray-50">
                        <td colSpan={5} className="px-6 py-3">
                          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Commission Breakdown</div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Total Amount: </span>
                              <span className="font-semibold">${Number(c.amount || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Type: </span>
                              <span className="font-semibold capitalize">{c.commission_type || '—'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Status: </span>
                              <span className="font-semibold capitalize">{c.status}</span>
                            </div>
                            {c.paid_at && (
                              <div>
                                <span className="text-gray-400">Paid At: </span>
                                <span className="font-semibold">{new Date(c.paid_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )) : (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No commissions recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

      </div>
    </AppLayout>
  );
}
