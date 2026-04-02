import { useState, useMemo, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useListings } from '../../../hooks/useListings';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import { HiPhoto, HiHome, HiExclamationCircle, HiArrowUpTray, HiXMark } from 'react-icons/hi2';

// Upgrade tier display config — prices come from listing_prices table
const TIER_META = {
  standard: { label: 'Standard',  desc: 'Basic listing visibility', color: '#4B5563', bg: '#F3F4F6' },
  featured: { label: 'Featured',  desc: 'Higher search ranking + Featured badge', color: '#B8962E', bg: 'rgba(212,175,55,0.12)' },
  top:      { label: 'Top',       desc: 'Top of search + Homepage spotlight', color: '#5B21B6', bg: '#EDE9FE' },
};

const STATUS_TABS = ['all', 'draft', 'pending', 'active', 'rejected', 'sold'];

const defaultForm = {
  title: '', description: '', price: '', property_type: 'House',
  country: 'USA', state: '', city: '', address: '', zip_code: '',
  bedrooms: '', bathrooms: '', sqft: '',
  images: [],
};

const STEPS = ['Basic Info', 'Location', 'Media', 'Review'];

export default function RealtorListingsPage() {
  const { profile, subscription } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab]   = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen]   = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [upgrading, setUpgrading]   = useState(false);
  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm]     = useState(defaultForm);
  const [listingPrices, setListingPrices] = useState([]);
  const [selectedTier, setSelectedTier]   = useState('featured');
  const [rejectReason, setRejectReason]   = useState('');
  const [uploading, setUploading]         = useState(false);

  const { listings: allListings, createListing, updateListing, submitForApproval, isLoading } = useListings({
    // Fetch all listings for this realtor to calculate global counts accurately
  });

  // Fetch listing upgrade prices from DB
  useEffect(() => {
    supabase
      .from('listing_prices')
      .select('type, label, price, description')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data?.length) setListingPrices(data);
      });
  }, []);

  const tabCounts = useMemo(() => {
    return {
      all:      allListings.length,
      draft:    allListings.filter(l => l.status === 'draft').length,
      pending:  allListings.filter(l => l.status === 'pending').length,
      active:   allListings.filter(l => l.status === 'active').length,
      rejected: allListings.filter(l => l.status === 'rejected').length,
      sold:     allListings.filter(l => l.status === 'sold').length,
    };
  }, [allListings]);

  const filteredListings = useMemo(() => {
    if (activeTab === 'all') return allListings;
    return allListings.filter(l => l.status === activeTab);
  }, [allListings, activeTab]);

  // ── Edit handlers ────────────────────────────────────────────────────────────

  const openEdit = (listing) => {
    setEditTarget(listing);
    setEditForm({
      title:         listing.title || '',
      description:   listing.description || '',
      price:         listing.price || '',
      property_type: listing.property_type || 'House',
      country:       listing.country || 'USA',
      state:         listing.state || '',
      city:          listing.city || '',
      address:       listing.address || '',
      zip_code:      listing.zip_code || '',
      bedrooms:      listing.bedrooms || '',
      bathrooms:     listing.bathrooms || '',
      sqft:          listing.sqft || '',
      images:        listing.images || [],
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.title || editForm.title.length < 10) {
      addToast({ type: 'error', title: 'Invalid title', desc: 'Title must be at least 10 characters long.' });
      return;
    }
    if (Number(editForm.price) < 1000) {
      addToast({ type: 'error', title: 'Invalid price', desc: 'Listing price must be at least $1,000.' });
      return;
    }
    if (!editForm.city) {
      addToast({ type: 'error', title: 'Missing city', desc: 'Please specify the city for this listing.' });
      return;
    }

    const { error } = await updateListing(editTarget.id, {
      ...editForm,
      price:     Number(editForm.price),
      bedrooms:  Number(editForm.bedrooms),
      bathrooms: Number(editForm.bathrooms),
      sqft:      Number(editForm.sqft),
      images:    editForm.images || [],
    });
    if (!error) {
      addToast({ type: 'success', title: 'Listing updated', desc: 'Your changes have been saved.' });
      setEditOpen(false);
    } else {
      addToast({ type: 'error', title: 'Update failed', desc: error.message });
    }
  };

  // ── Submit for Approval ──────────────────────────────────────────────────────

  const handleSubmitForApproval = async (listing) => {
    const { error } = await submitForApproval(listing.id);
    if (error) {
      addToast({ type: 'error', title: 'Cannot submit', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Submitted for review', desc: 'Your listing is now pending approval.' });
    }
  };

  // ── Media Upload ─────────────────────────────────────────────────────────────

  const handleFileUpload = async (e, type = 'create') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check limit
    const currentImages = type === 'create' ? form.images : editForm.images;
    if (currentImages.length >= 5) {
      addToast({ type: 'warning', title: 'Limit reached', desc: 'Maximum 5 images allowed per listing.' });
      return;
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Invalid file', desc: 'Please upload an image file (PNG, JPG, WEBP).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      addToast({ type: 'error', title: 'File too large', desc: 'Maximum image size is 5MB.' });
      return;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${profile.id}/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('listing-images')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

      if (type === 'create') {
        setForm(f => ({ ...f, images: [...f.images, publicUrl] }));
      } else {
        setEditForm(f => ({ ...f, images: [...f.images, publicUrl] }));
      }

      addToast({ type: 'success', title: 'Image uploaded', desc: 'Your image has been added successfully.' });
    } catch (err) {
      console.error('[FileUpload] Upload error:', err);
      addToast({ type: 'error', title: 'Upload failed', desc: err.message });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index, type = 'create') => {
    if (type === 'create') {
      setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
    } else {
      setEditForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
    }
  };

  // ── Create listing ───────────────────────────────────────────────────────────

  const resetCreate = () => { setStep(0); setForm(defaultForm); };
  const closeCreate = () => { setCreateOpen(false); resetCreate(); };
  const handleCreate = async () => {
    setIsSubmitting(true);
    if (!form.title || form.title.length < 10) {
      addToast({ type: 'error', title: 'Invalid title', desc: 'Title must be at least 10 characters long.' });
      setIsSubmitting(false);
      return;
    }
    if (Number(form.price) < 1000) {
      addToast({ type: 'error', title: 'Invalid price', desc: 'Listing price must be at least $1,000.' });
      setIsSubmitting(false);
      return;
    }
    if (!form.city) {
      addToast({ type: 'error', title: 'Missing city', desc: 'Please specify the city for this listing.' });
      setIsSubmitting(false);
      return;
    }

    // HP-5: Auto-assign territory_id based on city + state
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

    const { data, error } = await createListing({
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

    if (!error) {
      addToast({ type: 'success', title: 'Listing Draft Created', desc: 'Click "Submit for Approval" when you are ready to go live.' });
      closeCreate();
    } else {
      addToast({ type: 'error', title: 'Create failed', desc: error.message });
    }
  };

  // ── Stripe Upgrade ───────────────────────────────────────────────────────────

  const openUpgrade = (listing) => {
    setUpgradeTarget(listing);
    setSelectedTier('featured');
    setUpgradeOpen(true);
  };

  const handleUpgrade = async () => {
    if (!upgradeTarget || !selectedTier) return;
    if (selectedTier === upgradeTarget.upgrade_type) {
      addToast({ type: 'warning', title: 'Already on this tier' });
      return;
    }

    // Find the price for the selected tier
    const tierPrice = listingPrices.find(p => p.type === selectedTier);

    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          type: 'listing_upgrade',
          listingId: upgradeTarget.id,
          upgradeType: selectedTier,
          userId: profile.id,
          userEmail: profile.email,
          priceAmount: tierPrice?.price ?? null,
        },
      });

      if (error || !data?.url) {
        throw new Error(error?.message || 'Failed to create checkout session');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('[RealtorListingsPage] Upgrade error:', err);
      const friendlyMsg = err.message?.includes('non-2xx') || err.message?.includes('Edge Function')
        ? 'Payment service is temporarily unavailable. Please try again later or contact support.'
        : (err.message || 'Something went wrong. Please try again.');
      addToast({ type: 'error', title: 'Upgrade failed', desc: friendlyMsg });
    } finally {
      setUpgrading(false);
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

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <AppLayout role="realtor" title="My Listings">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Subscription warning banner */}
        {!hasActiveSubscription && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-200 bg-yellow-50">
            <HiExclamationCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Active subscription required</p>
              <p className="text-xs text-yellow-700 mt-0.5">You need an active subscription to submit listings for review. You can still create drafts.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Listings</h2>
            <p className="text-sm text-gray-400">{allListings.length} total listings</p>
          </div>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>+ Create Listing</Button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => {
            const count = tab === 'all' ? allListings.length : tabCounts[tab] ?? 0;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all capitalize"
                style={{
                  background: activeTab === tab ? '#D4AF37' : '#F3F4F6',
                  color: activeTab === tab ? '#fff' : '#4B5563',
                }}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Listings Grid */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredListings.map(listing => {
            const tierMeta = TIER_META[listing.upgrade_type] || TIER_META.standard;
            const isRejected = listing.status === 'rejected';
            const isDraft    = listing.status === 'draft';
            return (
              <div key={listing.id} className="bg-white rounded-2xl overflow-hidden transition-all hover:shadow-lg"
                style={{
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
                  border: isRejected ? '1.5px solid #FCA5A5' : '1.5px solid transparent',
                }}>
                {/* Image */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={listing.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80'}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <Badge status={listing.status} />
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: tierMeta.bg, color: tierMeta.color }}>
                      {tierMeta.label}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="font-semibold text-gray-900 mb-1 text-sm leading-tight">{listing.title}</div>
                  <div className="text-xs text-gray-400 mb-1">{listing.city} · {listing.property_type}</div>

                  {/* Rejection reason */}
                  {isRejected && listing.rejection_reason && (
                    <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded-lg">
                      <strong>Rejected:</strong> {listing.rejection_reason}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-black text-gray-900">${listing.price?.toLocaleString() || 0}</span>
                    {listing.views_count > 0 && (
                      <span className="text-xs text-gray-400">{listing.views_count} views</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Edit is disabled for active listings — must go through admin to avoid live-listing data changes */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => listing.status === 'active'
                        ? addToast({ type: 'warning', title: 'Cannot edit active listing', desc: 'Contact support or expire the listing first.' })
                        : openEdit(listing)
                      }
                      disabled={listing.status === 'active'}
                      title={listing.status === 'active' ? 'Active listings cannot be edited' : undefined}
                    >Edit</Button>

                    {/* Submit for Approval — shown for draft and rejected listings */}
                    {(isDraft || isRejected) && (
                      <Button
                        variant="green"
                        size="sm"
                        onClick={() => handleSubmitForApproval(listing)}
                        disabled={!hasActiveSubscription}
                        title={!hasActiveSubscription ? 'Active subscription required' : undefined}
                      >
                        Submit for Approval
                      </Button>
                    )}

                    {/* Upgrade — only for active listings that aren't already top tier */}
                    {listing.status === 'active' && listing.upgrade_type !== 'top' && (
                      <Button variant="primary" size="sm" onClick={() => openUpgrade(listing)}>
                        Upgrade
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredListings.length === 0 && !isLoading && (
          <div className="py-16 text-center text-gray-400">
            <HiHome className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="font-medium">No {activeTab !== 'all' ? activeTab : ''} listings</p>
            {activeTab === 'all' && (
              <p className="text-sm mt-1">Click "+ Create Listing" to get started.</p>
            )}
          </div>
        )}

      </div>

      {/* Create Listing Modal */}
      <Modal
        open={createOpen}
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
                <Button variant="primary" onClick={handleCreate} isLoading={isSubmitting}>
                  Save as Draft
                </Button>
              )}
            </div>
          </div>
        }
      >
        {renderStep()}
      </Modal>

      {/* Edit Listing Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Listing"
        maxWidth="600px"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSave} isLoading={isLoading}>Save Changes</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Title</label>
            <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className={inputClass + ' resize-none'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Price ($)</label>
              <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Property Type</label>
              <select value={editForm.property_type} onChange={e => setEditForm(f => ({ ...f, property_type: e.target.value }))} className={inputClass}>
                {['House', 'Condo', 'Townhouse', 'Land', 'Commercial'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Beds</label>
              <input type="number" value={editForm.bedrooms} onChange={e => setEditForm(f => ({ ...f, bedrooms: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Baths</label>
              <input type="number" step="0.5" value={editForm.bathrooms} onChange={e => setEditForm(f => ({ ...f, bathrooms: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Sqft</label>
              <input type="number" value={editForm.sqft} onChange={e => setEditForm(f => ({ ...f, sqft: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input value={editForm.state} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className={inputClass} />
          </div>

          <div className="space-y-3 pt-2">
            <label className={labelClass}>Property Photos ({editForm.images.length}/5)</label>
            <div className="grid grid-cols-4 gap-2">
              {editForm.images.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-100 shadow-sm">
                  <img src={url} alt={`Listing ${idx + 1}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(idx, 'edit')}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <HiXMark className="text-white w-5 h-5" />
                  </button>
                </div>
              ))}
              {editForm.images.length < 5 && (
                <label className={`aspect-square flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all cursor-pointer bg-gray-50 border-gray-200 ${uploading ? 'opacity-50' : 'hover:border-yellow-400 hover:bg-yellow-50/30 group'}`}>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'edit')} disabled={uploading} />
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <HiArrowUpTray className="w-4 h-4 text-gray-400 group-hover:text-yellow-600" />
                  )}
                </label>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Upgrade Modal */}
      <Modal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Upgrade Listing Placement"
        maxWidth="480px"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleUpgrade}
              isLoading={upgrading}
              disabled={!selectedTier || selectedTier === upgradeTarget?.upgrade_type}
            >
              {upgrading ? 'Redirecting to checkout…' : `Upgrade to ${TIER_META[selectedTier]?.label}`}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 mb-1">
            Upgrade <strong>{upgradeTarget?.title}</strong> to boost visibility and generate more leads.
          </p>
          {['featured', 'top'].map(tier => {
            const meta  = TIER_META[tier];
            const dbPrice = listingPrices.find(p => p.type === tier);
            const isCurrent = upgradeTarget?.upgrade_type === tier;
            const isSelected = selectedTier === tier;
            return (
              <button
                key={tier}
                onClick={() => !isCurrent && setSelectedTier(tier)}
                disabled={isCurrent}
                className="flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left"
                style={{
                  borderColor: isSelected ? '#D4AF37' : '#E5E7EB',
                  background: isCurrent ? '#F9FAFB' : isSelected ? 'rgba(212,175,55,0.06)' : '#FAFAFA',
                  opacity: isCurrent ? 0.6 : 1,
                  cursor: isCurrent ? 'default' : 'pointer',
                }}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-sm" style={{ color: isSelected ? '#B8962E' : '#374151' }}>
                    {meta.label}
                    {isCurrent && <span className="ml-2 text-xs text-gray-400">(Current)</span>}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5">{meta.desc}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-bold text-sm" style={{ color: isSelected ? '#D4AF37' : '#374151' }}>
                    {dbPrice ? `$${Number(dbPrice.price).toLocaleString()}/mo` : 'Contact Us'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Modal>
    </AppLayout>
  );
}
