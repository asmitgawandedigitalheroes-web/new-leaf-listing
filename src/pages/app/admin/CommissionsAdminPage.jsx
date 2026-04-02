import { useState, useMemo, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import KPICard from '../../../components/shared/KPICard';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { useCommissions } from '../../../hooks/useCommissions';
import { supabase } from '../../../lib/supabase';
import {
  HiClock,
  HiCheckBadge,
  HiCreditCard,
  HiBanknotes,
  HiArrowPath,
} from 'react-icons/hi2';

// Default split percentages — overridden by platform_settings if available
const DEFAULT_RATES = {
  realtor: 45,
  director: 25,
  admin: 15,
  platform: 15,
};

const STATUS_STYLES = {
  pending:  { bg: 'rgba(212,175,55,0.12)', text: '#B8962E', dot: '#D4AF37' },
  approved: { bg: '#DBEAFE', text: '#1E40AF', dot: '#2563EB' },
  payable:  { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED' },
  paid:     { bg: '#E8F3EE', text: '#1F4D3A', dot: '#22C55E' },
  rejected: { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

export default function CommissionsAdminPage() {
  const { addToast } = useToast();
  const {
    commissions, isLoading, refresh,
    approveCommission, rejectCommission,
    markPayable, markPaid,
    bulkApprove, bulkMarkPayable, bulkMarkPaid,
  } = useCommissions();

  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUser, setFilterUser]     = useState('all');
  const [selected, setSelected]         = useState([]);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownTarget, setBreakdownTarget] = useState(null);
  const [rates, setRates] = useState(DEFAULT_RATES);

  // Load commission split rates from platform_settings
  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['commission_realtor_pct', 'commission_director_pct', 'commission_admin_pct', 'commission_platform_pct'])
      .then(({ data }) => {
        if (!data?.length) return;
        const map = {};
        data.forEach(r => { map[r.key] = Number(r.value) || 0; });
        setRates({
          realtor:  map['commission_realtor_pct']  ?? DEFAULT_RATES.realtor,
          director: map['commission_director_pct'] ?? DEFAULT_RATES.director,
          admin:    map['commission_admin_pct']    ?? DEFAULT_RATES.admin,
          platform: map['commission_platform_pct'] ?? DEFAULT_RATES.platform,
        });
      });
  }, []);

  const filtered = useMemo(() => {
    return commissions.filter(c => {
      if (filterType !== 'all' && c.type !== filterType) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterUser !== 'all' && c.recipient !== filterUser) return false;
      return true;
    });
  }, [commissions, filterType, filterStatus, filterUser]);

  const kpis = [
    { label: 'Pending ($)',    value: `$${commissions.filter(c => c.status === 'pending').reduce((a, c) => a + c.amount, 0).toLocaleString()}`,  trend: null, trendLabel: '', icon: <HiClock className="text-yellow-600" /> },
    { label: 'Approved ($)',   value: `$${commissions.filter(c => c.status === 'approved').reduce((a, c) => a + c.amount, 0).toLocaleString()}`, trend: null, trendLabel: '', icon: <HiCheckBadge className="text-blue-600" /> },
    { label: 'Payable ($)',    value: `$${commissions.filter(c => c.status === 'payable').reduce((a, c) => a + c.amount, 0).toLocaleString()}`,  trend: null, trendLabel: '', icon: <HiCreditCard className="text-purple-600" /> },
    { label: 'Total Paid ($)', value: `$${commissions.filter(c => c.status === 'paid').reduce((a, c) => a + c.amount, 0).toLocaleString()}`,    trend: null, trendLabel: '', icon: <HiBanknotes className="text-green-600" /> },
  ];

  const recipients      = ['all', ...new Set(commissions.map(c => c.recipient).filter(Boolean))];
  const allPendingIds   = filtered.filter(c => c.status === 'pending').map(c => c.id);
  const allApprovedIds  = filtered.filter(c => c.status === 'approved').map(c => c.id);
  const allPayableIds   = filtered.filter(c => c.status === 'payable').map(c => c.id);
  const selectableIds   = [...allPendingIds, ...allApprovedIds, ...allPayableIds];
  const allSelected     = selectableIds.length > 0 && selectableIds.every(id => selected.includes(id));

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll    = () => {
    if (allSelected) setSelected(prev => prev.filter(id => !selectableIds.includes(id)));
    else setSelected(prev => [...new Set([...prev, ...selectableIds])]);
  };

  const toast = (res, successMsg) =>
    addToast(res.error
      ? { type: 'error', title: 'Action failed', desc: res.error.message }
      : { type: 'success', title: successMsg });

  const handleApprove    = async (id) => toast(await approveCommission(id),  'Commission approved');
  const handleReject     = async (id) => toast(await rejectCommission(id),   'Commission rejected');
  const handlePayable    = async (id) => toast(await markPayable(id),         'Marked as payable');
  const handlePaid       = async (id) => toast(await markPaid(id),            'Marked as paid');

  const handleBulkApprove = async () => {
    const ids = selected.filter(id => allPendingIds.includes(id));
    if (!ids.length) return;
    toast(await bulkApprove(ids), `Approved ${ids.length} commissions`);
    setSelected(prev => prev.filter(id => !ids.includes(id)));
  };

  const handleBulkPayable = async () => {
    const ids = selected.filter(id => allApprovedIds.includes(id));
    if (!ids.length) return;
    toast(await bulkMarkPayable(ids), `Marked ${ids.length} commissions as payable`);
    setSelected(prev => prev.filter(id => !ids.includes(id)));
  };

  const handleBulkPaid = async () => {
    const ids = selected.filter(id => allPayableIds.includes(id));
    if (!ids.length) return;
    toast(await bulkMarkPaid(ids), `Marked ${ids.length} commissions as paid`);
    setSelected(prev => prev.filter(id => !ids.includes(id)));
  };

  const openBreakdown = (comm) => { setBreakdownTarget(comm); setBreakdownOpen(true); };

  const selectClass = 'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white';

  return (
    <AppLayout role="admin" title="Commissions">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Commissions</h2>
            <p className="text-sm text-gray-400 mt-0.5">{commissions.length} total records</p>
          </div>
          <button onClick={refresh} title="Refresh" className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
            <HiArrowPath size={16} className="text-gray-500" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(k => <KPICard key={k.label} {...k} />)}
        </div>

        {/* Filters + Bulk */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-3">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectClass}>
              <option value="all">All Types</option>
              <option value="subscription">Subscription</option>
              <option value="listing">Listing</option>
              <option value="deal">Deal</option>
              <option value="referral">Referral</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectClass}>
              <option value="all">All Statuses</option>
              <option>pending</option><option>approved</option><option>payable</option><option>paid</option><option>rejected</option>
            </select>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className={selectClass}>
              <option value="all">All Recipients</option>
              {recipients.filter(r => r !== 'all').map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          {selected.length > 0 && (
            <div className="flex gap-2">
              {selected.some(id => allPendingIds.includes(id)) && (
                <Button variant="green" size="sm" onClick={handleBulkApprove}>
                  Approve ({selected.filter(id => allPendingIds.includes(id)).length})
                </Button>
              )}
              {selected.some(id => allApprovedIds.includes(id)) && (
                <Button variant="outline" size="sm" onClick={handleBulkPayable}
                  style={{ borderColor: '#7C3AED', color: '#7C3AED' }}>
                  Mark Payable ({selected.filter(id => allApprovedIds.includes(id)).length})
                </Button>
              )}
              {selected.some(id => allPayableIds.includes(id)) && (
                <Button variant="outline" size="sm" onClick={handleBulkPaid}
                  style={{ borderColor: '#22C55E', color: '#15803D' }}>
                  Mark Paid ({selected.filter(id => allPayableIds.includes(id)).length})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <SectionCard title={`Commissions (${filtered.length})`}>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded" />
                  </th>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Recipient</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="16px" height="16px" /></td>
                      <td><Skeleton width="70px" height="12px" /></td>
                      <td><Skeleton width="80px" height="20px" /></td>
                      <td><div className="flex items-center gap-2"><Skeleton variant="circle" width="28px" height="28px" /><Skeleton width="100px" height="12px" /></div></td>
                      <td><Skeleton width="60px" height="12px" /></td>
                      <td><Skeleton width="70px" height="20px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                      <td><div className="flex gap-2"><Skeleton width="70px" height="26px" /><Skeleton width="60px" height="26px" /></div></td>
                    </tr>
                  ))
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      {['pending', 'approved', 'payable'].includes(c.status) && (
                        <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded" />
                      )}
                    </td>
                    <td className="font-mono text-xs text-gray-500">{c.id.slice(0, 8)}…</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                        style={{
                          background: c.type === 'listing' || c.type === 'deal' ? '#EDE9FE' : c.type === 'referral' ? '#FEF3C7' : '#F3F4F6',
                          color: c.type === 'listing' || c.type === 'deal' ? '#5B21B6' : c.type === 'referral' ? '#92400E' : '#4B5563',
                        }}>
                        {c.type}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar initials={c.initials} size="sm" color={c.role === 'director' ? 'green' : 'gold'} />
                        <div>
                          <div className="font-medium text-sm text-gray-900">{c.recipient}</div>
                          <div className="text-xs text-gray-400 capitalize">{c.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-semibold text-gray-900">${c.amount.toLocaleString()}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-gray-400 text-sm">{c.date}</td>
                    <td>
                      <div className="flex gap-1.5 flex-wrap">
                        <Button variant="ghost" size="sm" onClick={() => openBreakdown(c)}>Breakdown</Button>
                        {c.status === 'pending' && (
                          <>
                            <Button variant="green" size="sm" onClick={() => handleApprove(c.id)}>Approve</Button>
                            <Button variant="danger" size="sm" onClick={() => handleReject(c.id)}>Reject</Button>
                          </>
                        )}
                        {c.status === 'approved' && (
                          <Button variant="outline" size="sm" onClick={() => handlePayable(c.id)}
                            style={{ borderColor: '#7C3AED', color: '#7C3AED' }}>
                            Mark Payable
                          </Button>
                        )}
                        {c.status === 'payable' && (
                          <Button variant="outline" size="sm" onClick={() => handlePaid(c.id)}
                            style={{ borderColor: '#22C55E', color: '#15803D' }}>
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <HiBanknotes className="mx-auto text-4xl text-gray-200 mb-4" />
              <p className="font-medium">No commissions found</p>
              <p className="text-sm mt-1">Commission records will appear here once created</p>
            </div>
          )}
        </SectionCard>

      </div>

      {/* Breakdown Modal */}
      <Modal open={breakdownOpen} onClose={() => setBreakdownOpen(false)}
        title={breakdownTarget ? `Commission Breakdown — ${breakdownTarget.id.slice(0, 8)}…` : 'Commission Breakdown'} maxWidth="480px">
        {breakdownTarget && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Total Amount</span>
              <span className="text-xl font-black text-gray-900">${breakdownTarget.amount.toLocaleString()}</span>
            </div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Split Breakdown</div>
            {[
              { label: `Realtor Share (${rates.realtor}%)`,  pct: rates.realtor,  color: '#1F4D3A' },
              { label: `Director (${rates.director}%)`,      pct: rates.director, color: '#D4AF37' },
              { label: `Admin (${rates.admin}%)`,            pct: rates.admin,    color: '#3B82F6' },
              { label: `Platform (${rates.platform}%)`,      pct: rates.platform, color: '#8B5CF6' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{row.label}</span>
                  <span className="font-semibold" style={{ color: row.color }}>
                    ${Math.round(breakdownTarget.amount * row.pct / 100).toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                </div>
              </div>
            ))}
            <div className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm">
              <span className="font-semibold text-gray-600">Status: </span>
              <StatusBadge status={breakdownTarget.status} />
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
