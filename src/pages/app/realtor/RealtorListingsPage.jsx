import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useListings } from '../../../hooks/useListings';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import { HiPhoto, HiHome, HiExclamationCircle, HiArrowUpTray, HiXMark, HiEye, HiMapPin, HiPencilSquare, HiArrowUpCircle } from 'react-icons/hi2';
import { ActionPill, ActionMenu } from '../../../components/shared/TableActions';
import { usePlanAccess } from '../../../hooks/usePlanAccess';

// Upgrade tier display config — prices come from listing_prices table
const TIER_META = {
  standard: { label: 'Standard',  desc: 'Basic listing visibility', color: '#4B5563', bg: '#F3F4F6' },
  featured: { label: 'Featured',  desc: 'Higher search ranking + Featured badge', color: '#FFFFFF', bg: 'linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)' },
  top:      { label: 'Top',       desc: 'Top of search + Homepage spotlight', color: '#FFFFFF', bg: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' },
};

const STATUS_TABS = ['all', 'draft', 'pending', 'active', 'rejected', 'sold'];

const defaultForm = {
  title: '', description: '', price: '', property_type: 'House',
  country: 'USA', state: '', city: '', address: '', zip_code: '',
  bedrooms: '', bathrooms: '', sqft: '',
  images: [],
};

const STEPS = ['Basic Info', 'Location', 'Media', 'Review'];

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80';


export default function RealtorListingsPage() {
  const { profile, subscription } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { planLimits } = usePlanAccess();

  const [activeTab, setActiveTab]   = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen]   = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [upgrading, setUpgrading]   = useState(false);
  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listingPrices, setListingPrices] = useState([]);
  const [selectedTier, setSelectedTier]   = useState('featured');
  const [rejectReason, setRejectReason]   = useState('');
  const [uploading, setUploading]         = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [filterType, setFilterType]       = useState('');
  const [filterListingType, setFilterListingType] = useState('');
  const [filterSearch, setFilterSearch]   = useState('');
  const [formFieldErrors, setFormFieldErrors] = useState({});
  const [openMenuId, setOpenMenuId]       = useState(null);

  const { listings: allListings, createListing, updateListing, deleteListing, submitForApproval, isLoading, refresh } = useListings({
    // Fetch all listings for this realtor to calculate global counts accurately
  });

  // After Stripe redirect: poll until upgrade_type is reflected in DB (webhook delay)
  const upgradeHandled = useRef(false);
  useEffect(() => {
    const upgradeStatus = searchParams.get('upgrade');
    const targetListingId = searchParams.get('listing');
    const targetTier = searchParams.get('tier');
    if (upgradeStatus !== 'success' || !targetListingId || upgradeHandled.current) return;
    upgradeHandled.current = true;

    navigate('/realtor/listings', { replace: true });
    addToast({ type: 'info', title: 'Processing payment…', desc: 'Your listing upgrade is being activated.' });

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from('listings')
        .select('upgrade_type')
        .eq('id', targetListingId)
        .maybeSingle();

      if (data?.upgrade_type === targetTier) {
        clearInterval(poll);
        refresh();
        addToast({ type: 'success', title: 'Listing upgraded!', desc: `Your listing is now ${targetTier}.` });
      } else if (attempts >= 12) {
        clearInterval(poll);
        refresh();
        addToast({ type: 'warning', title: 'Almost there', desc: 'Upgrade is still processing — refresh in a moment.' });
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Deep-linking: Handle ?edit={id} from dashboard — navigate to full edit page
  useEffect(() => {
    if (isLoading || !allListings.length) return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
      window.history.replaceState({}, '', window.location.pathname);
      navigate(`/listings/${editId}/edit`);
    }
  }, [isLoading, allListings]); // eslint-disable-line react-hooks/exhaustive-deps

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
    let list = activeTab === 'all' ? allListings : allListings.filter(l => l.status === activeTab);
    if (filterType) list = list.filter(l => l.property_type === filterType);
    if (filterListingType) list = list.filter(l => l.listing_type === filterListingType);
    if (filterSearch) list = list.filter(l => l.title?.toLowerCase().includes(filterSearch.toLowerCase()));
    return list;
  }, [allListings, activeTab, filterType, filterListingType, filterSearch]);

  // ── Edit: navigate to full edit page ────────────────────────────────────────
  const openEdit = (listing) => navigate(`/listings/${listing.id}/edit`);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await deleteListing(deleteTarget.id);
    setIsDeleting(false);
    if (!error) {
      addToast({ type: 'success', title: 'Listing deleted successfully' });
    } else {
      addToast({ type: 'error', title: 'Delete failed', desc: error.message });
    }
    setDeleteTarget(null);
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

  const resetCreate = () => { setStep(0); setForm(defaultForm); setFormFieldErrors({}); };
  const closeCreate = () => { setCreateOpen(false); resetCreate(); };

  const validateCreateStep = (currentStep, f) => {
    const errs = {};
    if (currentStep === 0) {
      if (!f.title || f.title.trim().length < 3) errs.title = 'Title must be at least 3 characters';
      if (f.title && f.title.length > 100) errs.title = 'Title must be under 100 characters';
      if (!f.description || f.description.trim().length < 50) errs.description = 'Description must be at least 50 characters';
      if (!f.price || Number(f.price) <= 0) errs.price = 'Price must be greater than $0';
      if (!f.property_type) errs.property_type = 'Property type is required';
    }
    if (currentStep === 1) {
      if (!f.address || !f.address.trim()) errs.address = 'Address is required';
      if (!f.city || !f.city.trim()) errs.city = 'City is required';
      if (!f.state || !f.state.trim()) errs.state = 'State is required';
      if (!f.country) errs.country = 'Country is required';
    }
    return errs;
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    // Run full validation
    const allErrs = { ...validateCreateStep(0, form), ...validateCreateStep(1, form) };
    if (Object.keys(allErrs).length > 0) {
      setFormFieldErrors(allErrs);
      // Navigate to first step with error
      const step0Keys = ['title','description','price','property_type'];
      const hasStep0Err = step0Keys.some(k => allErrs[k]);
      if (hasStep0Err) setStep(0); else setStep(1);
      addToast({ type: 'error', title: 'Please fix the errors below' });
      setIsSubmitting(false);
      return;
    }
    setFormFieldErrors({});

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
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
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
            <input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormFieldErrors(fe => ({ ...fe, title: '' })); }} className={inputClass + (formFieldErrors.title ? ' border-red-400' : '')} placeholder="e.g. 3BR Modern Home in Silver Lake" />
            {formFieldErrors.title && <p className="text-xs mt-1 text-red-500">{formFieldErrors.title}</p>}
          </div>
          <div>
            <label className={labelClass}>Description *</label>
            <textarea rows={2} value={form.description} onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setFormFieldErrors(fe => ({ ...fe, description: '' })); }} className={inputClass + ' resize-none' + (formFieldErrors.description ? ' border-red-400' : '')} placeholder="Describe the property (min 50 characters)..." />
            {formFieldErrors.description && <p className="text-xs mt-1 text-red-500">{formFieldErrors.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Price ($) *</label>
              <input type="number" min="0" step="1" value={form.price} onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setFormFieldErrors(fe => ({ ...fe, price: '' })); }} className={inputClass + (formFieldErrors.price ? ' border-red-400' : '')} placeholder="500000" />
              {formFieldErrors.price && <p className="text-xs mt-1 text-red-500">{formFieldErrors.price}</p>}
            </div>
            <div>
              <label className={labelClass}>Property Type *</label>
              <select value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))} className={inputClass}>
                {['House', 'Condo', 'Townhouse', 'Land', 'Commercial'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Beds</label>
              <input type="number" min="0" step="1" value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} className={inputClass} placeholder="3" />
            </div>
            <div>
              <label className={labelClass}>Baths</label>
              <input type="number" min="0" step="0.5" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} className={inputClass} placeholder="2" />
            </div>
            <div>
              <label className={labelClass}>Sqft</label>
              <input type="number" min="0" step="1" value={form.sqft} onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))} className={inputClass} placeholder="1500" />
            </div>
          </div>
        </div>
      );
      case 1: return (
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Country *</label>
            <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={inputClass}>
              <option>USA</option><option>Canada</option><option>UK</option><option>Australia</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>State *</label>
              <input value={form.state} onChange={e => { setForm(f => ({ ...f, state: e.target.value })); setFormFieldErrors(fe => ({ ...fe, state: '' })); }} className={inputClass + (formFieldErrors.state ? ' border-red-400' : '')} placeholder="California" />
              {formFieldErrors.state && <p className="text-xs mt-1 text-red-500">{formFieldErrors.state}</p>}
            </div>
            <div>
              <label className={labelClass}>City *</label>
              <input value={form.city} onChange={e => { setForm(f => ({ ...f, city: e.target.value })); setFormFieldErrors(fe => ({ ...fe, city: '' })); }} className={inputClass + (formFieldErrors.city ? ' border-red-400' : '')} placeholder="Los Angeles" />
              {formFieldErrors.city && <p className="text-xs mt-1 text-red-500">{formFieldErrors.city}</p>}
            </div>
          </div>
          <div>
            <label className={labelClass}>Street Address *</label>
            <input value={form.address} onChange={e => { setForm(f => ({ ...f, address: e.target.value })); setFormFieldErrors(fe => ({ ...fe, address: '' })); }} className={inputClass + (formFieldErrors.address ? ' border-red-400' : '')} placeholder="123 Main St, Unit 4" />
            {formFieldErrors.address && <p className="text-xs mt-1 text-red-500">{formFieldErrors.address}</p>}
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

  const buildMenuItems = (listing) => {
    const items = [];
    if (listing.status === 'draft' || listing.status === 'rejected') {
      items.push({
        icon: HiArrowUpCircle, label: 'Submit for Approval', color: '#16a34a',
        onClick: () => handleSubmitForApproval(listing),
      });
    }
    if (listing.status === 'active' && listing.upgrade_type !== 'top') {
      items.push({
        icon: HiArrowUpCircle, label: 'Upgrade Listing', color: '#D4AF37',
        onClick: () => openUpgrade(listing),
      });
    }
    return items;
  };

  return (
    <AppLayout role="realtor" title="My Listings">
      <div className="p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto">

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
          <Button variant="primary" onClick={() => {
            const activeCount = allListings.filter(l => l.status === 'active').length;
            const limit = planLimits.listings;
            if (limit !== -1 && activeCount >= limit) {
              addToast({
                type: 'warning',
                title: `Listing limit reached (${limit}/${limit})`,
                desc: 'Upgrade your plan to add more listings.',
              });
              navigate('/realtor/billing');
              return;
            }
            setCreateOpen(true);
          }}>+ Create Listing</Button>
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

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
          <input
            type="text"
            placeholder="Search by title..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 bg-white flex-1 min-w-[160px]"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 bg-white"
          >
            <option value="">All Types</option>
            {['House', 'Condo', 'Land', 'Commercial', 'Multi-family'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={filterListingType}
            onChange={e => setFilterListingType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 bg-white"
          >
            <option value="">All Listing Types</option>
            {['For Sale', 'For Rent', 'For Lease'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {(filterSearch || filterType || filterListingType) && (
            <button
              onClick={() => { setFilterSearch(''); setFilterType(''); setFilterListingType(''); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-red-500 font-medium transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Count */}
        <p className="text-sm text-gray-500">Showing {filteredListings.length} of {allListings.length} listings</p>

        {/* ── Desktop Table ─────────────────────────────────────────────────────── */}
        <div className="hidden md:block">
          <div className="bg-white rounded-2xl overflow-visible" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Listing', 'Status', 'Price', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredListings.length > 0 ? filteredListings.map(listing => {
                  const isUnderContract = listing.status === 'under_contract';
                  const menuItems = buildMenuItems(listing);
                  return (
                    <tr key={listing.id} style={{ borderBottom: '1px solid #F9FAFB' }}
                      className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={listing.images?.[0] || FALLBACK_IMAGE}
                            alt={listing.title}
                            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{listing.title}</div>
                              {listing.upgrade_type === 'featured' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide flex-shrink-0"
                                  style={{ background: 'linear-gradient(135deg,#D4AF37,#B8962E)', color: '#fff' }}>
                                  FEATURED
                                </span>
                              )}
                              {listing.upgrade_type === 'top' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide flex-shrink-0"
                                  style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff' }}>
                                  TOP
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <HiMapPin size={10} />
                              {[listing.city, listing.state].filter(Boolean).join(', ') || 'No location'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3"><Badge status={listing.status} /></td>
                      <td className="px-5 py-3 font-semibold text-gray-900">${listing.price?.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ActionPill
                            icon={HiEye} label="View"
                            color="#1D4ED8" bg="rgba(219,234,254,0.8)"
                            onClick={() => navigate(`/listings/${listing.id}`)}
                          />
                          <ActionPill
                            icon={HiPencilSquare} label="Edit"
                            color="#374151" bg="#F3F4F6"
                            disabled={isUnderContract}
                            onClick={() => openEdit(listing)}
                          />
                          <ActionMenu
                            items={menuItems}
                            open={openMenuId === listing.id}
                            onToggle={v => setOpenMenuId(v ? listing.id : null)}
                          />
                          <ActionPill
                            icon={HiXMark} label="Delete"
                            color="#DC2626" bg="rgba(254,226,226,0.8)"
                            disabled={isUnderContract}
                            onClick={() => setDeleteTarget(listing)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4} className="text-center py-16 text-gray-400">
                      <HiHome className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="font-medium">No {activeTab !== 'all' ? activeTab : ''} listings</p>
                      {activeTab === 'all' && <p className="text-sm mt-1">Click "+ Create Listing" to get started.</p>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Mobile Cards ──────────────────────────────────────────────────────── */}
        <div className="md:hidden flex flex-col gap-4">
          {filteredListings.length > 0 ? filteredListings.map(listing => {
            const tierMeta = TIER_META[listing.upgrade_type] || TIER_META.standard;
            const isRejected = listing.status === 'rejected';
            const isUnderContract = listing.status === 'under_contract';
            const menuItems = buildMenuItems(listing);
            return (
              <div key={listing.id} className="bg-white rounded-2xl overflow-hidden"
                style={{
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
                  border: isRejected ? '1.5px solid #FCA5A5' : '1.5px solid transparent',
                }}>
                <div className="p-4 flex gap-4 relative">
                  {/* Status Badge in top right */}
                  <div className="absolute top-4 right-4">
                    <Badge status={listing.status} />
                  </div>

                  {/* Left: Square Image */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                    <img
                      src={listing.images?.[0] || FALLBACK_IMAGE}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Right: Details */}
                  <div className="flex-1 min-w-0 pr-12">
                    <div className="font-bold text-gray-900 text-base truncate mb-0.5">{listing.title}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                      <HiMapPin size={10} className="text-gray-300" />
                      <span className="truncate">{[listing.address, listing.city].filter(Boolean).join(', ') || 'No location'}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-black text-gray-900">${listing.price?.toLocaleString() || 0}</span>
                      {listing.upgrade_type !== 'standard' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                          style={{ 
                            background: listing.upgrade_type === 'top' ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : 'linear-gradient(135deg,#D4AF37,#B8962E)', 
                            color: '#fff' 
                          }}>
                          {listing.upgrade_type}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-400">
                      Agent: <span className="font-semibold text-gray-600">{profile?.full_name || 'Khushi'}</span>
                    </div>
                  </div>
                </div>

                {isRejected && listing.rejection_reason && (
                  <div className="mx-4 mb-3 text-xs text-red-600 p-2 bg-red-50 rounded-lg border border-red-100">
                    <strong>Reason:</strong> {listing.rejection_reason}
                  </div>
                )}

                {/* Bottom: Actions Row */}
                <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center gap-3">
                  <ActionPill
                    icon={HiEye} label="View"
                    color="#1D4ED8" bg="rgba(219,234,254,0.8)"
                    onClick={() => navigate(`/listings/${listing.id}`)}
                  />
                  <ActionPill
                    icon={HiPencilSquare} label="Edit"
                    color="#374151" bg="#F3F4F6"
                    disabled={isUnderContract}
                    onClick={() => openEdit(listing)}
                  />
                  <ActionPill
                    icon={HiXMark} label="Delete"
                    color="#DC2626" bg="rgba(254,226,226,0.8)"
                    disabled={isUnderContract}
                    onClick={() => setDeleteTarget(listing)}
                  />
                  
                  <div className="ml-auto">
                    <ActionMenu
                      items={menuItems}
                      open={openMenuId === listing.id}
                      onToggle={v => setOpenMenuId(v ? listing.id : null)}
                    />
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="py-16 text-center text-gray-400">
              <HiHome className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="font-medium">No {activeTab !== 'all' ? activeTab : ''} listings</p>
              {activeTab === 'all' && <p className="text-sm mt-1">Click "+ Create Listing" to get started.</p>}
            </div>
          )}
        </div>

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
                <Button variant="primary" onClick={() => {
                  const errs = validateCreateStep(step, form);
                  if (Object.keys(errs).length > 0) {
                    setFormFieldErrors(fe => ({ ...fe, ...errs }));
                    return;
                  }
                  setStep(s => s + 1);
                }}>Next</Button>
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

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Listing?"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
              style={{ background: '#DC2626' }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>?{' '}
          This action cannot be undone.
        </p>
      </Modal>

    </AppLayout>
  );
}
