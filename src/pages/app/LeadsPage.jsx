import { useState, useMemo } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import LeadDrawer from '../../components/shared/LeadDrawer';
import Skeleton from '../../components/ui/Skeleton';
import { useLeads } from '../../hooks/useLeads';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function LeadsPage() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]       = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [reassignLead, setReassignLead] = useState(null);
  const [realtors, setRealtors]         = useState([]);
  const [realtorsLoading, setRealtorsLoading] = useState(false);
  const [reassignRealtorId, setReassignRealtorId] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const [addForm, setAddForm] = useState({ name: '', email: '', interest: 'Buying', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { leads, isLoading, reassignLead: doReassign, fetchAvailableRealtors, createInquiry } = useLeads();

  const handleAddLead = async () => {
    if (!addForm.name || !addForm.email) {
      addToast({ type: 'error', title: 'Missing info', desc: 'Name and email are required.' });
      return;
    }
    setIsSubmitting(true);
    const { error } = await createInquiry({
      ...addForm,
      source: 'Manual Entry',
      territory_id: profile?.territory_id || null
    });
    setIsSubmitting(false);

    if (error) {
      addToast({ type: 'error', title: 'Failed to add lead', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Lead added', desc: 'Successfully created manual lead entry.' });
      setAddOpen(false);
      setAddForm({ name: '', email: '', interest: 'Buying', message: '' });
    }
  };

  const canReassign = profile?.role === 'admin' || profile?.role === 'director';

  const openReassign = async (lead) => {
    setReassignLead(lead);
    setReassignRealtorId('');
    setRealtorsLoading(true);
    const { data } = await fetchAvailableRealtors();
    setRealtors(data);
    setRealtorsLoading(false);
  };

  const handleReassign = async () => {
    if (!reassignRealtorId) return;
    const { error } = await doReassign(reassignLead.id, reassignRealtorId);
    addToast(error
      ? { type: 'error', title: 'Reassign failed', desc: error.message }
      : { type: 'success', title: 'Lead reassigned', desc: 'Attribution window reset to 180 days.' });
    setReassignLead(null);
  };

  const tabs = [
    { key: 'all',       label: 'All',       count: leads.length },
    { key: 'new',       label: 'New',       count: leads.filter(l => l.status === 'new').length },
    { key: 'contacted', label: 'Contacted', count: leads.filter(l => l.status === 'contacted').length },
    { key: 'converted', label: 'Converted', count: leads.filter(l => l.status === 'converted').length },
    { key: 'lost',      label: 'Lost',      count: leads.filter(l => l.status === 'lost').length },
  ];

  const filtered = useMemo(() => {
    let list = leads;
    if (activeTab !== 'all') list = list.filter(l => l.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        (l.contact_name || '').toLowerCase().includes(q) ||
        (l.contact_email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, search, leads]);

  const scoreColor = (s) => {
    if (s >= 80) return '#1F4D3A';
    if (s >= 50) return '#D4AF37';
    return '#DC2626';
  };

  return (
    <AppLayout 
      role={profile?.role || 'realtor'} 
      title="Leads" 
      user={{ 
        name: profile?.full_name || 'User', 
        role: profile?.role || 'realtor', 
        initials: (profile?.full_name || 'U').slice(0, 2).toUpperCase() 
      }}
    >
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Leads</h2>
            <p className="text-sm text-gray-400 mt-0.5">{leads.length} total leads</p>
          </div>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            + Add Lead
          </Button>
        </div>

        {/* Tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="overflow-x-auto">
            <Tabs tabs={tabs} defaultTab="all" onChange={setActiveTab} />
          </div>
          <div className="sm:ml-auto">
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
              style={{ outlineColor: '#D4AF37' }}
              onFocus={e => e.target.style.borderColor = '#D4AF37'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Source</th>
                  <th>Interest</th>
                  <th>Assigned</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Skeleton variant="circle" width="32px" height="32px" />
                          <div className="flex-1">
                            <Skeleton width="100px" height="12px" className="mb-1" />
                            <Skeleton width="140px" height="10px" />
                          </div>
                        </div>
                      </td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="80px" height="8px" /></td>
                      <td><Skeleton width="70px" height="12px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                      <td><Skeleton width="90px" height="12px" /></td>
                      <td><Skeleton width="50px" height="32px" /></td>
                    </tr>
                  ))
                ) : filtered.map(lead => (
                  <tr
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar initials={(lead.contact_name || '??').slice(0, 2).toUpperCase()} size="sm" color="green" />
                        <div>
                          <div className="font-medium text-gray-900">{lead.contact_name}</div>
                          <div className="text-xs text-gray-400">{lead.contact_email}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge status={lead.status} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${lead.score || 0}%`, background: scoreColor(lead.score || 0) }}
                          />
                        </div>
                        <span className="text-xs font-medium" style={{ color: scoreColor(lead.score || 0) }}>
                          {lead.score || 0}
                        </span>
                      </div>
                    </td>
                    <td className="capitalize text-gray-500">{lead.source}</td>
                    <td className="text-gray-500">{lead.interest_type}</td>
                    <td className="text-gray-500 text-[11px] font-medium">
                      {lead.assigned_realtor?.full_name || (lead.assigned_realtor_id ? `…${lead.assigned_realtor_id.slice(-6)}` : <span style={{ color: '#D4AF37' }}>Unassigned</span>)}
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => { e.stopPropagation(); setSelectedLead(lead); }}
                        >
                          View
                        </Button>
                        {canReassign && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => { e.stopPropagation(); openReassign(lead); }}
                          >
                            Reassign
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <div className="text-4xl mb-2">👥</div>
              <p className="font-medium">No leads found</p>
            </div>
          )}
        </div>
      </div>

      <LeadDrawer
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />

      {/* Reassign Lead Modal */}
      <Modal
        open={!!reassignLead}
        onClose={() => setReassignLead(null)}
        title="Reassign Lead"
        footer={
          <>
            <Button variant="outline" onClick={() => setReassignLead(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleReassign} disabled={!reassignRealtorId}>
              Reassign
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Reassigning <strong>{reassignLead?.name}</strong> will transfer this lead and reset the 180-day attribution window.
          </p>
          {realtorsLoading ? (
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <select
              value={reassignRealtorId}
              onChange={e => setReassignRealtorId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
            >
              <option value="" disabled>Select a realtor…</option>
              {realtors.map(r => (
                <option key={r.id} value={r.id}>{r.full_name}{r.email ? ` — ${r.email}` : ''}</option>
              ))}
            </select>
          )}
        </div>
      </Modal>

      {/* Add Lead Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Lead"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddLead} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Lead'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {[
            { label: 'Full Name', key: 'name', placeholder: 'Jane Smith', type: 'text' },
            { label: 'Email Address', key: 'email', placeholder: 'jane@example.com', type: 'email' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{f.label}</label>
              <input
                type={f.type}
                required
                placeholder={f.placeholder}
                value={addForm[f.key]}
                onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Interest</label>
            <select
              value={addForm.interest}
              onChange={e => setAddForm(p => ({ ...p, interest: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
            >
              {['Buying', 'Selling', 'Renting', 'Investment', 'General'].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Message (optional)</label>
            <textarea
              rows={3}
              placeholder="Any additional notes…"
              value={addForm.message}
              onChange={e => setAddForm(p => ({ ...p, message: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
