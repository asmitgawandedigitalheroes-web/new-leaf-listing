import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useListing } from '../../hooks/useListing';
import { useListings } from '../../hooks/useListings';
import { supabase } from '../../lib/supabase';
import { HiArrowUpTray, HiXMark, HiPhoto, HiMapPin } from 'react-icons/hi2';

const PROPERTY_TYPES = ['House', 'Condo', 'Townhouse', 'Land', 'Multi-Family', 'Commercial'];

export default function ListingEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const { addToast } = useToast();
  const { listing, isLoading: listingLoading } = useListing(id);
  const { updateListing } = useListings();

  const [form, setForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const layoutUser = {
    name: profile?.full_name || 'User',
    role: profile?.role || 'realtor',
    initials: (profile?.full_name || 'U').slice(0, 2).toUpperCase(),
  };

  useEffect(() => {
    if (listing) {
      setForm({
        title:         listing.title || '',
        description:   listing.description || '',
        price:         listing.price || '',
        property_type: listing.property_type || 'House',
        country:       listing.country || 'USA',
        state:         listing.state || '',
        city:          listing.city || '',
        address:       listing.address || '',
        zip_code:      listing.zip_code || '',
        bedrooms:      listing.bedrooms ?? '',
        bathrooms:     listing.bathrooms ?? '',
        sqft:          listing.sqft ?? '',
        images:        listing.images || [],
        latitude:      listing.latitude ?? '',
        longitude:     listing.longitude ?? '',
      });
    }
  }, [listing?.id]);

  const isAdminOrDirector = role === 'admin' || role === 'director';
  const isOwnListing      = listing?.realtor_id === profile?.id;
  const canEdit           = isAdminOrDirector || isOwnListing;

  const backToListings =
    role === 'admin'     ? '/admin/listings' :
    role === 'director'  ? '/director/listings' :
                           '/realtor/listings';

  // ── Image upload ────────────────────────────────────────────────────────────
  const uploadFile = async (file) => {
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Invalid file', desc: 'Please upload an image (PNG, JPG, WEBP).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', title: 'File too large', desc: 'Max image size is 5 MB.' });
      return;
    }
    if ((form.images || []).length >= 5) {
      addToast({ type: 'error', title: 'Limit reached', desc: 'You can upload up to 5 images.' });
      return;
    }
    setUploading(true);
    const ext      = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${profile.id}/${fileName}`;
    try {
      const { error } = await supabase.storage.from('listing-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(filePath);
      setForm(f => ({ ...f, images: [...(f.images || []), publicUrl] }));
      addToast({ type: 'success', title: 'Image uploaded' });
    } catch (err) {
      addToast({ type: 'error', title: 'Upload failed', desc: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const removeImage = (idx) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form) return;
    if (!form.title || form.title.length < 10) {
      addToast({ type: 'error', title: 'Invalid title', desc: 'Title must be at least 10 characters.' }); return;
    }
    if (Number(form.price) < 1000) {
      addToast({ type: 'error', title: 'Invalid price', desc: 'Price must be at least $1,000.' }); return;
    }
    if (!form.description || form.description.trim().length < 10) {
      addToast({ type: 'error', title: 'Description required', desc: 'Add a description (min 10 chars).' }); return;
    }
    if (!form.bedrooms || Number(form.bedrooms) < 1) {
      addToast({ type: 'error', title: 'Bedrooms required' }); return;
    }
    if (!form.bathrooms || Number(form.bathrooms) < 1) {
      addToast({ type: 'error', title: 'Bathrooms required' }); return;
    }
    if (!form.sqft || Number(form.sqft) < 1) {
      addToast({ type: 'error', title: 'Square footage required' }); return;
    }
    if (!form.state?.trim()) { addToast({ type: 'error', title: 'State required' }); return; }
    if (!form.city?.trim())  { addToast({ type: 'error', title: 'City required' }); return; }
    if (!form.address?.trim()) { addToast({ type: 'error', title: 'Address required' }); return; }

    setIsSaving(true);
    const { error } = await updateListing(id, {
      title:         form.title,
      description:   form.description,
      price:         Number(form.price),
      property_type: form.property_type,
      country:       form.country,
      state:         form.state,
      city:          form.city,
      address:       form.address,
      zip_code:      form.zip_code,
      bedrooms:      Number(form.bedrooms) || 0,
      bathrooms:     Number(form.bathrooms) || 0,
      sqft:          Number(form.sqft) || 0,
      images:        form.images || [],
      latitude:      form.latitude  !== '' ? Number(form.latitude)  : null,
      longitude:     form.longitude !== '' ? Number(form.longitude) : null,
    });
    setIsSaving(false);
    if (error) {
      addToast({ type: 'error', title: 'Save failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Listing updated', desc: 'Your changes have been saved.' });
      navigate(backToListings);
    }
  };

  const field = (label, key, type = 'text', opts = {}) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {opts.select ? (
        <select
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white focus:border-yellow-400 transition-colors"
        >
          {opts.select.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      ) : opts.textarea ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          rows={4}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none focus:border-yellow-400 transition-colors"
          placeholder={opts.placeholder || ''}
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={opts.placeholder || ''}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 transition-colors"
          {...(opts.min !== undefined && { min: opts.min })}
          {...(opts.max !== undefined && { max: opts.max })}
          {...(opts.step !== undefined && { step: opts.step })}
        />
      )}
    </div>
  );

  if (!listingLoading && listing && !canEdit) {
    return (
      <AppLayout role={profile?.role || 'realtor'} title="Unauthorized" user={layoutUser}>
        <div className="p-6 text-center py-24">
          <div className="text-5xl mb-3">🔒</div>
          <p className="text-gray-500 font-medium">You don't have permission to edit this listing.</p>
          <Button variant="outline" onClick={() => navigate(backToListings)} className="mt-4">← Back</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role={profile?.role || 'realtor'} title="Edit Listing" user={layoutUser}>
      <div className="p-4 md:p-8 min-h-screen" style={{ background: '#F9FAFB' }}>
        <div className="max-w-2xl mx-auto">

          {/* Back */}
          <button
            onClick={() => navigate(backToListings)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors font-medium"
          >
            ← Back to Listings
          </button>

          {/* Page title */}
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900">Edit Listing</h2>
            <p className="text-sm text-gray-400 mt-1">Update the details for this property listing.</p>
          </div>

          {listingLoading || !form ? (
            <div className="flex flex-col gap-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} width="100%" height="44px" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-5">

              {/* ── Basic Info ── */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-4"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#1F4D3A' }}>1</span>
                  Basic Info
                </h3>
                {field('Title', 'title', 'text', { placeholder: 'e.g. Modern 3BR Home in Las Vegas' })}
                {field('Description', 'description', 'text', { textarea: true, placeholder: 'Describe the property…' })}
                <div className="grid grid-cols-2 gap-4">
                  {field('Price ($)', 'price', 'number', { min: 0, step: 1, placeholder: '250000' })}
                  {field('Property Type', 'property_type', 'text', { select: PROPERTY_TYPES })}
                </div>
              </div>

              {/* ── Location ── */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-4"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#1F4D3A' }}>2</span>
                  Location
                </h3>
                {field('Address', 'address', 'text', { placeholder: '123 Main St' })}
                <div className="grid grid-cols-2 gap-4">
                  {field('City', 'city', 'text', { placeholder: 'Las Vegas' })}
                  {field('State', 'state', 'text', { placeholder: 'NV' })}
                  {field('Zip Code', 'zip_code', 'text', { placeholder: '89101' })}
                  {field('Country', 'country', 'text', { placeholder: 'USA' })}
                </div>
              </div>

              {/* ── Details ── */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-4"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#1F4D3A' }}>3</span>
                  Property Details
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {field('Bedrooms', 'bedrooms', 'number', { min: 0, step: 1 })}
                  {field('Bathrooms', 'bathrooms', 'number', { min: 0, step: 0.5 })}
                  {field('Sq Ft', 'sqft', 'number', { min: 0, step: 1 })}
                </div>
              </div>

              {/* ── Media ── */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-4"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#1F4D3A' }}>4</span>
                  Photos
                  <span className="ml-auto text-xs font-normal text-gray-400">{(form.images || []).length}/5 uploaded</span>
                </h3>

                {/* Image grid */}
                {(form.images || []).length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {form.images.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <button
                            onClick={() => removeImage(idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
                          >
                            <HiXMark size={14} className="text-white" />
                          </button>
                        </div>
                        {idx === 0 && (
                          <div className="absolute bottom-1 left-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                            style={{ background: '#1F4D3A', color: '#fff' }}>
                            Cover
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Drop zone */}
                {(form.images || []).length < 5 && (
                  <label
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className="flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
                    style={{
                      borderColor: dragOver ? '#D4AF37' : '#E5E7EB',
                      background: dragOver ? 'rgba(212,175,55,0.05)' : '#FAFAFA',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: uploading ? '#F3F4F6' : 'rgba(212,175,55,0.1)' }}>
                      {uploading ? (
                        <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <HiArrowUpTray size={22} style={{ color: '#D4AF37' }} />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">
                        {uploading ? 'Uploading…' : 'Drop image here or click to browse'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP — max 5 MB</p>
                    </div>
                  </label>
                )}

                {(form.images || []).length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-gray-500"
                    style={{ background: '#F9FAFB', border: '1px solid #F0F0F0' }}>
                    <HiPhoto size={15} className="text-gray-400 flex-shrink-0" />
                    The first uploaded photo will be used as the cover image.
                  </div>
                )}
              </div>

              {/* ── Map Pin ── */}
              <div className="rounded-2xl p-6 mb-2" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
                <div className="flex items-center gap-2 mb-1">
                  <HiMapPin size={16} style={{ color: '#D4AF37' }} />
                  <h3 className="text-sm font-bold text-gray-800">Map Pin Location</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Listings with coordinates appear as pins on the public map.{' '}
                  Available on <strong>Market Owner</strong> (gold priority pin) and <strong>Dominator</strong> (standard pin) plans only.
                  Use <a href="https://www.latlong.net" target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37' }}>latlong.net</a> to find coordinates.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="e.g. 36.1699"
                      value={form.latitude}
                      onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="e.g. -115.1398"
                      value={form.longitude}
                      onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 transition-colors"
                    />
                  </div>
                </div>
                {form.latitude && form.longitude && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium" style={{ color: '#1F4D3A' }}>
                    <HiMapPin size={13} />
                    Pin set: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                  </div>
                )}
              </div>

              {/* ── Actions ── */}
              <div className="flex gap-3 pb-8">
                <Button variant="outline" onClick={() => navigate(backToListings)}>Cancel</Button>
                <Button variant="primary" onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
              </div>

            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
