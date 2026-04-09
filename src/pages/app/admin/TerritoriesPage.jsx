import { useState, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import KPICard from '../../../components/shared/KPICard';
import { SectionCard } from '../../../components/ui/Card';
import SearchableSelect from '../../../components/ui/SearchableSelect';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { useTerritories } from '../../../hooks/useTerritories';
import { ActionPill } from '../../../components/shared/TableActions';
import MobileCard, { MobileCardRow, MobileCardActions } from '../../../components/shared/MobileCard';
import { 
  HiGlobeAlt, 
  HiMapPin, 
  HiBriefcase, 
  HiExclamationTriangle,
  HiArrowPath 
} from 'react-icons/hi2';

export default function TerritoriesPage() {
  const { addToast } = useToast();
  const { territories, directors, isLoading, refresh, addTerritory, updateTerritory, deleteTerritory } = useTerritories();

  const [filterCountry, setFilterCountry] = useState('All');
  const [filterState, setFilterState] = useState('All');
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignDirectorId, setAssignDirectorId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({ country: 'USA', state: '', city: '', director_id: '' });

  const countries = useMemo(() => ['All', ...new Set(territories.map(t => t.country))], [territories]);
  const states = useMemo(() => {
    if (filterCountry === 'All') return ['All'];
    return ['All', ...new Set(territories.filter(t => t.country === filterCountry).map(t => t.state))];
  }, [territories, filterCountry]);

  const filtered = useMemo(() => {
    return territories.filter(t => {
      if (filterCountry !== 'All' && t.country !== filterCountry) return false;
      if (filterState !== 'All' && t.state !== filterState) return false;
      return true;
    });
  }, [territories, filterCountry, filterState]);

  const kpis = [
    { label: 'Total Territories', value: territories.length.toString(), trend: 0, trendLabel: 'current', icon: <HiGlobeAlt className="text-blue-600" /> },
    { label: 'Covered States', value: [...new Set(territories.map(t => t.state))].length.toString(), trend: 0, trendLabel: 'current', icon: <HiMapPin className="text-purple-600" /> },
    { label: 'Active Directors', value: territories.filter(t => t.director_id).length.toString(), trend: 0, trendLabel: 'current', icon: <HiBriefcase className="text-green-600" /> },
    { label: 'Unassigned', value: territories.filter(t => !t.director_id).length.toString(), trend: 0, trendLabel: 'current', icon: <HiExclamationTriangle className="text-yellow-600" /> },
  ];

  const handleCountryChange = (val) => {
    setFilterCountry(val);
    setFilterState('All');
  };

  const handleAddTerritory = async () => {
    if (!form.country || !form.state.trim() || !form.city.trim()) {
      addToast({ type: 'error', title: 'Missing fields', desc: 'Please fill in country, state, and city.' });
      return;
    }
    setIsSubmitting(true);
    const { error } = await addTerritory({
      country: form.country,
      state: form.state,
      city: form.city,
      director_id: form.director_id || null
    });
    setIsSubmitting(false);
    if (error) {
      addToast({ type: 'error', title: 'Error', desc: error.message });
    } else {
      setAddOpen(false);
      setForm({ country: 'USA', state: '', city: '', director_id: '' });
      addToast({ type: 'success', title: 'Territory added', desc: 'Successfully created new territory.' });
    }
  };

  const handleAssignDirector = async () => {
    setIsSubmitting(true);
    const { error } = await updateTerritory(assignTarget.id, { director_id: assignDirectorId || null });
    setIsSubmitting(false);
    if (error) {
      addToast({ type: 'error', title: 'Error', desc: error.message });
    } else {
      setAssignOpen(false);
      setAssignTarget(null);
      setAssignDirectorId('');
      addToast({ type: 'success', title: 'Director assigned', desc: 'Territory director updated successfully.' });
    }
  };

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 bg-white';

  return (
    <AppLayout role="admin" title="Territories">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Territories</h1>
            <p className="text-sm text-gray-400">Manage market regions and director assignments.</p>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <button onClick={refresh} title="Refresh" className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
              <HiArrowPath size={16} className="text-gray-500" />
            </button>
            <Button variant="primary" onClick={() => setAddOpen(true)}>+ Add Territory</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <Skeleton width="100px" height="12px" className="mb-2" />
                <Skeleton width="60px" height="24px" className="mb-1" />
                <Skeleton width="120px" height="10px" />
              </div>
            ))
          ) : kpis.map(k => <KPICard key={k.label} {...k} />)}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filterCountry}
            onChange={e => handleCountryChange(e.target.value)}
            className="flex-1 min-w-[130px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
          >
            {countries.map(c => <option key={c}>{c}</option>)}
          </select>
          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            className="flex-1 min-w-[130px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
          >
            {states.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* List Table - Desktop */}
        <div className="hidden md:block">
          <SectionCard title={`Territories (${filtered.length})`}>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Territory</th>
                    <th>Director</th>
                    <th>Realtors</th>
                    <th>Listings</th>
                    <th>Leads</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td><Skeleton width="140px" height="14px" /><Skeleton width="80px" height="10px" className="mt-1" /></td>
                        <td><Skeleton variant="circle" width="32px" height="32px" /></td>
                        <td><Skeleton width="40px" height="12px" /></td>
                        <td><Skeleton width="40px" height="12px" /></td>
                        <td><Skeleton width="40px" height="12px" /></td>
                        <td><Skeleton width="60px" height="20px" /></td>
                        <td><Skeleton width="120px" height="28px" /></td>
                      </tr>
                    ))
                  ) : filtered.length > 0 ? (
                    filtered.map(t => (
                      <tr key={t.id}>
                        <td>
                          <div className="font-medium text-gray-900">{t.city}</div>
                          <div className="text-xs text-gray-400">{t.state}, {t.country}</div>
                        </td>
                        <td>
                          {t.directorName ? (
                            <div className="flex items-center gap-2">
                              <Avatar initials={t.directorInitials} size="sm" color="green" />
                              <span className="text-sm text-gray-700">{t.directorName}</span>
                            </div>
                          ) : (
                            <Badge status="draft" label="Unassigned" />
                          )}
                        </td>
                        <td className="text-gray-600 font-medium">{t.realtorsCount}</td>
                        <td className="text-gray-600 font-medium">{t.listingsCount}</td>
                        <td className="text-gray-600 font-medium">{t.leadsCount}</td>
                        <td>
                          <Badge status={t.status === 'unassigned' ? 'draft' : 'active'} label={t.status === 'unassigned' ? 'Unassigned' : 'Active'} />
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setAssignTarget(t); setAssignDirectorId(t.director_id || ''); setAssignOpen(true); }}>
                              {t.director_id ? 'Reassign' : 'Assign Director'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              if (window.confirm(`Delete territory ${t.city}?`)) {
                                deleteTerritory(t.id);
                              }
                            }}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} className="py-16 text-center text-gray-400">No territories found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {isLoading ? [...Array(3)].map((_, i) => (
            <MobileCard key={i}>
              <Skeleton variant="text" width="60%" className="mb-2" />
              <Skeleton variant="text" width="40%" />
            </MobileCard>
          )) : filtered.length > 0 ? filtered.map(t => (
            <MobileCard key={t.id}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{t.city}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>{t.state}, {t.country}</div>
              <MobileCardRow label="Director">{t.directorName || 'Unassigned'}</MobileCardRow>
              <MobileCardRow label="Realtors">{t.realtorsCount}</MobileCardRow>
              <MobileCardRow label="Listings">{t.listingsCount}</MobileCardRow>
              <MobileCardRow label="Status">
                <Badge status={t.status === 'unassigned' ? 'draft' : 'active'} label={t.status === 'unassigned' ? 'Unassigned' : 'Active'} />
              </MobileCardRow>
              <MobileCardActions>
                <ActionPill
                  label={t.director_id ? 'Reassign' : 'Assign Director'}
                  color="#fff"
                  bg="#D4AF37"
                  onClick={() => { setAssignTarget(t); setAssignDirectorId(t.director_id || ''); setAssignOpen(true); }}
                />
                <ActionPill
                  label="Delete"
                  color="#DC2626"
                  bg="rgba(254,226,226,0.8)"
                  onClick={() => { if (window.confirm(`Delete territory ${t.city}?`)) { deleteTerritory(t.id); } }}
                />
              </MobileCardActions>
            </MobileCard>
          )) : (
            <div className="py-16 text-center text-gray-400">
              <p className="font-medium">No territories found</p>
            </div>
          )}
        </div>

      </div>

      {/* Add Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Territory"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddTerritory} isLoading={isSubmitting}>Create Territory</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Country</label>
            <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={inputClass} placeholder="e.g. USA" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">State / Province</label>
            <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputClass} placeholder="e.g. Texas" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">City</label>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} placeholder="e.g. Austin" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Initial Director (optional)</label>
            <SearchableSelect
              value={form.director_id}
              onChange={val => setForm(f => ({ ...f, director_id: val }))}
              options={directors.map(d => ({
                value: d.id,
                label: d.full_name,
                sublabel: d.email
              }))}
              emptyLabel="— Select Director —"
              placeholder="Search directors..."
            />
          </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal
        open={assignOpen}
        onClose={() => { setAssignOpen(false); setAssignTarget(null); setAssignDirectorId(''); }}
        title={assignTarget ? `Assign Director — ${assignTarget.city}` : 'Assign Director'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button variant="green" onClick={handleAssignDirector} isLoading={isSubmitting}>Confirm Assignment</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-lg bg-gray-50 text-sm text-gray-600">
            <strong>{assignTarget?.city}</strong>, {assignTarget?.state}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Director</label>
            <SearchableSelect
              value={assignDirectorId}
              onChange={val => setAssignDirectorId(val)}
              options={directors.map(d => ({
                value: d.id,
                label: d.full_name,
                sublabel: d.email
              }))}
              emptyLabel="— None —"
              placeholder="Search directors..."
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
