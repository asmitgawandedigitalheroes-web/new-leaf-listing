import { useState, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Skeleton from '../../../components/ui/Skeleton';
import Tabs from '../../../components/ui/Tabs';
import Avatar from '../../../components/ui/Avatar';
import { useEnquiries } from '../../../hooks/useEnquiries';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import {
  HiEnvelope,
  HiPhone,
  HiTag,
  HiChatBubbleLeftRight,
  HiCalendar,
  HiXMark,
  HiArrowPath,
} from 'react-icons/hi2';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_MAP = {
  new:       { label: 'New',       color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
  converted: { label: 'Converted', color: '#1F4D3A', bg: 'rgba(31,77,58,0.12)' },
  dismissed: { label: 'Dismissed', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

export default function EnquiriesPage() {
  useDocumentTitle('Enquiries');
  const { profile } = useAuth();
  const { addToast } = useToast();
  const { enquiries, isLoading, convertToLead, dismissEnquiry } = useEnquiries();

  const [activeTab, setActiveTab]     = useState('all');
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState(null);   // enquiry being viewed
  const [converting, setConverting]   = useState(null);   // enquiry being converted
  const [realtors, setRealtors]       = useState([]);
  const [realtorsLoading, setRealtorsLoading] = useState(false);
  const [selectedRealtor, setSelectedRealtor] = useState('');
  const [isSaving, setIsSaving]       = useState(false);

  const layoutUser = {
    name: profile?.full_name || 'Admin',
    role: 'admin',
    initials: (profile?.full_name || 'A').slice(0, 2).toUpperCase(),
  };

  const tabs = [
    { key: 'all',       label: 'All',       count: enquiries.length },
    { key: 'new',       label: 'New',       count: enquiries.filter(e => e.status === 'new').length },
    { key: 'converted', label: 'Converted', count: enquiries.filter(e => e.status === 'converted').length },
    { key: 'dismissed', label: 'Dismissed', count: enquiries.filter(e => e.status === 'dismissed').length },
  ];

  const filtered = useMemo(() => {
    let list = enquiries;
    if (activeTab !== 'all') list = list.filter(e => e.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        (e.subject || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [enquiries, activeTab, search]);

  const openConvert = async (enquiry) => {
    setConverting(enquiry);
    setSelectedRealtor('');
    setRealtorsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'realtor')
      .eq('status', 'active')
      .order('full_name');
    setRealtors(data || []);
    setRealtorsLoading(false);
  };

  const handleConvert = async () => {
    if (!converting) return;
    setIsSaving(true);
    const { error } = await convertToLead(converting.id, converting, selectedRealtor || null);
    setIsSaving(false);
    if (error) {
      addToast({ type: 'error', title: 'Conversion failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Lead created', desc: `${converting.name}'s enquiry has been converted to a lead.` });
      setConverting(null);
      if (selected?.id === converting.id) setSelected(null);
    }
  };

  const handleDismiss = async (enquiry) => {
    const { error } = await dismissEnquiry(enquiry.id);
    if (error) {
      addToast({ type: 'error', title: 'Failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Enquiry dismissed', desc: 'Marked as dismissed.' });
      if (selected?.id === enquiry.id) setSelected(null);
    }
  };

  return (
    <AppLayout role="admin" title="Enquiries" user={layoutUser}>
      <div className="p-4 md:p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Enquiries</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Contact form submissions from the public website
            </p>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="overflow-x-auto">
            <Tabs tabs={tabs} defaultTab="all" onChange={setActiveTab} />
          </div>
          <div className="sm:ml-auto">
            <input
              type="text"
              placeholder="Search enquiries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
              onFocus={e => e.target.style.borderColor = '#D4AF37'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
        </div>

        {/* Table */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}
        >
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Skeleton variant="circle" width="32px" height="32px" />
                          <div>
                            <Skeleton width="100px" height="12px" className="mb-1" />
                            <Skeleton width="140px" height="10px" />
                          </div>
                        </div>
                      </td>
                      <td><Skeleton width="100px" height="12px" /></td>
                      <td><Skeleton width="70px" height="20px" /></td>
                      <td><Skeleton width="90px" height="12px" /></td>
                      <td><Skeleton width="120px" height="32px" /></td>
                    </tr>
                  ))
                ) : filtered.map(enq => {
                  const st = STATUS_MAP[enq.status] || STATUS_MAP.new;
                  return (
                    <tr
                      key={enq.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(enq)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar
                            initials={(enq.name || '??').slice(0, 2).toUpperCase()}
                            size="sm"
                            color="gold"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{enq.name}</div>
                            <div className="text-xs text-gray-400">{enq.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-600 text-sm">{enq.subject || '—'}</td>
                      <td>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ color: st.color, background: st.bg }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="text-gray-400 text-xs">{formatDate(enq.created_at)}</td>
                      <td>
                        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelected(enq)}
                          >
                            View
                          </Button>
                          {enq.status === 'new' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => openConvert(enq)}
                              >
                                Convert to Lead
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDismiss(enq)}
                              >
                                Dismiss
                              </Button>
                            </>
                          )}
                          {enq.status === 'converted' && (
                            <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                              <HiArrowPath size={12} /> Converted
                            </span>
                          )}
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
              <div className="text-4xl mb-2">📬</div>
              <p className="font-medium">No enquiries found</p>
              <p className="text-sm mt-1">Contact form submissions from the public site will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── View Enquiry Drawer / Modal ── */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Enquiry Details"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => setSelected(null)} className="flex-1">
              Close
            </Button>
            {selected?.status === 'new' && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => { handleDismiss(selected); }}
                  className="flex-1"
                >
                  Dismiss
                </Button>
                <Button
                  variant="primary"
                  onClick={() => { setSelected(null); openConvert(selected); }}
                  className="flex-1"
                >
                  Convert to Lead
                </Button>
              </>
            )}
          </div>
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            {/* Status badge */}
            <div>
              {(() => {
                const st = STATUS_MAP[selected.status] || STATUS_MAP.new;
                return (
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                    style={{ color: st.color, background: st.bg }}
                  >
                    {st.label}
                  </span>
                );
              })()}
            </div>

            {/* Contact info */}
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar initials={(selected.name || '??').slice(0, 2).toUpperCase()} size="md" color="gold" />
                <div>
                  <div className="font-semibold text-gray-900">{selected.name}</div>
                  <div className="text-xs text-gray-400">{formatDate(selected.created_at)}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <HiEnvelope size={14} className="text-gray-400" />
                  <a href={`mailto:${selected.email}`} className="hover:underline">{selected.email}</a>
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <HiPhone size={14} className="text-gray-400" />
                    {selected.phone}
                  </div>
                )}
                {selected.subject && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <HiTag size={14} className="text-gray-400" />
                    {selected.subject}
                  </div>
                )}
              </div>
            </div>

            {/* Message */}
            {selected.message && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  <HiChatBubbleLeftRight size={12} /> Message
                </div>
                <div
                  className="text-sm text-gray-700 leading-relaxed p-4 rounded-xl"
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                >
                  {selected.message}
                </div>
              </div>
            )}

            {selected.status === 'converted' && selected.converted_lead_id && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
                <HiArrowPath size={14} />
                Converted to lead · ID: {selected.converted_lead_id.slice(-8)}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Convert to Lead Modal ── */}
      <Modal
        open={!!converting}
        onClose={() => setConverting(null)}
        title="Convert to Lead"
        footer={
          <>
            <Button variant="outline" onClick={() => setConverting(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleConvert} isLoading={isSaving}>
              Create Lead
            </Button>
          </>
        }
      >
        {converting && (
          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">{converting.name}</p>
              <p className="text-gray-500">{converting.email}</p>
              {converting.subject && (
                <p className="text-gray-500 mt-1">Subject: {converting.subject}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Assign to Realtor <span className="text-gray-400 normal-case font-normal">(optional — leave blank for auto-routing)</span>
              </label>
              {realtorsLoading ? (
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedRealtor}
                  onChange={e => setSelectedRealtor(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="">Auto-route (no preference)</option>
                  {realtors.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.full_name}{r.email ? ` — ${r.email}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <p className="text-xs text-gray-400">
              This will create a new lead entry and mark this enquiry as converted. The lead will appear in the Leads section.
            </p>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
