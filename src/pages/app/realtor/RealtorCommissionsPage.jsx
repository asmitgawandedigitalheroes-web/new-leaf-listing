import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Skeleton from '../../../components/ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import {
  HiCalendarDays,
  HiClock,
  HiArrowTrendingUp,
  HiCurrencyDollar,
  HiHome,
  HiClipboardDocumentList,
  HiLockClosed,
  HiExclamationTriangle,
  HiArrowDownTray,
} from 'react-icons/hi2';

const STATUS_STYLES = {
  paid:     { bg: '#E8F3EE', text: '#1F4D3A' },
  approved: { bg: '#DBEAFE', text: '#1E40AF' },
  payable:  { bg: '#EDE9FE', text: '#5B21B6' },
  pending:  { bg: 'rgba(212,175,55,0.12)', text: '#B8962E' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function RealtorCommissionsPage() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const [commissions, setCommissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeComm, setActiveComm] = useState(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeComm, setDisputeComm] = useState(null);
  const [disputeForm, setDisputeForm] = useState({ subject: '', description: '' });
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

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

  const filteredCommissions = useMemo(() => {
    let list = commissions;
    if (filterType) list = list.filter(c => c.type === filterType);
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    if (filterFrom) list = list.filter(c => c.created_at && new Date(c.created_at) >= new Date(filterFrom));
    if (filterTo) list = list.filter(c => c.created_at && new Date(c.created_at) <= new Date(filterTo + 'T23:59:59'));
    return list;
  }, [commissions, filterType, filterStatus, filterFrom, filterTo]);

  const filteredTotal = filteredCommissions.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const quickPreset = (preset) => {
    const d = new Date();
    if (preset === 'this_month') {
      setFilterFrom(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`);
      setFilterTo(d.toISOString().slice(0,10));
    } else if (preset === 'last_month') {
      const lm = new Date(d.getFullYear(), d.getMonth()-1, 1);
      const lme = new Date(d.getFullYear(), d.getMonth(), 0);
      setFilterFrom(lm.toISOString().slice(0,10));
      setFilterTo(lme.toISOString().slice(0,10));
    } else if (preset === 'last_3') {
      const t = new Date(d); t.setMonth(t.getMonth()-3);
      setFilterFrom(t.toISOString().slice(0,10));
      setFilterTo(d.toISOString().slice(0,10));
    } else if (preset === 'this_year') {
      setFilterFrom(`${d.getFullYear()}-01-01`);
      setFilterTo(d.toISOString().slice(0,10));
    }
  };

  const exportCSV = () => {
    const rows = [['Type', 'Source Transaction', 'Amount', 'Status', 'Date']];
    filteredCommissions.forEach(c => {
      rows.push([
        c.type || 'commission',
        c.listing?.title || c.source_transaction_id || `Commission #${c.id?.slice(0,8)}`,
        Number(c.amount || 0).toFixed(2),
        c.status,
        c.created_at ? new Date(c.created_at).toLocaleDateString() : '—',
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().slice(0,10);
    a.href = url; a.download = `commissions-export-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Export downloaded' });
  };

  const handleSubmitDispute = async () => {
    if (!disputeForm.subject.trim()) {
      addToast({ type: 'error', title: 'Subject required' });
      return;
    }
    if (!disputeForm.description.trim()) {
      addToast({ type: 'error', title: 'Description required' });
      return;
    }
    setDisputeSubmitting(true);
    const { error } = await supabase.from('disputes').insert({
      raised_by: profile?.id,
      dispute_type: 'commission',
      entity_type: 'commission',
      entity_id: disputeComm?.id || null,
      subject: disputeForm.subject,
      description: disputeForm.description,
      status: 'open',
    });
    setDisputeSubmitting(false);
    if (error) {
      addToast({ type: 'error', title: 'Submission failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Dispute submitted', desc: 'Our team will review it within 3–5 business days.' });
      setDisputeOpen(false);
      setDisputeComm(null);
    }
  };

  const summaryCards = [
    { label: 'This Month', value: `$${thisMonth.toLocaleString()}`, color: '#D4AF37', icon: <HiCalendarDays className="w-3.5 h-3.5" /> },
    { label: 'Pending',    value: `$${pending.toLocaleString()}`,   color: '#B8962E', icon: <HiClock className="w-3.5 h-3.5" /> },
    { label: 'YTD',        value: `$${ytd.toLocaleString()}`,       color: '#1F4D3A', icon: <HiArrowTrendingUp className="w-3.5 h-3.5" /> },
    { label: 'Upcoming',   value: `$${upcoming.toLocaleString()}`,  color: '#7C3AED', icon: <HiCurrencyDollar className="w-3.5 h-3.5" /> },
  ];

  return (
    <AppLayout role="realtor" title="Commissions">
      <div className="p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto">

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
            <div 
              key={c.label} 
              className="bg-white rounded-2xl p-5 transition-all hover:translate-y-[-2px]" 
              style={{ 
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)', 
                borderTop: `4px solid ${c.color}` 
              }}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                <span style={{ color: c.color }}>{c.icon}</span>
                <span>{c.label}</span>
              </div>
              <div 
                className="text-2xl font-black" 
                style={{ 
                  background: `linear-gradient(135deg, ${c.color} 0%, #111111 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {c.value}
              </div>
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
        <SectionCard
          title={`Commission History (${filteredCommissions.length} of ${commissions.length})`}
          action={
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <HiArrowDownTray className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          }
        >
          {/* Filter bar */}
          <div className="px-5 pt-4 pb-2 flex flex-wrap gap-3 items-center border-b border-gray-50">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
              <option value="">All Types</option>
              {['subscription','listing','deal','referral'].map(t => (
                <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
              <option value="">All Statuses</option>
              {['pending','approved','payable','paid'].map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white" />
            {/* Quick presets */}
            <div className="flex gap-1 flex-wrap">
              {[['this_month','This Month'],['last_month','Last Month'],['last_3','Last 3 Months'],['this_year','This Year']].map(([k,l]) => (
                <button key={k} onClick={() => quickPreset(k)}
                  className="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700 transition-colors">
                  {l}
                </button>
              ))}
            </div>
            {(filterType || filterStatus || filterFrom || filterTo) && (
              <button onClick={() => { setFilterType(''); setFilterStatus(''); setFilterFrom(''); setFilterTo(''); }}
                className="text-sm text-gray-400 hover:text-red-500 font-medium transition-colors">
                Clear
              </button>
            )}
            <span className="ml-auto text-sm font-semibold text-gray-700">
              Total: ${filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
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
                ) : filteredCommissions.length > 0 ? filteredCommissions.map(c => (
                  <>
                    <tr key={c.id} className="cursor-pointer" onClick={() => setActiveComm(activeComm === c.id ? null : c.id)}>
                      <td>
                        <div className="font-medium text-gray-900 text-sm">
                          {c.listing?.title || c.source_transaction_id || `Commission #${c.id?.slice(0, 8)}`}
                        </div>
                        {c.listing?.city && <div className="text-xs text-gray-400">{c.listing.city}</div>}
                      </td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold capitalize"
                          style={{
                            background: c.type === 'deal' ? '#EDE9FE' : '#F3F4F6',
                            color: c.type === 'deal' ? '#5B21B6' : '#4B5563',
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
                      <td>
                        {c.status === 'pending' || c.status === 'rejected' ? (
                          <button
                            title="Raise a dispute"
                            onClick={e => { e.stopPropagation(); setDisputeComm(c); setDisputeForm({ subject: '', description: '' }); setDisputeOpen(true); }}
                            className="text-gray-300 hover:text-red-400 transition-colors p-1"
                          >
                            <HiExclamationTriangle size={14} />
                          </button>
                        ) : <span />}
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
                              <span className="font-semibold capitalize">{c.type || '—'}</span>
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

      {/* Raise Dispute Modal */}
      <Modal
        open={disputeOpen}
        onClose={() => { setDisputeOpen(false); setDisputeComm(null); }}
        title="Raise a Commission Dispute"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDisputeOpen(false); setDisputeComm(null); }}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitDispute} isLoading={disputeSubmitting}>Submit Dispute</Button>
          </>
        }
      >
        <div className="space-y-4">
          {disputeComm && (
            <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
              Disputing commission: <span className="font-semibold text-gray-900">
                ${Number(disputeComm.amount || 0).toLocaleString()}
              </span>
              <span className="text-gray-400 ml-1 text-xs capitalize">({disputeComm.type || 'commission'})</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Subject *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none text-sm"
              placeholder="e.g. Commission amount incorrect"
              value={disputeForm.subject}
              onChange={e => setDisputeForm(f => ({ ...f, subject: e.target.value }))}
              onFocus={e => e.target.style.borderColor = '#D4AF37'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description *</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none text-sm resize-none"
              placeholder="Describe the issue in detail..."
              value={disputeForm.description}
              onChange={e => setDisputeForm(f => ({ ...f, description: e.target.value }))}
              onFocus={e => e.target.style.borderColor = '#D4AF37'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
          <p className="text-xs text-gray-400">Disputes must be initiated within 14 days per Platform Rules. Our team will review within 3–5 business days.</p>
        </div>
      </Modal>
    </AppLayout>
  );
}
