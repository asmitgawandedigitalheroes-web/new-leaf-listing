import { useState, useMemo, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import ListingCard from '../../components/shared/ListingCard';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import { useListings } from '../../hooks/useListings';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { HiPhoto, HiArrowUpTray, HiXMark } from 'react-icons/hi2';

const STEPS = ['Basic Info', 'Location', 'Media', 'Review'];

const defaultForm = {
  title: '', description: '', price: '', property_type: 'House',
  country: 'USA', state: '', city: '', address: '', zip_code: '',
  bedrooms: '', bathrooms: '', sqft: '',
  images: [],
};

export default function ListingsPage() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]       = useState('');
  const [addOpen, setAddOpen]     = useState(false);
  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading]       = useState(false);

  const {
    listings: allListings, isLoading, createListing,
    submitForApproval, approveListing, rejectListing,
    setUpgradeType,
    markSold, archiveListing,
  } = useListings({
    search
  });

  const tabs = useMemo(() => [
    { key: 'all',      label: 'All',      count: allListings.length },
    { key: 'active',   label: 'Active',   count: allListings.filter(l => l.status === 'active').length },
    { key: 'featured', label: 'Featured', count: allListings.filter(l => l.upgrade_type === 'featured' || l.upgrade_type === 'top').length },
    { key: 'pending',  label: 'Pending',  count: allListings.filter(l => l.status === 'pending').length },
    { key: 'draft',    label: 'Draft',    count: allListings.filter(l => l.status === 'draft' || l.status === 'rejected').length },
  ], [allListings]);

  const filteredListings = useMemo(() => {
    if (activeTab === 'all') return allListings;
    if (activeTab === 'featured') return allListings.filter(l => l.upgrade_type === 'featured' || l.upgrade_type === 'top');
    if (activeTab === 'draft') return allListings.filter(l => l.status === 'draft' || l.status === 'rejected');
    return allListings.filter(l => l.status === activeTab);
  }, [allListings, activeTab]);

  // ── Media Upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (form.images.length >= 5) {
      addToast({ type: 'warning', title: 'Limit reached', desc: 'Maximum 5 images allowed per listing.' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Invalid file', desc: 'Please upload an image file (PNG, JPG, WEBP).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', title: 'File too large', desc: 'Maximum image size is 5MB.' });
      return;
    }
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${profile?.id || 'admin'}/${fileName}`;
    try {
      const { error } = await supabase.storage.from('listing-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(filePath);
      setForm(f => ({ ...f, images: [...f.images, publicUrl] }));
      addToast({ type: 'success', title: 'Image uploaded' });
    } catch (err) {
      addToast({ type: 'error', title: 'Upload failed', desc: err.message });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  const resetCreate = () => { setStep(0); setForm(defaultForm); };
  const closeCreate = () => { setAddOpen(false); resetCreate(); };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (!form.title || form.title.length < 10) {
      addToast({ type: 'error', title: 'Invalid title', desc: 'Title must be at least 10 characters long.' });
      setIsSubmitting(false);
      return;
    }
    if (!form.description.trim()) {
      addToast({ type: 'error', title: 'Missing description', desc: 'Please add a description for this listing.' });
      setIsSubmitting(false);
      return;
    }
    if (Number(form.price) < 1000) {
      addToast({ type: 'error', title: 'Invalid price', desc: 'Listing price must be at least $1,000.' });
      setIsSubmitting(false);
      return;
    }
    if (!form.bedrooms || Number(form.bedrooms) < 1) {
      addToast({ type: 'error', title: 'Missing bedrooms', desc: 'Please specify the number of bedrooms.' });
      setIsSubmitting(false);
      return;
    }
    if (!form.bathrooms || Number(form.bathrooms) < 1) {
      addToast({ type: 'error', title: 'Missing bathrooms', desc: 'Please specify the number of bathrooms.' });
      setIsSubmitting(false);
      return;
    }
    if (!form.sqft || Number(form.sqft) < 1) {
      addToast({ type: 'error', title: 'Missing sqft', desc: 'Please specify the square footage.' });
      setIsSubmitting(false);
      return;
    }
    if (!form.state.trim()) {
      addToast({ type: 'error', title: 'Missing state', desc: 'Please specify the state.' });
      setIsSubmitting(false);
      return;
    }
    if (!form.city.trim()) {
      addToast({ type: 'error', title: 'Missing city', desc: 'Please specify the city for this listing.' });
      setIsSubmitting(false);
      return;
    }
    if (!form.address.trim()) {
      addToast({ type: 'error', title: 'Missing address', desc: 'Please specify the street address.' });
      setIsSubmitting(false);
      return;
    }

    // Auto-assign territory_id based on city + state
    let territory_id = null;
    if (form.city || form.state) {
      const { data: territories } = await supabase
        .from('territories')
        .select('id')
        .ilike('city', form.city || '')
        .ilike('state', form.state || '')
        .limit(1);
      if (territories && territories.length > 0) {
        territory_id = territories[0].id;
      }
    }

    const { error } = await createListing({
      ...form,
      price:     Number(form.price),
      bedrooms:  Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      sqft:      Number(form.sqft) || 0,
      images:    form.images || [],
      upgrade_type: 'standard',
      ...(territory_id ? { territory_id } : {}),
    });
    setIsSubmitting(false);
    if (error) {
      addToast({ type: 'error', title: 'Create failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Draft Created', desc: 'Listing saved as Draft. Submit it for approval to go live.' });
      closeCreate();
    }
  };

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 bg-white';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="e.g. 3BR Modern Home in Silver Lake" />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputClass + ' resize-none'} placeholder="Describe the property..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Price ($) *</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inputClass} placeholder="500000" />
            </div>
            <div>
              <label className={labelClass}>Property Type</label>
              <select value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))} className={inputClass}>
                {['House', 'Condo', 'Townhouse', 'Land', 'Commercial'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Beds</label>
              <input type="number" value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} className={inputClass} placeholder="3" />
            </div>
            <div>
              <label className={labelClass}>Baths</label>
              <input type="number" step="0.5" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} className={inputClass} placeholder="2" />
            </div>
            <div>
              <label className={labelClass}>Sqft</label>
              <input type="number" value={form.sqft} onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))} className={inputClass} placeholder="1500" />
            </div>
          </div>
        </div>
      );
      case 1: return (
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Country</label>
            <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={inputClass}>
              <option>USA</option><option>Canada</option><option>UK</option><option>Australia</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>State</label>
              <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputClass} placeholder="California" />
            </div>
            <div>
              <label className={labelClass}>City *</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} placeholder="Los Angeles" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Street Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputClass} placeholder="123 Main St, Unit 4" />
          </div>
        </div>
      );
      case 2: return (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {form.images.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 shadow-sm">
                <img src={url} alt={`Listing ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-400 text-white text-[10px] font-bold rounded-full shadow-sm">
                    MAIN IMAGE
                  </div>
                )}
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                >
                  <HiXMark className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {form.images.length < 5 && (
              <label
                className={`aspect-square flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer bg-gray-50 border-gray-200
                  ${uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-yellow-50/50 hover:border-yellow-400 group'}`}
              >
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <HiArrowUpTray className="w-5 h-5 text-gray-400 group-hover:text-yellow-600" />
                  )}
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                  {uploading ? 'Adding...' : `Add Photo (${form.images.length}/5)`}
                </span>
                {form.images.length === 0 && (
                  <span className="text-[9px] text-gray-400 mt-1">PNG, JPG up to 5MB</span>
                )}
              </label>
            )}
          </div>
          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <HiPhoto className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-800">Gallery Tip</p>
              <p className="text-[11px] text-blue-700/80 leading-relaxed mt-0.5">
                Add up to 5 high-quality photos. The first image will be your main listing photo shown in search results.
              </p>
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-gray-50 space-y-2 text-sm">
            <div className="font-semibold text-gray-700 mb-2">Review Your Listing</div>
            {[
              ['Title',     form.title || '—'],
              ['Price',     form.price ? `$${Number(form.price).toLocaleString()}` : '—'],
              ['Type',      form.property_type || '—'],
              ['Location',  [form.city, form.state, form.country].filter(Boolean).join(', ') || '—'],
              ['Address',   form.address || '—'],
              ['Beds/Baths',form.bedrooms && form.bathrooms ? `${form.bedrooms} bd / ${form.bathrooms} ba` : '—'],
              ['Sqft',      form.sqft ? `${Number(form.sqft).toLocaleString()} sqft` : '—'],
              ['Photos',    `${form.images.length} uploaded`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
            Listing will be saved as <strong>Draft</strong>. You can submit for approval from your listings list.
          </div>
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
      archive: archiveListing
    };
    const fn = actions[action];
    if (!fn) return;
    const { error } = await fn(id);
    addToast(error
      ? { type: 'error', title: 'Action failed', desc: error.message }
      : { type: 'success', title: `Listing ${action}d successfully` });
  };

  return (
    <AppLayout 
      role={profile?.role || 'realtor'} 
      title="Listings" 
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
            <h2 className="text-xl font-bold text-gray-900">All Listings</h2>
            <p className="text-sm text-gray-400 mt-0.5">{allListings.length} properties total</p>
          </div>
          <Button variant="primary" onClick={() => setAddOpen(true)}>+ Add Listing</Button>
        </div>

        {/* Tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <Tabs tabs={tabs} defaultTab="all" onChange={setActiveTab} />
          <div className="sm:ml-auto">
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
              onFocus={e => e.target.style.borderColor = '#D4AF37'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
        </div>

        {/* Grid / Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 p-4 bg-white shadow-sm">
                <Skeleton height="160px" className="mb-3" />
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="40%" />
                <div className="flex gap-4 mt-4">
                  <Skeleton width="100%" height="32px" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filteredListings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                showActions
                onApprove={() => handleListingAction(listing.id, 'approve')}
                onReject={() => handleListingAction(listing.id, 'reject')}
                onSubmit={() => handleListingAction(listing.id, 'submit')}
                onFeature={() => handleListingAction(listing.id, 'feature')}
                onUnfeature={() => handleListingAction(listing.id, 'unfeature')}
                onMarkSold={() => handleListingAction(listing.id, 'sold')}
                onArchive={() => handleListingAction(listing.id, 'archive')}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-gray-400">
            <div className="text-5xl mb-3">🏠</div>
            <p className="font-medium text-gray-500">No listings found</p>
            <p className="text-sm mt-1">Try a different filter or add a new listing.</p>
          </div>
        )}
      </div>

      {/* Create Listing Modal — 4-step wizard (matches Realtor form) */}
      <Modal
        open={addOpen}
        onClose={closeCreate}
        title={`Create Listing — ${STEPS[step]}`}
        maxWidth="600px"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <div key={s} className="w-8 h-1.5 rounded-full transition-all"
                  style={{ background: i <= step ? '#D4AF37' : '#E5E7EB' }} />
              ))}
            </div>
            <div className="flex gap-2">
              {step > 0 && <Button variant="ghost" onClick={() => setStep(s => s - 1)}>Back</Button>}
              <Button variant="ghost" onClick={closeCreate}>Cancel</Button>
              {step < STEPS.length - 1 ? (
                <Button variant="primary" onClick={() => setStep(s => s + 1)}>Next</Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
                  Save as Draft
                </Button>
              )}
            </div>
          </div>
        }
      >
        {renderStep()}
      </Modal>
    </AppLayout>
  );
}
