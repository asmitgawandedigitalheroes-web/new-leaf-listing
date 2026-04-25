import React, { useState, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import { useAuditLogs } from '../../../hooks/useAuditLogs';
import { HiClipboardDocumentList, HiArrowPath } from 'react-icons/hi2';

const ACTION_STYLES = {
  create:   { bg: '#E8F3EE', text: '#1F4D3A',  label: 'Create' },
  update:   { bg: '#DBEAFE', text: '#1E40AF',  label: 'Update' },
  delete:   { bg: '#FEE2E2', text: '#991B1B',  label: 'Delete' },
  auth:     { bg: '#F3F4F6', text: '#4B5563',  label: 'Auth' },
  payment:  { bg: 'rgba(212,175,55,0.12)', text: '#B8962E', label: 'Payment' },
  contract: { bg: '#EDE9FE', text: '#5B21B6',  label: 'Contract' },
};

function ActionBadge({ action, actionCategory }) {
  const s = ACTION_STYLES[actionCategory] || ACTION_STYLES[action] || ACTION_STYLES.auth;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

const PAGE_SIZE = 15;

const formatTS = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function AuditLogPage() {
  const { logs, isLoading, refresh } = useAuditLogs();
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser]     = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [page, setPage]                 = useState(1);
  const [expanded, setExpanded]         = useState(null);

  const uniqueUsers    = useMemo(() => ['all', ...new Set(logs.map(l => l.user).filter(Boolean))], [logs]);
  const uniqueEntities = useMemo(() => ['all', ...new Set(logs.map(l => l.entity).filter(Boolean))], [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterAction !== 'all' && l.actionCategory !== filterAction) return false;
      if (filterUser !== 'all' && l.user !== filterUser) return false;
      if (filterEntity !== 'all' && l.entity !== filterEntity) return false;
      if (dateFrom && new Date(l.timestamp) < new Date(dateFrom)) return false;
      if (dateTo && new Date(l.timestamp) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [logs, filterAction, filterUser, filterEntity, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const rows = [
      ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'Details'],
      ...filtered.map(l => [l.timestamp, l.user, l.action, l.entity, l.entityId, l.details]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectClass = 'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white';
  const inputClass  = 'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white';

  return (
    <AppLayout role="admin" title="Audit Log">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Audit Log</h2>
            <p className="text-sm text-gray-400 mt-0.5">{isLoading ? 'Loading…' : `${filtered.length} events found — live from database`}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} title="Refresh" className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
              <HiArrowPath size={16} className="text-gray-500" />
            </button>
            <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>Export CSV</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 flex flex-wrap gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }} className={selectClass + ' flex-1 min-w-[120px]'}>
            <option value="all">All Actions</option>
            {Object.keys(ACTION_STYLES).map(a => <option key={a} value={a}>{ACTION_STYLES[a].label}</option>)}
          </select>
          <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1); }} className={selectClass + ' flex-1 min-w-[140px]'}>
            <option value="all">All Users</option>
            {uniqueUsers.filter(u => u !== 'all').map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(1); }} className={selectClass + ' flex-1 min-w-[120px]'}>
            <option value="all">All Entities</option>
            {uniqueEntities.filter(e => e !== 'all').map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className={inputClass + ' flex-1 min-w-[130px]'} />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className={inputClass + ' flex-1 min-w-[130px]'} />
          </div>
          {(filterAction !== 'all' || filterUser !== 'all' || filterEntity !== 'all' || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterAction('all'); setFilterUser('all'); setFilterEntity('all'); setDateFrom(''); setDateTo(''); setPage(1); }}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Log Table */}
        <SectionCard title={isLoading ? 'Loading…' : `Events — Page ${page} of ${Math.max(totalPages, 1)}`}>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="90px" height="12px" /></td>
                      <td><Skeleton width="120px" height="12px" /></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                      <td><Skeleton width="180px" height="12px" /></td>
                      <td><Skeleton width="16px" height="12px" /></td>
                    </tr>
                  ))
                ) : paginated.map(log => (
                  <React.Fragment key={log.id}>
                    {/* BUG-009: row click toggles expanded detail; chevron button is the visual affordance */}
                    <tr
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <td className="text-gray-500 text-xs whitespace-nowrap">{formatTS(log.timestamp)}</td>
                      <td>
                        <div className="text-sm text-gray-700 font-medium">{log.userName}</div>
                        <div className="text-xs text-gray-400">{log.user}</div>
                      </td>
                      <td><ActionBadge action={log.action} actionCategory={log.actionCategory} /></td>
                      <td>
                        <span className="font-medium text-gray-800 text-sm">{log.entity}</span>
                        <span className="text-gray-400 text-xs ml-1">{log.entityId}</span>
                      </td>
                      <td className="text-gray-500 text-sm max-w-xs truncate">{log.details}</td>
                      <td>
                        <button
                          onClick={e => { e.stopPropagation(); setExpanded(expanded === log.id ? null : log.id); }}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          aria-label={expanded === log.id ? 'Collapse row' : 'Expand row'}
                        >
                          {expanded === log.id ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr key={`${log.id}-meta`} className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Metadata</div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {log.metadata.ip && log.metadata.ip !== '—' && (
                              <div><span className="text-gray-400">IP: </span><span className="font-mono text-gray-700">{log.metadata.ip}</span></div>
                            )}
                            <div><span className="text-gray-400">Timestamp: </span><span className="text-gray-700">{log.timestamp}</span></div>
                            {log.metadata.before && (
                              <div><span className="text-gray-400">Before: </span><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{JSON.stringify(log.metadata.before).slice(0, 200)}</code></div>
                            )}
                            {log.metadata.after && (
                              <div><span className="text-gray-400">After: </span><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{JSON.stringify(log.metadata.after).slice(0, 200)}</code></div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && paginated.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <HiClipboardDocumentList className="mx-auto text-4xl text-gray-200 mb-4" />
              <p className="font-medium">No log entries found</p>
              <p className="text-sm mt-1">Log entries will appear here after admin actions</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <span className="text-sm text-gray-400">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-8 h-8 rounded text-sm font-medium transition-colors"
                    style={{ background: p === page ? '#D4AF37' : 'transparent', color: p === page ? '#fff' : '#6B7280' }}>
                    {p}
                  </button>
                ))}
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </AppLayout>
  );
}
