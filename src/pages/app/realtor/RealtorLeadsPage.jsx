import { useState, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Avatar from '../../../components/ui/Avatar';
import Modal from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useLeads } from '../../../hooks/useLeads';
import { useToast } from '../../../context/ToastContext';
import { HiLockClosed, HiUsers } from 'react-icons/hi2';
import LeadDrawer from '../../../components/shared/LeadDrawer';
import { maskEmail, maskName } from '../../../utils/masking';

const STATUS_TABS = ['all', 'new', 'contacted', 'showing', 'converted'];

const SCORE_COLOR = (s) => s >= 80 ? '#1F4D3A' : s >= 50 ? '#D4AF37' : '#DC2626';

export default function RealtorLeadsPage() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab]   = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLead, setDrawerLead] = useState(null);
  const [addOpen, setAddOpen]       = useState(false);
  const [addForm, setAddForm]       = useState({ name: '', email: '', interest: 'Buying', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { leads, updateLeadStatus, isLoading, createInquiry } = useLeads();

  const handleAddLead = async () => {
    if (!addForm.name || !addForm.email) {
      addToast({ type: 'error', title: 'Missing info', desc: 'Name and email are required.' });
      return;
    }
    setIsSubmitting(true);
    const { error } = await createInquiry({
      ...addForm,
      source: 'Manual Entry',
      territory_id: profile?.territory_id || null,
      assigned_realtor_id: profile?.id // Auto-assign to self if realtor
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

  const filtered = useMemo(() =>
    leads.filter(l => activeTab === 'all' || l.status === activeTab),
    [leads, activeTab]
  );

  const stats = [
    { label: 'Total',       value: leads.length },
    { label: 'New',         value: leads.filter(l => l.status === 'new').length },
    { label: 'Showing',     value: leads.filter(l => l.status === 'showing' || l.status === 'contacted').length },
    { label: 'Converted',   value: leads.filter(l => l.status === 'converted').length },
  ];

  const openDrawer = (lead) => {
    setDrawerLead(lead);
    setDrawerOpen(true);
  };


  return (
    <AppLayout role="realtor" title="My Leads">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Leads</h2>
            <p className="text-sm text-gray-400 mt-0.5">{leads.length} active leads</p>
          </div>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            + Add Lead
          </Button>
        </div>

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
                background: activeTab === tab ? '#D4AF37' : '#F3F4F6',
                color: activeTab === tab ? '#fff' : '#4B5563',
              }}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Lead Cards */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(lead => (
            <div
              key={lead.id}
              className="bg-white rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}
              onClick={() => openDrawer(lead)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar initials={maskName(lead.contact_name)?.slice(0, 2).toUpperCase() || 'L'} size="md" color="gold" />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{maskName(lead.contact_name)}</div>
                    <div className="text-xs text-gray-400">{maskEmail(lead.contact_email)}</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: SCORE_COLOR(lead.score || 0) + '22', color: SCORE_COLOR(lead.score || 0) }}>
                  {lead.score ?? 0}
                </span>
              </div>
              {/* Details */}
              <div className="flex flex-col gap-1.5 mb-3 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Budget</span>
                  <span className="font-medium text-gray-700">${lead.budget_max?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Interest</span>
                  <span className="font-medium text-gray-700 truncate ml-2">{lead.interest_type || 'General Inquiry'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Source</span>
                  <span className="capitalize text-gray-600">Website</span>
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between">
                <Badge status={lead.status} label={lead.status.replace('_', ' ')} />
                <div className="flex items-center gap-1 text-[10px]" style={{ color: '#B8962E' }}>
                  <HiLockClosed className="w-3 h-3" />
                  <span>180d</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <HiUsers className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="font-medium">No {activeTab !== 'all' ? activeTab.replace('_', ' ') : ''} leads</p>
          </div>
        )}

      </div>

      {/* Lead Drawer */}
      <LeadDrawer 
        lead={drawerLead} 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
      />

      {/* Add Lead Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Manual Lead"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddLead} isLoading={isSubmitting}>Create Lead</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Lead Name</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border rounded-lg focus:outline-none"
              placeholder="John Doe"
              value={addForm.name}
              onChange={e => setAddForm({...addForm, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
            <input 
              type="email" 
              className="w-full px-3 py-2 border rounded-lg focus:outline-none"
              placeholder="john@example.com"
              value={addForm.email}
              onChange={e => setAddForm({...addForm, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Interest</label>
            <select 
              className="w-full px-3 py-2 border rounded-lg focus:outline-none bg-white"
              value={addForm.interest}
              onChange={e => setAddForm({...addForm, interest: e.target.value})}
            >
              <option value="Buying">Buying</option>
              <option value="Selling">Selling</option>
              <option value="Investing">Investing</option>
              <option value="Renting">Renting</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
            <textarea 
              className="w-full px-3 py-2 border rounded-lg focus:outline-none min-h-[100px]"
              placeholder="Any additional details..."
              value={addForm.message}
              onChange={e => setAddForm({...addForm, message: e.target.value})}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
