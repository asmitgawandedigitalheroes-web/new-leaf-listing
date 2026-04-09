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
import SearchableSelect from '../../components/ui/SearchableSelect';
import { supabase } from '../../lib/supabase';

export default function LeadsPage() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]       = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [reassignLead, setReassignLead] = useState(null);
  const [realtors, setRealtors]         = useState([]);
  const [directors, setDirectors]       = useState([]);
  const [realtorsLoading, setRealtorsLoading] = useState(false);
  const [reassignRealtorId, setReassignRealtorId] = useState('');
  const [assignDirectorId, setAssignDirectorId] = useState('');
  const [assignmentMode, setAssignmentMode] = useState('realtor'); // 'realtor' or 'director'
  const [addOpen, setAddOpen] = useState(false);

  const [addForm, setAddForm] = useState({ name: '', email: '', interest: 'Buying', message: '' });
  const [addFormErrors, setAddFormErrors] = useState({}); // FIX: CRIT-005 — inline validation errors
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { leads, isLoading, reassignLead: doReassign, assignLeadToDirector, fetchAvailableRealtors, createInquiry, updateLeadStatus } = useLeads();

  const handleAddLead = async () => {
    // FIX: CRIT-005 — collect all field errors and display them inline instead of silently failing
    const errors = {};
    if (!addForm.name.trim()) errors.name = 'Full name is required';
    if (!addForm.email.trim()) errors.email = 'Email address is required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(addForm.email)) errors.email = 'Enter a valid email address';
    if (!addForm.message.trim()) errors.message = 'Please add a note for this lead';
    if (Object.keys(errors).length) {
      setAddFormErrors(errors);
      return;
    }
    setAddFormErrors({});
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
      setAddFormErrors({});
    }
  };

  const canReassign = profile?.role === 'admin' || profile?.role === 'director';

  const openReassign = async (lead) => {
    setReassignLead(lead);
    setReassignRealtorId('');
    setAssignDirectorId('');
    setAssignmentMode('realtor');
    setRealtorsLoading(true);

    // Fetch realtors and directors in parallel
    const { data: realtorData } = await fetchAvailableRealtors();
    setRealtors(realtorData);

    // Fetch active directors and their territories
    const { data: directorData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'director')
      .eq('status', 'active')
      .order('full_name');

    if (directorData && directorData.length > 0) {
      // Fetch territories for each director
      const directorIds = directorData.map(d => d.id);
      const { data: territoryData } = await supabase
        .from('territories')
        .select('director_id, city, state')
        .in('director_id', directorIds);

      // Map territories to directors
      const directorMap = {};
      (territoryData || []).forEach(t => {
        if (!directorMap[t.director_id]) {
          directorMap[t.director_id] = [];
        }
        directorMap[t.director_id].push(t);
      });

      const enrichedDirectors = directorData.map(d => ({
        ...d,
        territory: directorMap[d.id] || []
      }));
      setDirectors(enrichedDirectors);
    } else {
      setDirectors([]);
    }
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

  const handleAssignDirector = async () => {
    if (!assignDirectorId) return;
    const { error } = await assignLeadToDirector(reassignLead.id, assignDirectorId);
    addToast(error
      ? { type: 'error', title: 'Assignment failed', desc: error.message }
      : { type: 'success', title: 'Lead assigned to director', desc: 'Director will assign to their realtor.' });
    setReassignLead(null);
  };

  // Groups for tab filtering
  const STATUS_GROUPS = {
    new:         s => s === 'new',
    assigned:    s => s === 'assigned',
    contacted:   s => s === 'contacted',
    in_progress: s => s === 'showing' || s === 'offer',
    closed:      s => s === 'converted' || s === 'lost',
  };

  const tabs = [
    { key: 'all',         label: 'All',         count: leads.length },
    { key: 'new',         label: 'New',         count: leads.filter(l => STATUS_GROUPS.new(l.status)).length },
    { key: 'assigned',    label: 'Assigned',    count: leads.filter(l => STATUS_GROUPS.assigned(l.status)).length },
    { key: 'contacted',   label: 'Contacted',   count: leads.filter(l => STATUS_GROUPS.contacted(l.status)).length },
    { key: 'in_progress', label: 'In Progress', count: leads.filter(l => STATUS_GROUPS.in_progress(l.status)).length },
    { key: 'closed',      label: 'Closed',      count: leads.filter(l => STATUS_GROUPS.closed(l.status)).length },
  ];

  const filtered = useMemo(() => {
    let list = leads;
    if (activeTab !== 'all') {
      const match = STATUS_GROUPS[activeTab];
      list = match ? list.filter(l => match(l.status)) : list;
    }
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
          <div className="min-w-0 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                      {lead.assigned_realtor?.full_name ? (
                        lead.assigned_realtor.full_name
                      ) : lead.assigned_director?.full_name ? (
                        <span style={{ color: '#D4AF37' }}>{lead.assigned_director.full_name} <span style={{ fontSize: '9px' }}>(Director)</span></span>
                      ) : (
                        <span style={{ color: '#D4AF37' }}>Unassigned</span>
                      )}
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
                            {!lead.assigned_realtor_id && !lead.assigned_director_id ? 'Assign' : 'Reassign'}
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
        lead={leads.find(l => l.id === selectedLead?.id)}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        updateStatus={updateLeadStatus}
      />

      {/* Assign Lead Modal */}
      <Modal
        open={!!reassignLead}
        onClose={() => setReassignLead(null)}
        title="Assign Lead"
        footer={
          <>
            <Button variant="outline" onClick={() => setReassignLead(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={assignmentMode === 'realtor' ? handleReassign : handleAssignDirector}
              disabled={assignmentMode === 'realtor' ? !reassignRealtorId : !assignDirectorId}
            >
              {assignmentMode === 'realtor' ? 'Assign to Realtor' : 'Assign to Director'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            <strong>{reassignLead?.name || reassignLead?.contact_name}</strong>
          </p>

          {/* Assignment Mode Tabs */}
          <div className="flex gap-0 border-b border-gray-300 bg-white">
            <button
              onClick={() => setAssignmentMode('realtor')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                assignmentMode === 'realtor'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Assign to Realtor
            </button>
            <button
              onClick={() => setAssignmentMode('director')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                assignmentMode === 'director'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Assign to Director
            </button>
          </div>

          {/* Realtor Assignment */}
          {assignmentMode === 'realtor' && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-600 uppercase">Realtor</label>
              <p className="text-xs text-gray-500">Assign directly to a realtor. Attribution window resets to 180 days.</p>
              {realtorsLoading ? (
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <div className="[&_[role='listbox']]:max-h-64 [&_[role='option']]:px-4 [&_[role='option']]:py-3">
                  <SearchableSelect
                    value={reassignRealtorId}
                    onChange={val => setReassignRealtorId(val)}
                    options={realtors.map(r => ({
                      value: r.id,
                      label: r.full_name,
                      sublabel: r.email
                    }))}
                    emptyLabel="Select a realtor…"
                    placeholder="Search realtors..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Director Assignment */}
          {assignmentMode === 'director' && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-600 uppercase">Director</label>
              <p className="text-xs text-gray-500">Assign to a director. Director will then assign to a realtor in their territory.</p>
              {realtorsLoading ? (
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <div className="[&_[role='listbox']]:max-h-64 [&_[role='option']]:px-4 [&_[role='option']]:py-3">
                  <SearchableSelect
                    value={assignDirectorId}
                    onChange={val => setAssignDirectorId(val)}
                    options={directors.map(d => ({
                      value: d.id,
                      label: d.full_name,
                      sublabel: d.territory?.[0] ? `${d.territory[0].city}, ${d.territory[0].state}` : d.email
                    }))}
                    emptyLabel="Select a director…"
                    placeholder="Search directors..."
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Lead Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setAddFormErrors({}); }}
        title="Add Lead"
        footer={
          <>
            <Button variant="outline" onClick={() => { setAddOpen(false); setAddFormErrors({}); }}>Cancel</Button>
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
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{f.label} *</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={addForm[f.key]}
                onChange={e => {
                  setAddForm(p => ({ ...p, [f.key]: e.target.value }));
                  if (addFormErrors[f.key]) setAddFormErrors(p => ({ ...p, [f.key]: '' }));
                }}
                className="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none"
                style={{ borderColor: addFormErrors[f.key] ? '#EF4444' : '#E5E7EB', background: addFormErrors[f.key] ? '#FFF5F5' : undefined }}
              />
              {/* FIX: CRIT-005 — inline error messages */}
              {addFormErrors[f.key] && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{addFormErrors[f.key]}</p>
              )}
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Interest</label>
            <SearchableSelect
              value={addForm.interest}
              onChange={val => setAddForm(p => ({ ...p, interest: val }))}
              options={['Buying', 'Selling', 'Renting', 'Investment', 'General'].map(o => ({
                value: o,
                label: o
              }))}
              placeholder="Select interest..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Message *</label>
            <textarea
              rows={3}
              placeholder="Any additional notes…"
              value={addForm.message}
              onChange={e => {
                setAddForm(p => ({ ...p, message: e.target.value }));
                if (addFormErrors.message) setAddFormErrors(p => ({ ...p, message: '' }));
              }}
              className="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none resize-none"
              style={{ borderColor: addFormErrors.message ? '#EF4444' : '#E5E7EB', background: addFormErrors.message ? '#FFF5F5' : undefined }}
            />
            {addFormErrors.message && (
              <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{addFormErrors.message}</p>
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
