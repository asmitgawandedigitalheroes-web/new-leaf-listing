import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import { useListings } from '../../hooks/useListings';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  HiPhoto, HiArrowUpTray, HiXMark, HiTrash,
  HiEye, HiMapPin,
} from 'react-icons/hi2';
import { ActionPill, ActionMenu } from '../../components/shared/TableActions';

const STEPS = ['Basic Info', 'Location', 'Media', 'Review'];

const defaultForm = {
  title: '', description: '', price: '', property_type: 'House',
  country: 'USA', state: '', city: '', address: '', zip_code: '',
  bedrooms: '', bathrooms: '', sqft: '',
  images: [],
};

export default function ListingsPage() {
  const { user, profile, role } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]       = useState('');
  const [addOpen, setAddOpen]     = useState(false);
  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [openMenuId, setOpenMenuId]     = useState(null);

  const isAdmin = role === 'admin';

  const {
    listings: allListings, isLoading, createListing,
    submitForApproval, approveListing, rejectListing,
    setUpgradeType, markSold, archiveListing,
    deleteListing, deactivateListing,
  } = useListings({ search });

  const tabs = useMemo(() => [
    { key: 'all',      label: 'All',      count: allListings.length },
    { key: 'active',   label: 'Active',   count: allListings.filter(l => l.status === 'active').length },
    { key: 'featured', label: 'Featured', count: allListings.filter(l => l.upgrade_type === 'featured' || l.upgrade_type === 'top').length },
    { key: 'pending',  label: 'Pending',  count: allListings.filter(l => l.status === 'pending').length },
    { key: 'draft',    label: 'Draft',    count: allListings.filter(l => l.status === 'draft' || l.status === 'rejected').length },
    ...(isAdmin ? [{ key: 'inactive', label: 'Inactive', count: allListings.filter(l => l.status === 'inactive').length }] : []),
  ], [allListings, isAdmin]);

  const filteredListings = useMemo(() => {
    if (activeTab === 'all') return allListings;
    if (activeTab === 'featured') return allListings.filter(l => l.upgrade_type === 'featured' || l.upgrade_type === 'top');
    if (activeTab === 'draft') return allListings.filter(l => l.status === 'draft' || l.status === 'rejected');
    if (activeTab === 'inactive') return allListings.filter(l => l.status === 'inactive');
    return allListings.filter(l => l.status === activeTab);
  }, [allListings, activeTab]);

  // ── Media Upload ──────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (form.images.length >= 5) { addToast({ type: 'warning', title: 'Limit reached', desc: 'Maximum 5 images allowed per listing.' }); return; }
    if (!file.type.startsWith('image/')) { addToast({ type: 'error', title: 'Invalid file', desc: 'Please upload an image file (PNG, JPG, WEBP).' }); return; }
    if (file.size > 5 * 1024 * 1024) { addToast({ type: 'error', title: 'File too large', desc: 'Maximum image size is 5MB.' }); return; }
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${profile?.id || 'admin'}/${Date.now()}.${fileExt}`;
    try {
      const { error } = await supabase.storage.from('listing-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(filePath);
      setForm(f => ({ ...f, images: [...f.images, publicUrl] }));
      addToast({ type: 'success', title: 'Image uploaded' });
    } catch (err) {
      addToast({ type: 'error', title: 'Upload failed', desc: err.message });
    } finally { setUploading(false); }
  };

  const removeImage = (index) => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  const resetCreate = () => { setStep(0); setForm(defaultForm); };
  const closeCreate = () => { setAddOpen(false); resetCreate(); };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (!form.title || form.title.length < 10) { addToast({ type: 'error', title: 'Invalid title', desc: 'Title must be at least 10 characters long.' }); setIsSubmitting(false); return; }
    if (!form.description.trim()) { addToast({ type: 'error', title: 'Missing description', desc: 'Please add a description for this listing.' }); setIsSubmitting(false); return; }
    if (Number(form.price) < 1000) { addToast({ type: 'error', title: 'Invalid price', desc: 'Listing price must be at least $1,000.' }); setIsSubmitting(false); return; }
    if (!form.bedrooms || Number(form.bedrooms) < 1) { addToast({ type: 'error', title: 'Missing bedrooms', desc: 'Please specify the number of bedrooms.' }); setIsSubmitting(false); return; }
    if (!form.bathrooms || Number(form.bathrooms) < 1) { addToast({ type: 'error', title: 'Missing bathrooms', desc: 'Please specify the number of bathrooms.' }); setIsSubmitting(false); return; }
    if (!form.sqft || Number(form.sqft) < 1) { addToast({ type: 'error', title: 'Missing sqft', desc: 'Please specify the square footage.' }); setIsSubmitting(false); return; }
    if (!form.state.trim()) { addToast({ type: 'error', title: 'Missing state', desc: 'Please specify the state.' }); setIsSubmitting(false); return; }
    if (!form.city.trim()) { addToast({ type: 'error', title: 'Missing city', desc: 'Please specify the city for this listing.' }); setIsSubmitting(false); return; }
    if (!form.address.trim()) { addToast({ type: 'error', title: 'Missing address', desc: 'Please specify the street address.' }); setIsSubmitting(false); return; }

    let territory_id = null;
    if (form.city || form.state) {
      const { data: territories } = await supabase.from('territories').select('id').ilike('city', form.city || '').ilike('state', form.state || '').limit(1);
      if (territories?.length > 0) territory_id = territories[0].id;
    }
    const { error } = await createListing({ ...form, price: Number(form.price), bedrooms: Number(form.bedrooms) || 0, bathrooms: Number(form.bathrooms) || 0, sqft: Number(form.sqft) || 0, images: form.images || [], upgrade_type: 'standard', ...(territory_id ? { territory_id } : {}) });
    setIsSubmitting(false);
    if (error) { addToast({ type: 'error', title: 'Create failed', desc: error.message }); }
    else { addToast({ type: 'success', title: 'Draft Created', desc: 'Listing saved as Draft. Submit it for approval to go live.' }); closeCreate(); }
  };

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 bg-white';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="flex flex-col gap-4">
          <div><label className={labelClass}>Title *</label><input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className={inputClass} placeholder="e.g. 3BR Modern Home in Silver Lake" /></div>
          <div><label className={labelClass}>Description</label><textarea rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className={inputClass + ' resize-none'} placeholder="Describe the property..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Price ($) *</label><input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} className={inputClass} placeholder="500000" /></div>
            <div><label className={labelClass}>Property Type</label><select value={form.property_type} onChange={e => setForm(f => ({...f, property_type: e.target.value}))} className={inputClass}>{['House','Condo','Townhouse','Land','Commercial'].map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelClass}>Beds</label><input type="number" value={form.bedrooms} onChange={e => setForm(f => ({...f, bedrooms: e.target.value}))} className={inputClass} placeholder="3" /></div>
            <div><label className={labelClass}>Baths</label><input type="number" step="0.5" value={form.bathrooms} onChange={e => setForm(f => ({...f, bathrooms: e.target.value}))} className={inputClass} placeholder="2" /></div>
            <div><label className={labelClass}>Sqft</label><input type="number" value={form.sqft} onChange={e => setForm(f => ({...f, sqft: e.target.value}))} className={inputClass} placeholder="1500" /></div>
          </div>
        </div>
      );
      case 1: return (
        <div className="flex flex-col gap-4">
          <div><label className={labelClass}>Country</label><select value={form.country} onChange={e => setForm(f => ({...f, country: e.target.value}))} className={inputClass}><option>USA</option><option>Canada</option><option>UK</option><option>Australia</option></select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>State</label><input value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} className={inputClass} placeholder="California" /></div>
            <div><label className={labelClass}>City *</label><input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} className={inputClass} placeholder="Los Angeles" /></div>
          </div>
          <div><label className={labelClass}>Street Address</label><input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} className={inputClass} placeholder="123 Main St, Unit 4" /></div>
        </div>
      );
      case 2: return (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {form.images.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 shadow-sm">
                <img src={url} alt={`Listing ${idx+1}`} className="w-full h-full object-cover" />
                {idx === 0 && <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-400 text-white text-[10px] font-bold rounded-full shadow-sm">MAIN IMAGE</div>}
                <button onClick={() => removeImage(idx)} className="absolute top-1.5 right-1.5 p-1.5 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"><HiXMark className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {form.images.length < 5 && (
              <label className={`aspect-square flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer bg-gray-50 border-gray-200 ${uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-yellow-50/50 hover:border-yellow-400 group'}`}>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  {uploading ? <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <HiArrowUpTray className="w-5 h-5 text-gray-400 group-hover:text-yellow-600" />}
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">{uploading ? 'Adding...' : `Add Photo (${form.images.length}/5)`}</span>
                {form.images.length === 0 && <span className="text-[9px] text-gray-400 mt-1">PNG, JPG up to 5MB</span>}
              </label>
            )}
          </div>
          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><HiPhoto className="w-4 h-4 text-blue-600" /></div>
            <div><p className="text-xs font-semibold text-blue-800">Gallery Tip</p><p className="text-[11px] text-blue-700/80 leading-relaxed mt-0.5">Add up to 5 high-quality photos. The first image will be your main listing photo shown in search results.</p></div>
          </div>
        </div>
      );
      case 3: return (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-gray-50 space-y-2 text-sm">
            <div className="font-semibold text-gray-700 mb-2">Review Your Listing</div>
            {[['Title',form.title||'—'],['Price',form.price?`$${Number(form.price).toLocaleString()}`:'—'],['Type',form.property_type||'—'],['Location',[form.city,form.state,form.country].filter(Boolean).join(', ')||'—'],['Address',form.address||'—'],['Beds/Baths',form.bedrooms&&form.bathrooms?`${form.bedrooms} bd / ${form.bathrooms} ba`:'—'],['Sqft',form.sqft?`${Number(form.sqft).toLocaleString()} sqft`:'—'],['Photos',`${form.images.length} uploaded`]].map(([k,v]) => (
              <div key={k} className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-800">{v}</span></div>
            ))}
          </div>
          <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">Listing will be saved as <strong>Draft</strong>. You can submit for approval from your listings list.</div>
        </div>
      );
      default: return null;
    }
  };

  const handleListingAction = async (id, action) => {
    const actions = {
      submit: submitForApproval,
      approve: approveListing,
      reject: rejectListing,
      feature: (id) => setUpgradeType(id, 'featured'),
      unfeature: (id) => setUpgradeType(id, 'standard'),
      sold: markSold,
      archive: archiveListing,
      deactivate: deactivateListing,
    };
    const fn = actions[action];
    if (!fn) return;
    const { error } = await fn(id);
    addToast(error
      ? { type: 'error', title: 'Action failed', desc: error.message }
      : { type: 'success', title: action === 'deactivate' ? 'Listing deactivated' : `Listing ${action}d successfully` });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await deleteListing(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
    addToast(error
      ? { type: 'error', title: 'Delete failed', desc: error.message }
      : { type: 'success', title: 'Listing deleted', desc: `"${deleteTarget.title}" has been permanently removed.` });
  };

  // ── Build dropdown menu items per listing ─────────────────────────────────
  const buildMenuItems = (listing) => {
    const featured = listing.upgrade_type === 'featured' || listing.upgrade_type === 'top';
    const isOwn    = listing.realtor_id === user?.id;
    const items = [];

    if (isOwn) items.push({ label: 'Edit', onClick: () => navigate(`/listings/${listing.id}/edit`) });
    if (listing.status === 'draft' || listing.status === 'rejected')
      items.push({ label: 'Submit for Approval', onClick: () => handleListingAction(listing.id, 'submit') });
    if (listing.status === 'active' && !featured)
      items.push({ label: '★ Feature', color: '#B8962E', onClick: () => handleListingAction(listing.id, 'feature') });
    if (listing.status === 'active' && featured)
      items.push({ label: 'Unfeature', color: '#B8962E', onClick: () => handleListingAction(listing.id, 'unfeature') });
    if (listing.status === 'active' || listing.status === 'under_contract')
      items.push({ label: 'Mark Sold', color: '#5B21B6', onClick: () => handleListingAction(listing.id, 'sold') });
    if (listing.status === 'active')
      items.push({ label: 'Archive', color: '#6B7280', onClick: () => handleListingAction(listing.id, 'archive') });
    if (isAdmin && listing.status !== 'pending' && listing.status !== 'inactive')
      items.push({ label: 'Deactivate', color: '#D97706', onClick: () => handleListingAction(listing.id, 'deactivate') });

    return items;
  };

  // ── Actions: View + 3-dot menu + Delete ──────────────────────────────────
  const renderActions = (listing) => {
    const menuItems = buildMenuItems(listing);
    return (
      <div className="flex items-center gap-1.5">
        <ActionPill icon={HiEye} label="View" color="#2563EB" bg="#EFF6FF"
          onClick={() => navigate(`/listings/${listing.id}`)} />

           {isAdmin && (
          <ActionPill icon={HiTrash} label="Delete" color="#DC2626" bg="#FEF2F2"
            onClick={() => setDeleteTarget(listing)} />
        )}

        <ActionMenu
          items={menuItems}
          open={openMenuId === listing.id}
          onToggle={(v) => setOpenMenuId(v ? listing.id : null)}
        />

       
      </div>
    );
  };

  return (
    <AppLayout
      role={profile?.role || 'realtor'}
      title="Listings"
      user={{ name: profile?.full_name || 'User', role: profile?.role || 'realtor', initials: (profile?.full_name || 'U').slice(0, 2).toUpperCase() }}
    >
      <div className="p-4 md:p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Listings</h2>
            <p className="text-sm text-gray-400 mt-0.5">{allListings.length} properties total</p>
          </div>
          <Button variant="primary" onClick={() => setAddOpen(true)}>+ Add Listing</Button>
        </div>

        {/* Tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <Tabs tabs={tabs} defaultTab="all" onChange={setActiveTab} />
          <div className="sm:ml-auto">
            <input type="text" placeholder="Search listings..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
              onFocus={e => e.target.style.borderColor = '#D4AF37'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
          </div>
        </div>

        {/* ── Desktop Table (md+) ── */}
        <div className="hidden md:block overflow-visible rounded-2xl"
          style={{ border: '1px solid #E5E7EB', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton width="48px" height="48px" className="rounded-lg flex-shrink-0" />
                  <div className="flex-1"><Skeleton variant="text" width="45%" className="mb-1.5" /><Skeleton variant="text" width="28%" /></div>
                  <Skeleton width="70px" height="22px" className="rounded-full" />
                  <Skeleton width="80px" height="20px" />
                  <Skeleton width="120px" height="28px" className="rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">🏠</div>
              <p className="font-medium text-gray-500">No listings found</p>
              <p className="text-sm mt-1">Try a different filter or add a new listing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                    {['Listing', 'Agent', 'Status', 'Price', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map((listing, idx) => {
                    const featured = listing.upgrade_type === 'featured' || listing.upgrade_type === 'top';
                    return (
                      <tr key={listing.id}
                        style={{ borderBottom: idx < filteredListings.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                        className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3" style={{ minWidth: 260 }}>
                          <div className="flex items-center gap-3">
                            <img src={listing.images?.[0] || `https://picsum.photos/seed/${listing.id}/80/80`} alt={listing.title}
                              className="w-11 h-11 rounded-lg object-cover flex-shrink-0" style={{ border: '1px solid #F0F0F0' }} />
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 text-sm truncate" style={{ maxWidth: 200 }}>{listing.title}</div>
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <HiMapPin size={10} className="flex-shrink-0" />
                                <span className="truncate" style={{ maxWidth: 190 }}>{[listing.address, listing.city].filter(Boolean).join(', ')}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ minWidth: 130 }}>
                          <span className="text-sm text-gray-600">{listing.realtor?.full_name || '—'}</span>
                        </td>
                        <td className="px-4 py-3" style={{ minWidth: 150 }}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge status={listing.status} />
                            {featured && (
                              <span style={{ background: 'linear-gradient(135deg,#D4AF37,#B8962E)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                                {listing.upgrade_type === 'top' ? 'TOP' : 'FEAT'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ minWidth: 110 }}>
                          <span className="text-sm font-bold text-gray-900">
                            {listing.price ? `$${Number(listing.price).toLocaleString()}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ minWidth: 160 }}>
                          {renderActions(listing)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Mobile Cards (< md) ── */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex gap-3 mb-3">
                  <Skeleton width="64px" height="64px" className="rounded-lg flex-shrink-0" />
                  <div className="flex-1"><Skeleton variant="text" width="70%" className="mb-1.5" /><Skeleton variant="text" width="40%" className="mb-1.5" /><Skeleton variant="text" width="30%" /></div>
                </div>
                <Skeleton height="28px" className="rounded-lg" />
              </div>
            ))
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🏠</div>
              <p className="font-medium text-gray-500">No listings found</p>
            </div>
          ) : (
            filteredListings.map(listing => {
              const featured = listing.upgrade_type === 'featured' || listing.upgrade_type === 'top';
              return (
                <div key={listing.id} className="bg-white rounded-xl overflow-hidden"
                  style={{ border: '1px solid #F0F0F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-start gap-3 p-3">
                    <img src={listing.images?.[0] || `https://picsum.photos/seed/${listing.id}/80/80`} alt={listing.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0" style={{ border: '1px solid #F0F0F0' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-gray-900 line-clamp-1 flex-1">{listing.title}</span>
                        <Badge status={listing.status} />
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <HiMapPin size={10} className="flex-shrink-0" />
                        <span className="truncate">{[listing.address, listing.city].filter(Boolean).join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-gray-900">{listing.price ? `$${Number(listing.price).toLocaleString()}` : '—'}</span>
                        {featured && (
                          <span style={{ background: 'linear-gradient(135deg,#D4AF37,#B8962E)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                            {listing.upgrade_type === 'top' ? 'TOP PICK' : 'FEATURED'}
                          </span>
                        )}
                      </div>
                      {listing.realtor?.full_name && (
                        <div className="text-xs text-gray-400 mt-0.5">Agent: <span className="font-medium text-gray-600">{listing.realtor.full_name}</span></div>
                      )}
                    </div>
                  </div>
                  <div className="px-3 pb-3 pt-2 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid #F3F4F6' }}>
                    {renderActions(listing)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Listing" maxWidth="440px"
        footer={<><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" isLoading={isDeleting} onClick={handleDeleteConfirm}><HiTrash size={15} />Delete Permanently</Button></>}>
        {deleteTarget && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEE2E2' }}><HiTrash size={20} color="#DC2626" /></div>
              <div><p className="text-sm font-bold text-gray-900">{deleteTarget.title}</p><p className="text-xs text-gray-500 mt-0.5">{deleteTarget.city ? `${deleteTarget.city}, ` : ''}{deleteTarget.state}</p></div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">This will <strong>permanently delete</strong> this listing and all associated data. This action <strong>cannot be undone</strong>.</p>
            <p className="text-xs text-gray-400">Tip: Use <strong>Deactivate</strong> instead if you want to hide the listing without deleting it.</p>
          </div>
        )}
      </Modal>

      {/* Create Listing Modal */}
      <Modal open={addOpen} onClose={closeCreate} title={`Create Listing — ${STEPS[step]}`} maxWidth="600px"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1">{STEPS.map((s,i) => <div key={s} className="w-8 h-1.5 rounded-full transition-all" style={{ background: i<=step?'#D4AF37':'#E5E7EB' }} />)}</div>
            <div className="flex gap-2">
              {step > 0 && <Button variant="ghost" onClick={() => setStep(s => s-1)}>Back</Button>}
              <Button variant="ghost" onClick={closeCreate}>Cancel</Button>
              {step < STEPS.length - 1
                ? <Button variant="primary" onClick={() => setStep(s => s+1)}>Next</Button>
                : <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>Save as Draft</Button>}
            </div>
          </div>
        }>
        {renderStep()}
      </Modal>
    </AppLayout>
  );
}
