import { useState, useMemo, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { useLeads } from '../../../hooks/useLeads';
import { useToast } from '../../../context/ToastContext';
import { HiLockClosed } from 'react-icons/hi2';
import LeadDrawer from '../../../components/shared/LeadDrawer';

const SCORE_COLOR = (s) => s >= 80 ? '#1F4D3A' : s >= 50 ? '#D4AF37' : '#DC2626';

const COLUMNS = ['new', 'assigned', 'contacted', 'closed'];
const COL_LABELS = { new: 'New', assigned: 'Assigned', contacted: 'Contacted', closed: 'Closed' };
const COL_COLORS = { new: '#1F4D3A', assigned: '#D4AF37', contacted: '#3B82F6', closed: '#6B7280' };

// Map DB statuses to kanban columns
const toColumn = (status) => {
  if (status === 'new') return 'new';
  if (status === 'assigned') return 'assigned';
  if (status === 'contacted' || status === 'showing' || status === 'offer') return 'contacted';
  if (status === 'converted' || status === 'closed') return 'closed';
  return 'new';
};

export default function DirectorLeadsPage() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const { leads, isLoading, reassignLead, fetchAvailableRealtors } = useLeads();

  const [assignOpen, setAssignOpen]     = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [drawerLead, setDrawerLead]     = useState(null);
  const [assignTo, setAssignTo]         = useState('');
  const [assigning, setAssigning]       = useState(false);
  const [availableRealtors, setAvailableRealtors] = useState([]);

  useEffect(() => {
    fetchAvailableRealtors().then(({ data }) => setAvailableRealtors(data || []));
  }, [fetchAvailableRealtors]);

  const byStatus = useMemo(() => {
    const map = {};
    COLUMNS.forEach(c => { map[c] = []; });
    leads.forEach(l => {
      const col = toColumn(l.status);
      map[col].push(l);
    });
    return map;
  }, [leads]);

  const stats = [
    { label: 'Total Leads', value: leads.length },
    { label: 'Assigned %', value: leads.length > 0 ? `${Math.round((leads.filter(l => l.assigned_realtor_id).length / leads.length) * 100)}%` : '0%' },
    { label: 'Avg Score', value: leads.length > 0 ? Math.round(leads.reduce((a, l) => a + (l.score || 50), 0) / leads.length) : 0 },
    { label: 'Conversion', value: leads.length > 0 ? `${Math.round((leads.filter(l => l.status === 'converted' || l.status === 'closed').length / leads.length) * 100)}%` : '0%' },
  ];

  const openAssign = (lead) => { setAssignTarget(lead); setAssignTo(''); setAssignOpen(true); };
  const openDrawer = (lead) => { setDrawerLead(lead); setDrawerOpen(true); };

  const handleAssign = async () => {
    if (!assignTo || !assignTarget) return;
    setAssigning(true);
    const { error } = await reassignLead(assignTarget.id, assignTo);
    setAssigning(false);
    setAssignOpen(false);
    if (error) addToast({ type: 'error', title: 'Assign failed', desc: error.message });
    else {
      addToast({ type: 'success', title: 'Lead assigned', desc: 'Lead routed to realtor.' });
      if (drawerLead?.id === assignTarget.id) {
         setDrawerLead(prev => ({ ...prev, assigned_realtor_id: assignTo }));
      }
    }
  };

  const territory = profile?.territory ? `${profile.territory}` : 'My Territory';

  const selectClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white';

  return (
    <AppLayout role="director" title="My Leads">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Territory Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">My Territory</div>
            <h2 className="text-xl font-bold text-gray-900">{territory}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-xl px-4 py-2.5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="text-lg font-black text-gray-900">{s.value}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Kanban Pipeline */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map(col => (
              <div key={col} className="flex flex-col gap-3">
                <Skeleton width="80px" height="20px" />
                {[...Array(2)].map((_, i) => <Skeleton key={i} width="100%" height="120px" />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map(col => (
              <div key={col} className="flex flex-col gap-3">
                {/* Column header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COL_COLORS[col] }} />
                    <span className="font-semibold text-sm text-gray-700">{COL_LABELS[col]}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {byStatus[col]?.length || 0}
                  </span>
                </div>
                {/* Cards */}
                <div className="flex flex-col gap-2">
                  {byStatus[col]?.map(lead => (
                    <div
                      key={lead.id}
                      className="bg-white rounded-xl p-4 cursor-pointer transition-all hover:shadow-md"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `3px solid ${COL_COLORS[col]}` }}
                      onClick={() => openDrawer(lead)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-gray-900 text-sm">{lead.contact_name || 'Unknown'}</div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: SCORE_COLOR(lead.score || 50) + '22', color: SCORE_COLOR(lead.score || 50) }}>
                          {lead.score || 50}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mb-1">{lead.contact_masked_email || lead.contact_email}</div>
                      <div className="text-xs text-gray-500 mb-2">
                        {lead.budget_max ? `$${lead.budget_max.toLocaleString()}` : '—'}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 capitalize">{lead.source || 'web'}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {lead.assigned_realtor ? (
                        <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {lead.assigned_realtor.full_name}
                        </div>
                      ) : (
                        <button
                          className="mt-2 text-[11px] font-semibold hover:underline"
                          style={{ color: '#D4AF37' }}
                          onClick={e => { e.stopPropagation(); openAssign(lead); }}
                        >
                          + Assign Realtor
                        </button>
                      )}
                    </div>
                  ))}
                  {byStatus[col]?.length === 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 text-center text-xs text-gray-400 border border-dashed border-gray-200">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Assign Modal */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={`Assign Lead — ${assignTarget?.contact_name || 'Lead'}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button variant="green" onClick={handleAssign} disabled={!assignTo} isLoading={assigning}>Assign</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-lg bg-gray-50 text-sm">
            <span className="text-gray-500">Budget: </span>
            <span className="font-medium">{assignTarget?.budget_max ? `$${assignTarget.budget_max.toLocaleString()}` : '—'}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-gray-500">Score: </span>
            <span className="font-semibold" style={{ color: SCORE_COLOR(assignTarget?.score || 50) }}>
              {assignTarget?.score || 50}
            </span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Realtor</label>
            <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className={selectClass}>
              <option value="">— Select Realtor —</option>
              {availableRealtors.map(r => (
                <option key={r.id} value={r.id}>{r.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Lead Drawer */}
      <LeadDrawer 
        lead={drawerLead} 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        onAssign={() => openAssign(drawerLead)}
      />
    </AppLayout>
  );
}
