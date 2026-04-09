import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Skeleton from '../../../components/ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import { ActionPill } from '../../../components/shared/TableActions';
import MobileCard, { MobileCardRow, MobileCardActions } from '../../../components/shared/MobileCard';
import {
  HiCurrencyDollar,
  HiClock,
  HiCheckCircle,
  HiArrowTrendingUp,
  HiMagnifyingGlass,
  HiArrowDownTray,
} from 'react-icons/hi2';

function exportCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const STATUS_STYLES = {
  pending:   { bg: 'rgba(212,175,55,0.12)', text: '#B8962E', dot: '#D4AF37', label: 'Pending' },
  approved:  { bg: '#DBEAFE', text: '#1E40AF', dot: '#2563EB', label: 'Approved' },
  processed: { bg: '#E8F3EE', text: '#1F4D3A', dot: '#22C55E', label: 'Processed' },
  rejected:  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626', label: 'Rejected' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export default function PayoutsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [viewRequest, setViewRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('payout_requests')
      .select(`
        *,
        user:profiles!payout_requests_user_id_fkey(full_name, email, role)
      `)
      .order('created_at', { ascending: false });
    if (!error) setRequests(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const filtered = useMemo(() => {
    let list = requests;
    if (activeTab !== 'all') list = list.filter(r => r.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.user?.full_name || '').toLowerCase().includes(q) ||
        (r.user?.email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, activeTab, search]);

  const totals = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    processed: requests.filter(r => r.status === 'processed').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    pendingAmt: requests.filter(r => r.status === 'pending').reduce((s, r) => s + (Number(r.amount) || 0), 0),
    processedAmt: requests.filter(r => r.status === 'processed').reduce((s, r) => s + (Number(r.amount) || 0), 0),
  };

  const handleAction = async (id, status, notes = null) => {
    setActionLoading(id + status);
    const updates = {
      status,
      updated_at: new Date().toISOString(),
      ...(notes ? { admin_notes: notes } : {}),
      ...(status === 'processed' ? { processed_at: new Date().toISOString(), processed_by: user.id } : {}),
      ...(status === 'approved' ? { approved_at: new Date().toISOString(), approved_by: user.id } : {}),
    };
    const { error } = await supabase.from('payout_requests').update(updates).eq('id', id);
    setActionLoading(null);
    if (error) {
      addToast({ type: 'error', title: 'Update failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: `Payout ${status}` });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      if (viewRequest?.id === id) setViewRequest(prev => ({ ...prev, ...updates }));
      if (status !== 'approved') { setViewRequest(null); setAdminNotes(''); }
    }
  };

  const kpis = [
    { label: 'Total Requests', value: totals.all, icon: HiCurrencyDollar, color: '#6B7280' },
    { label: 'Pending', value: totals.pending, icon: HiClock, color: '#D4AF37',
      sub: `$${totals.pendingAmt.toLocaleString()} requested` },
    { label: 'Approved', value: totals.approved, icon: HiArrowTrendingUp, color: '#2563EB' },
    { label: 'Processed', value: totals.processed, icon: HiCheckCircle, color: '#1F4D3A',
      sub: `$${totals.processedAmt.toLocaleString()} paid out` },
  ];

  const TABS = ['all', 'pending', 'approved', 'processed', 'rejected'];

  return (
    <AppLayout role="admin" title="Payout Requests">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payout Requests</h2>
            <p className="text-sm text-gray-400 mt-0.5">Review and process payout requests from directors and realtors</p>
          </div>
          <button
            onClick={() => exportCSV(filtered.map(r => ({
              Name: r.user?.full_name || '',
              Email: r.user?.email || '',
              Role: r.user?.role || '',
              Amount: r.amount,
              Method: r.payment_method || '',
              Status: r.status,
              Requested: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
              Admin_Notes: r.admin_notes || '',
            })), 'payouts.csv')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600 self-start sm:self-auto"
          >
            <HiArrowDownTray size={15} />
            Export CSV
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white rounded-2xl p-5"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)', borderLeft: `3px solid ${k.color}` }}>
              <div className="flex items-center gap-2 mb-2">
                <k.icon size={16} style={{ color: k.color }} />
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{k.label}</span>
              </div>
              {isLoading
                ? <Skeleton width="60px" height="24px" />
                : <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>}
              {k.sub && <div className="text-xs text-gray-400 mt-1">{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* Table */}
        <SectionCard
          title={`Requests (${filtered.length})`}
          action={
            <div className="relative w-full sm:w-auto">
              <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none w-full sm:w-44"
                onFocus={e => e.target.style.borderColor = '#D4AF37'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          }
        >
          {/* Tabs */}
          <div className="flex gap-2 px-6 pt-4 pb-1 overflow-x-auto border-b border-gray-100">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all capitalize"
                style={{
                  background: activeTab === t ? '#1F4D3A' : '#F3F4F6',
                  color: activeTab === t ? '#fff' : '#4B5563',
                }}
              >
                {t} {totals[t] > 0 && `(${totals[t]})`}
              </button>
            ))}
          </div>

          <div className="hidden md:block data-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="150px" height="12px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                      <td><Skeleton width="100px" height="12px" /></td>
                      <td><Skeleton width="80px" height="20px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                      <td><Skeleton width="160px" height="28px" /></td>
                    </tr>
                  ))
                ) : filtered.length > 0 ? filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-medium text-gray-900 text-sm">{r.user?.full_name || '—'}</div>
                      <div className="text-xs text-gray-400">{r.user?.email || ''}</div>
                    </td>
                    <td className="font-bold text-gray-900">${Number(r.amount || 0).toLocaleString()}</td>
                    <td className="text-gray-600 text-sm capitalize">{(r.payment_method || 'bank_transfer').replace('_', ' ')}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-gray-400 text-sm">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="flex gap-1.5 flex-wrap">
                        <Button variant="outline" size="sm"
                          onClick={() => { setViewRequest(r); setAdminNotes(r.admin_notes || ''); }}>
                          View
                        </Button>
                        {r.status === 'pending' && (
                          <>
                            <Button variant="green" size="sm"
                              isLoading={actionLoading === r.id + 'approved'}
                              onClick={() => handleAction(r.id, 'approved')}>
                              Approve
                            </Button>
                            <Button variant="danger" size="sm"
                              isLoading={actionLoading === r.id + 'rejected'}
                              onClick={() => handleAction(r.id, 'rejected')}>
                              Reject
                            </Button>
                          </>
                        )}
                        {r.status === 'approved' && (
                          <Button variant="primary" size="sm"
                            isLoading={actionLoading === r.id + 'processed'}
                            onClick={() => handleAction(r.id, 'processed')}>
                            Mark Processed
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <HiCurrencyDollar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      No payout requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3 p-4">
            {isLoading ? [...Array(3)].map((_, i) => (
              <MobileCard key={i}>
                <Skeleton variant="text" width="60%" className="mb-2" />
                <Skeleton variant="text" width="40%" />
              </MobileCard>
            )) : filtered.length > 0 ? filtered.map(r => (
              <MobileCard key={r.id}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{r.user?.full_name || '—'}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>{r.user?.email || ''}</div>
                <MobileCardRow label="Amount">${Number(r.amount || 0).toLocaleString()}</MobileCardRow>
                <MobileCardRow label="Method">{(r.payment_method || 'bank_transfer').replace('_', ' ')}</MobileCardRow>
                <MobileCardRow label="Status"><StatusBadge status={r.status} /></MobileCardRow>
                <MobileCardRow label="Requested">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</MobileCardRow>
                <MobileCardActions>
                  <ActionPill label="View" color="#1D4ED8" bg="rgba(219,234,254,0.8)" onClick={() => { setViewRequest(r); setAdminNotes(r.admin_notes || ''); }} />
                  {r.status === 'pending' && (
                    <>
                      <ActionPill label="Approve" color="#fff" bg="#22C55E" onClick={() => handleAction(r.id, 'approved')} />
                      <ActionPill label="Reject" color="#DC2626" bg="rgba(254,226,226,0.8)" onClick={() => handleAction(r.id, 'rejected')} />
                    </>
                  )}
                </MobileCardActions>
              </MobileCard>
            )) : (
              <div className="py-12 text-center text-gray-400">
                <HiCurrencyDollar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="font-medium">No payout requests found</p>
              </div>
            )}
          </div>
        </SectionCard>

      </div>

      {/* View Modal */}
      <Modal
        open={!!viewRequest}
        onClose={() => { setViewRequest(null); setAdminNotes(''); }}
        title="Payout Request Details"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setViewRequest(null); setAdminNotes(''); }}>Close</Button>
            {viewRequest?.status === 'pending' && (
              <>
                <Button variant="ghost" style={{ color: '#DC2626' }}
                  isLoading={actionLoading === viewRequest?.id + 'rejected'}
                  onClick={() => handleAction(viewRequest.id, 'rejected', adminNotes)}>
                  Reject
                </Button>
                <Button variant="primary"
                  isLoading={actionLoading === viewRequest?.id + 'approved'}
                  onClick={() => handleAction(viewRequest.id, 'approved', adminNotes)}>
                  Approve
                </Button>
              </>
            )}
            {viewRequest?.status === 'approved' && (
              <Button variant="primary"
                isLoading={actionLoading === viewRequest?.id + 'processed'}
                onClick={() => handleAction(viewRequest.id, 'processed', adminNotes)}>
                Mark as Processed
              </Button>
            )}
          </>
        }
      >
        {viewRequest && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'User', value: viewRequest.user?.full_name || '—' },
                { label: 'Role', value: viewRequest.user?.role || '—' },
                { label: 'Amount', value: `$${Number(viewRequest.amount || 0).toLocaleString()}` },
                { label: 'Method', value: (viewRequest.payment_method || '—').replace('_', ' ') },
                { label: 'Status', value: <StatusBadge status={viewRequest.status} /> },
                { label: 'Requested', value: viewRequest.created_at ? new Date(viewRequest.created_at).toLocaleDateString() : '—' },
              ].map(f => (
                <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{f.label}</div>
                  <div className="text-sm font-semibold text-gray-900 capitalize">{f.value}</div>
                </div>
              ))}
            </div>

            {viewRequest.notes && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">User Notes</div>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{viewRequest.notes}</div>
              </div>
            )}

            {(viewRequest.status === 'pending' || viewRequest.status === 'approved') && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Admin Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Transfer reference, notes, or reason for rejection..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
                  onFocus={e => e.target.style.borderColor = '#D4AF37'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            )}

            {viewRequest.admin_notes && (viewRequest.status === 'processed' || viewRequest.status === 'rejected') && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Admin Notes</div>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{viewRequest.admin_notes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
