import { useState, useMemo, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Avatar from '../../../components/ui/Avatar';
import Modal from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useLeads } from '../../../hooks/useLeads';
import { useToast } from '../../../context/ToastContext';
import { HiLockClosed, HiUsers, HiExclamationTriangle, HiEnvelope } from 'react-icons/hi2';
import LeadDrawer from '../../../components/shared/LeadDrawer';
import { maskEmail, maskName } from '../../../utils/masking';
import { supabase } from '../../../lib/supabase';
import { ActionPill } from '../../../components/shared/TableActions';
import MobileCard, { MobileCardRow, MobileCardActions } from '../../../components/shared/MobileCard';
import { usePlanAccess } from '../../../hooks/usePlanAccess';
import Pagination from '../../../components/ui/Pagination';

const PAGE_SIZE = 10;

const STATUS_TABS = ['all', 'new', 'contacted', 'in_progress', 'closed'];

const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  in_progress: 'In Progress',
  closed: 'Closed',
};

function normalizeStatus(status) {
  const map = {
    new: 'new',
    assigned: 'new',
    contacted: 'contacted',
    showing: 'in_progress',
    offer: 'in_progress',
    converted: 'closed',
    lost: 'closed',
    in_progress: 'in_progress',
    closed: 'closed',
  };
  return map[status] || status;
}

const SCORE_COLOR = (s) => s >= 80 ? '#1F4D3A' : s >= 50 ? '#D4AF37' : '#DC2626';

export default function RealtorLeadsPage() {
  const { profile, user } = useAuth();
  const { addToast } = useToast();
  const { planLimits } = usePlanAccess();
  const [activeTab, setActiveTab]   = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLead, setDrawerLead] = useState(null);
  const [addOpen, setAddOpen]       = useState(false);
  const [addForm, setAddForm]       = useState({ name: '', email: '', interest: 'Buying', message: '', budget_min: '', budget_max: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeLead, setDisputeLead] = useState(null);
  const [disputeForm, setDisputeForm] = useState({ subject: '', description: '' });
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [monthlyLeadCount, setMonthlyLeadCount] = useState(0);
  const { leads, updateLeadStatus, isLoading, createInquiry, addLeadNote } = useLeads();

  const [page, setPage] = useState(1);

  // Count leads assigned this month to enforce Starter plan cap
  useEffect(() => {
    if (!user?.id || planLimits.leads === -1) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_realtor_id', user.id)
      .gte('created_at', monthStart.toISOString())
      .then(({ count }) => setMonthlyLeadCount(count ?? 0));
  }, [user?.id, planLimits.leads, leads.length]);

  const leadLimitReached = planLimits.leads !== -1 && monthlyLeadCount >= planLimits.leads;

  const handleAddLead = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      addToast({ type: 'error', title: 'Missing info', desc: 'Name and email are required.' });
      return;
    }
    setIsSubmitting(true);
    const { error } = await createInquiry({
      ...addForm,
      source: 'manual',
      territory_id: profile?.territory_id || null,
      assigned_realtor_id: profile?.id
    });
    setIsSubmitting(false);

    if (error) {
      addToast({ type: 'error', title: 'Failed to add lead', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Lead added', desc: 'Successfully created manual lead entry.' });
      setAddOpen(false);
      setAddForm({ name: '', email: '', interest: 'Buying', message: '', budget_min: '', budget_max: '' });
    }
  };

  const filtered = useMemo(() =>
    leads.filter(l => activeTab === 'all' || normalizeStatus(l.status) === activeTab),
    [leads, activeTab]
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    { label: 'Total',       value: leads.length },
    { label: 'New',         value: leads.filter(l => normalizeStatus(l.status) === 'new').length },
    { label: 'In Progress', value: leads.filter(l => normalizeStatus(l.status) === 'in_progress').length },
    { label: 'Closed',      value: leads.filter(l => normalizeStatus(l.status) === 'closed').length },
  ];

  const openDrawer = (lead) => {
    setDrawerLead(lead);
    setDrawerOpen(true);
  };

  const openDisputeModal = (lead, e) => {
    e.stopPropagation();
    setDisputeLead(lead);
    setDisputeForm({ subject: '', description: '' });
    setDisputeOpen(true);
  };

  const handleSubmitDispute = async () => {
    if (!disputeForm.subject.trim() || !disputeForm.description.trim()) {
      addToast({ type: 'error', title: 'Required', desc: 'Subject and description are required.' });
      return;
    }
    setDisputeSubmitting(true);
    const { error } = await supabase.from('disputes').insert({
      raised_by: profile?.id,
      dispute_type: 'lead',
      entity_type: 'lead',
      entity_id: disputeLead?.id || null,
      subject: disputeForm.subject,
      description: disputeForm.description,
      status: 'open',
    });
    setDisputeSubmitting(false);
    if (error) {
      addToast({ type: 'error', title: 'Submission failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Dispute submitted', desc: 'Our team will review it shortly.' });
      setDisputeOpen(false);
      setDisputeLead(null);
    }
  };

  return (
    <AppLayout role="realtor" title="My Leads">
      <div className="p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Leads</h2>
            <p className="text-sm text-gray-400 mt-0.5">{leads.length} active leads</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              if (leadLimitReached) {
                addToast({ type: 'warning', title: `Monthly lead limit reached (${planLimits.leads}/mo)`, desc: 'Upgrade your plan for unlimited leads.' });
                return;
              }
              setAddOpen(true);
            }}
          >
            + Add Lead
          </Button>
        </div>

        {/* Monthly lead cap warning banner for Starter plan */}
        {planLimits.leads !== -1 && (
          <div className="mx-4 md:mx-6 mb-2 px-4 py-3 rounded-xl flex items-center gap-3"
            style={{
              background: leadLimitReached ? '#FEF2F2' : 'rgba(212,175,55,0.08)',
              border: `1px solid ${leadLimitReached ? '#FECACA' : 'rgba(212,175,55,0.3)'}`,
            }}>
            <HiExclamationTriangle size={16} style={{ color: leadLimitReached ? '#DC2626' : '#D4AF37', flexShrink: 0 }} />
            <p className="text-xs font-medium" style={{ color: leadLimitReached ? '#991B1B' : '#B8962E' }}>
              {leadLimitReached
                ? `You've reached your monthly lead limit (${planLimits.leads}). Upgrade to Pro Agent for unlimited leads.`
                : `Monthly leads: ${monthlyLeadCount} / ${planLimits.leads} — Upgrade for unlimited.`}
            </p>
            {leadLimitReached && (
              <a href="/realtor/billing" className="ml-auto text-xs font-bold no-underline px-3 py-1 rounded-lg"
                style={{ background: '#DC2626', color: '#fff', whiteSpace: 'nowrap' }}>
                Upgrade
              </a>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}>
              <div className="text-3xl font-black text-gray-900">{s.value}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all capitalize"
              style={{
                background: activeTab === tab ? 'linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)' : '#F3F4F6',
                color: activeTab === tab ? '#fff' : '#4B5563',
                boxShadow: activeTab === tab ? '0 2px 8px rgba(212,175,55,0.25)' : 'none'
              }}
            >
              {STATUS_LABELS[tab] || tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* List Content — table on md+, cards on mobile */}
        <div className="hidden md:block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lead</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Received</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{maskName(lead.contact_name)}</div>
                    <div className="text-xs text-gray-400">{maskEmail(lead.contact_email)}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={normalizeStatus(lead.status)} label={STATUS_LABELS[normalizeStatus(lead.status)]} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => openDrawer(lead)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-3">
          {paginated.map(lead => (
            <div 
              key={lead.id} 
              className="bg-white rounded-2xl overflow-hidden mb-3"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}
              onClick={() => openDrawer(lead)}
            >
              <div className="p-4 flex gap-4 relative">
                {/* Status Badge in top right */}
                <div className="absolute top-4 right-4">
                  <Badge status={normalizeStatus(lead.status)} label={STATUS_LABELS[normalizeStatus(lead.status)]} />
                </div>

                {/* Left: Avatar */}
                <div className="w-20 h-20 flex-shrink-0">
                  <Avatar 
                    initials={lead.contact_name?.slice(0, 2).toUpperCase() || 'L'} 
                    size={80} 
                    color="gold" 
                    className="rounded-xl shadow-sm"
                  />
                </div>

                {/* Right: Details */}
                <div className="flex-1 min-w-0 pr-12">
                  <div className="font-bold text-gray-900 text-base truncate mb-0.5">{maskName(lead.contact_name)}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1 mb-2 font-mono">
                    <HiEnvelope size={10} className="text-gray-300" />
                    <span className="truncate">{maskEmail(lead.contact_email)}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-black text-gray-900">{lead.score ?? 0}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Score</span>
                  </div>

                  <div className="text-[11px] text-gray-400">
                    Budget: <span className="font-semibold text-gray-600">${lead.budget_max?.toLocaleString() || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Bottom: Actions Row */}
              <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center gap-3">
                <ActionPill
                  label="View Details"
                  color="#B8962E"
                  bg="rgba(212,175,55,0.12)"
                  onClick={(e) => { e.stopPropagation(); openDrawer(lead); }}
                />
                <ActionPill
                  label="Raise Dispute"
                  color="#DC2626"
                  bg="#FEE2E2"
                  onClick={(e) => { e.stopPropagation(); openDisputeModal(lead, e); }}
                />
              </div>
            </div>
          ))}
        </div>

        <Pagination 
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        />

        {filtered.length === 0 && (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center">
            <HiUsers className="w-12 h-12 text-gray-200 mb-2" />
            <p>No leads found in this category.</p>
          </div>
        )}
      </div>

      {/* Shared Components */}
      <LeadDrawer 
        lead={leads.find(l => l.id === drawerLead?.id)} 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        updateStatus={updateLeadStatus}
        addNote={addLeadNote}
      />

      <Modal open={disputeOpen} onClose={() => setDisputeOpen(false)} title="Raise Dispute">
        <div className="space-y-4 py-2">
          {disputeLead && (
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-100">
              Target Lead: <span className="font-bold text-gray-900">{maskName(disputeLead.contact_name)}</span>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Subject</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
              value={disputeForm.subject}
              onChange={e => setDisputeForm({ ...disputeForm, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Details</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/20 min-h-[100px]"
              value={disputeForm.description}
              onChange={e => setDisputeForm({ ...disputeForm, description: e.target.value })}
            />
          </div>
          <Button fullWidth onClick={handleSubmitDispute} isLoading={disputeSubmitting}>Submit Case</Button>
        </div>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Quick Add Lead">
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <input className="px-3 py-2 border rounded-xl" placeholder="Full Name" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} />
            <input className="px-3 py-2 border rounded-xl" placeholder="Email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} />
          </div>
          <textarea className="w-full px-3 py-2 border rounded-xl min-h-[80px]" placeholder="Inquiry details..." value={addForm.message} onChange={e => setAddForm({...addForm, message: e.target.value})} />
          <Button fullWidth onClick={handleAddLead} isLoading={isSubmitting}>Create Lead</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
