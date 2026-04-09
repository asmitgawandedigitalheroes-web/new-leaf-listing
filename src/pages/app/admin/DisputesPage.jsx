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
  HiExclamationTriangle,
  HiCheckCircle,
  HiClock,
  HiNoSymbol,
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
  open:          { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626', label: 'Open' },
  under_review:  { bg: 'rgba(212,175,55,0.12)', text: '#B8962E', dot: '#D4AF37', label: 'Under Review' },
  resolved:      { bg: '#E8F3EE', text: '#1F4D3A', dot: '#22C55E', label: 'Resolved' },
  dismissed:     { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF', label: 'Dismissed' },
};

const TYPE_LABELS = {
  lead:       'Lead',
  commission: 'Commission',
  listing:    'Listing',
  payment:    'Payment',
  other:      'Other',
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.open;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export default function DisputesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [disputes, setDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [viewDispute, setViewDispute] = useState(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchDisputes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        raised_by_profile:profiles!disputes_raised_by_fkey(full_name, email, role),
        resolved_by_profile:profiles!disputes_resolved_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false });
    if (!error) setDisputes(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchDisputes(); }, []);

  const filtered = useMemo(() => {
    let list = disputes;
    if (activeTab !== 'all') list = list.filter(d => d.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        (d.subject || '').toLowerCase().includes(q) ||
        (d.raised_by_profile?.full_name || '').toLowerCase().includes(q) ||
        (d.dispute_type || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [disputes, activeTab, search]);

  const counts = {
    all: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    under_review: disputes.filter(d => d.status === 'under_review').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    dismissed: disputes.filter(d => d.status === 'dismissed').length,
  };

  const handleUpdateStatus = async (id, status, resolutionText = null) => {
    setResolving(true);
    const updates = {
      status,
      updated_at: new Date().toISOString(),
      ...(status === 'resolved' || status === 'dismissed'
        ? { resolved_by: user.id, resolved_at: new Date().toISOString(), resolution: resolutionText || null }
        : {}),
      ...(status === 'under_review' ? {} : {}),
    };
    const { error } = await supabase.from('disputes').update(updates).eq('id', id);
    setResolving(false);
    if (error) {
      addToast({ type: 'error', title: 'Update failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: `Dispute ${status.replace('_', ' ')}` });
      setDisputes(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
      if (viewDispute?.id === id) setViewDispute(prev => ({ ...prev, ...updates }));
      if (status === 'resolved' || status === 'dismissed') {
        setViewDispute(null);
        setResolution('');
      }
    }
  };

  const kpis = [
    { label: 'Total', value: counts.all, icon: HiExclamationTriangle, color: '#6B7280' },
    { label: 'Open', value: counts.open, icon: HiClock, color: '#DC2626' },
    { label: 'Under Review', value: counts.under_review, icon: HiExclamationTriangle, color: '#D4AF37' },
    { label: 'Resolved', value: counts.resolved, icon: HiCheckCircle, color: '#1F4D3A' },
  ];

  const TABS = ['all', 'open', 'under_review', 'resolved', 'dismissed'];

  return (
    <AppLayout role="admin" title="Disputes">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Dispute Resolution</h2>
            <p className="text-sm text-gray-400 mt-0.5">Review and resolve platform disputes raised by users</p>
          </div>
          <button
            onClick={() => exportCSV(filtered.map(d => ({
              Raised_By: d.raised_by_profile?.full_name || '',
              Email: d.raised_by_profile?.email || '',
              Role: d.raised_by_profile?.role || '',
              Type: TYPE_LABELS[d.dispute_type] || d.dispute_type,
              Subject: d.subject || '',
              Status: d.status,
              Date: d.created_at ? new Date(d.created_at).toLocaleDateString() : '',
              Resolution: d.resolution || '',
            })), 'disputes.csv')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600 self-start sm:self-auto"
          >
            <HiArrowDownTray size={15} />
            Export CSV
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white rounded-2xl p-5 flex items-center gap-4"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: k.color + '18' }}>
                <k.icon size={20} style={{ color: k.color }} />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{k.label}</div>
                {isLoading
                  ? <Skeleton width="40px" height="22px" className="mt-1" />
                  : <div className="text-2xl font-black text-gray-900 mt-0.5">{k.value}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <SectionCard
          title={`Disputes (${filtered.length})`}
          action={
            <div className="relative w-full sm:w-auto">
              <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search..."
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
                {t.replace('_', ' ')} {counts[t] > 0 && `(${counts[t]})`}
              </button>
            ))}
          </div>

          <div className="hidden md:block data-table">
            <table>
              <thead>
                <tr>
                  <th>Raised By</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="140px" height="12px" /></td>
                      <td><Skeleton width="70px" height="20px" /></td>
                      <td><Skeleton width="200px" height="12px" /></td>
                      <td><Skeleton width="80px" height="20px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                      <td><Skeleton width="120px" height="28px" /></td>
                    </tr>
                  ))
                ) : filtered.length > 0 ? filtered.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className="font-medium text-gray-900 text-sm">{d.raised_by_profile?.full_name || '—'}</div>
                      <div className="text-xs text-gray-400">{d.raised_by_profile?.email || ''}</div>
                    </td>
                    <td>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold"
                        style={{ background: '#F3F4F6', color: '#4B5563' }}>
                        {TYPE_LABELS[d.dispute_type] || d.dispute_type}
                      </span>
                    </td>
                    <td className="text-gray-700 text-sm max-w-[200px] truncate">{d.subject}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="text-gray-400 text-sm">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => { setViewDispute(d); setResolution(d.resolution || ''); }}>
                          View
                        </Button>
                        {d.status === 'open' && (
                          <Button variant="ghost" size="sm"
                            style={{ color: '#D4AF37' }}
                            onClick={() => handleUpdateStatus(d.id, 'under_review')}>
                            Review
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <HiExclamationTriangle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      No disputes found
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
            )) : filtered.length > 0 ? filtered.map(d => (
              <MobileCard key={d.id}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{d.raised_by_profile?.full_name || '—'}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>{d.raised_by_profile?.email || ''}</div>
                <MobileCardRow label="Type">{TYPE_LABELS[d.dispute_type] || d.dispute_type}</MobileCardRow>
                <MobileCardRow label="Subject">{d.subject}</MobileCardRow>
                <MobileCardRow label="Status"><StatusBadge status={d.status} /></MobileCardRow>
                <MobileCardRow label="Date">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</MobileCardRow>
                <MobileCardActions>
                  <ActionPill label="View" color="#1D4ED8" bg="rgba(219,234,254,0.8)" onClick={() => { setViewDispute(d); setResolution(d.resolution || ''); }} />
                  {d.status === 'open' && (
                    <ActionPill label="Mark Under Review" color="#92400E" bg="rgba(212,175,55,0.2)" onClick={() => handleUpdateStatus(d.id, 'under_review')} />
                  )}
                </MobileCardActions>
              </MobileCard>
            )) : (
              <div className="py-12 text-center text-gray-400">
                <HiExclamationTriangle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="font-medium">No disputes found</p>
              </div>
            )}
          </div>
        </SectionCard>

      </div>

      {/* View / Resolve Modal */}
      <Modal
        open={!!viewDispute}
        onClose={() => { setViewDispute(null); setResolution(''); }}
        title="Dispute Details"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setViewDispute(null); setResolution(''); }}>Close</Button>
            {viewDispute?.status === 'open' && (
              <Button variant="ghost" size="sm" style={{ color: '#DC2626' }}
                isLoading={resolving}
                onClick={() => handleUpdateStatus(viewDispute.id, 'under_review')}>
                Mark Under Review
              </Button>
            )}
            {(viewDispute?.status === 'open' || viewDispute?.status === 'under_review') && (
              <>
                <Button variant="ghost" size="sm" style={{ color: '#6B7280' }}
                  isLoading={resolving}
                  onClick={() => handleUpdateStatus(viewDispute.id, 'dismissed', resolution)}>
                  Dismiss
                </Button>
                <Button variant="primary" isLoading={resolving}
                  onClick={() => {
                    if (!resolution.trim()) {
                      addToast({ type: 'error', title: 'Resolution required', desc: 'Please enter a resolution note before resolving.' });
                      return;
                    }
                    handleUpdateStatus(viewDispute.id, 'resolved', resolution);
                  }}>
                  Resolve
                </Button>
              </>
            )}
          </>
        }
      >
        {viewDispute && (
          <div className="flex flex-col gap-4">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Raised By', value: viewDispute.raised_by_profile?.full_name || '—' },
                { label: 'Role', value: viewDispute.raised_by_profile?.role || '—' },
                { label: 'Dispute Type', value: TYPE_LABELS[viewDispute.dispute_type] || viewDispute.dispute_type },
                { label: 'Status', value: <StatusBadge status={viewDispute.status} /> },
                { label: 'Date', value: viewDispute.created_at ? new Date(viewDispute.created_at).toLocaleDateString() : '—' },
                { label: 'Entity ID', value: viewDispute.entity_id ? viewDispute.entity_id.slice(0, 12) + '…' : '—' },
              ].map(f => (
                <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{f.label}</div>
                  <div className="text-sm font-semibold text-gray-900">{f.value}</div>
                </div>
              ))}
            </div>

            {/* Subject */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subject</div>
              <div className="text-sm font-medium text-gray-900">{viewDispute.subject}</div>
            </div>

            {/* Description */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</div>
              <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">
                {viewDispute.description || '—'}
              </div>
            </div>

            {/* Resolution (if already resolved) */}
            {viewDispute.resolution && (viewDispute.status === 'resolved' || viewDispute.status === 'dismissed') ? (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Resolution</div>
                <div className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-xl p-3 leading-relaxed">
                  {viewDispute.resolution}
                </div>
                {viewDispute.resolved_by_profile && (
                  <div className="text-xs text-gray-400 mt-1">
                    Resolved by {viewDispute.resolved_by_profile.full_name} on {new Date(viewDispute.resolved_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ) : (viewDispute.status === 'open' || viewDispute.status === 'under_review') ? (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Resolution Note *
                </label>
                <textarea
                  rows={3}
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  placeholder="Describe how this dispute is being resolved..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
                  onFocus={e => e.target.style.borderColor = '#D4AF37'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
