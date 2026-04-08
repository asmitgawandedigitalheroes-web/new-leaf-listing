import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useListing } from '../../hooks/useListing';
import { useListings } from '../../hooks/useListings';

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

  const layoutUser = {
    name: profile?.full_name || 'User',
    role: profile?.role || 'realtor',
    initials: (profile?.full_name || 'U').slice(0, 2).toUpperCase(),
  };

  // Populate form once listing loads
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
        imageUrl:      listing.images?.[0] || '',
      });
    }
  }, [listing?.id]);

  // RBAC: only owner, admin, or director can edit
  const isAdminOrDirector = role === 'admin' || role === 'director';
  const isOwnListing      = listing?.realtor_id === profile?.id;
  const canEdit           = isAdminOrDirector || isOwnListing;

  const handleSave = async () => {
    if (!form) return;
    if (!form.title || form.title.length < 10) {
      addToast({ type: 'error', title: 'Invalid title', desc: 'Title must be at least 10 characters long.' });
      return;
    }
    if (Number(form.price) < 1000) {
      addToast({ type: 'error', title: 'Invalid price', desc: 'Listing price must be at least $1,000.' });
      return;
    }
    if (!form.description || form.description.trim().length < 10) {
      addToast({ type: 'error', title: 'Description required', desc: 'Please add a description (at least 10 characters).' });
      return;
    }
    if (!form.bedrooms || Number(form.bedrooms) < 1) {
      addToast({ type: 'error', title: 'Bedrooms required', desc: 'Please enter the number of bedrooms.' });
      return;
    }
    if (!form.bathrooms || Number(form.bathrooms) < 1) {
      addToast({ type: 'error', title: 'Bathrooms required', desc: 'Please enter the number of bathrooms.' });
      return;
    }
    if (!form.sqft || Number(form.sqft) < 1) {
      addToast({ type: 'error', title: 'Square footage required', desc: 'Please enter the property square footage.' });
      return;
    }
    if (!form.state || !form.state.trim()) {
      addToast({ type: 'error', title: 'State required', desc: 'Please specify the state for this listing.' });
      return;
    }
    if (!form.city || !form.city.trim()) {
      addToast({ type: 'error', title: 'City required', desc: 'Please specify the city for this listing.' });
      return;
    }
    if (!form.address || !form.address.trim()) {
      addToast({ type: 'error', title: 'Address required', desc: 'Please enter the property address.' });
      return;
    }

    setIsSaving(true);
    const { imageUrl, ...baseForm } = form;
    const { error } = await updateListing(id, {
      ...baseForm,
      price:     Number(form.price),
      bedrooms:  Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      sqft:      Number(form.sqft) || 0,
      images:    imageUrl ? [imageUrl] : (listing.images || []),
    });
    setIsSaving(false);
    if (error) {
      addToast({ type: 'error', title: 'Save failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Listing updated', desc: 'Your changes have been saved.' });
      navigate(`/listings/${id}`);
    }
  };

  const field = (label, key, type = 'text', opts = {}) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      {opts.select ? (
        <select
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
        >
          {opts.select.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      ) : opts.textarea ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
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
          <Button variant="outline" onClick={() => navigate(`/listings/${id}`)} className="mt-4">← Back</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role={profile?.role || 'realtor'} title="Edit Listing" user={layoutUser}>
      <div className="p-4 md:p-6 max-w-2xl">
        <button
          onClick={() => navigate(`/listings/${id}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          ← Back to Listing
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Listing</h2>

        {listingLoading || !form ? (
          <div className="flex flex-col gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} width="100%" height="40px" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Basic Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-700">Basic Info</h3>
              {field('Title', 'title')}
              {field('Description', 'description', 'text', { textarea: true })}
              {field('Price ($)', 'price', 'number', { min: 0, step: 1 })}
              {field('Property Type', 'property_type', 'text', { select: PROPERTY_TYPES })}
            </div>

            {/* Location */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-700">Location</h3>
              <div className="grid grid-cols-2 gap-4">
                {field('Address', 'address')}
                {field('City', 'city')}
                {field('State', 'state')}
                {field('Zip Code', 'zip_code')}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-700">Details</h3>
              <div className="grid grid-cols-3 gap-4">
                {field('Bedrooms', 'bedrooms', 'number', { min: 0, step: 1 })}
                {field('Bathrooms', 'bathrooms', 'number', { min: 0, step: 0.5 })}
                {field('Sq Ft', 'sqft', 'number', { min: 0, step: 1 })}
              </div>
            </div>

            {/* Media */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-700">Media</h3>
              {field('Image URL', 'imageUrl', 'url')}
              {form.imageUrl && (
                <img src={form.imageUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg"
                  onError={e => { e.target.style.display = 'none'; }} />
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate(`/listings/${id}`)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
