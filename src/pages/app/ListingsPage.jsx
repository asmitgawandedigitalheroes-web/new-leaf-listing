import { useState, useMemo } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import ListingCard from '../../components/shared/ListingCard';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import { useListings } from '../../hooks/useListings';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function ListingsPage() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]       = useState('');
  const [addOpen, setAddOpen]     = useState(false);
  const [form, setForm]           = useState({ title: '', price: '', city: '', beds: '', baths: '' });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await createListing({
      title: form.title,
      price: Number(form.price),
      city: form.city,
      bedrooms: Number(form.beds),
      bathrooms: Number(form.baths),
    });
    if (error) {
      addToast({ type: 'error', title: 'Create failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Draft Created', desc: 'Listing saved as Draft. Submit it for approval to go live.' });
      setAddOpen(false);
      setForm({ title: '', price: '', city: '', beds: '', baths: '' });
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

      {/* Add listing modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New Listing"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>Submit for Approval</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: 'Property Title', key: 'title', placeholder: '4BD Modern Home in Henderson' },
            { label: 'Asking Price ($)', key: 'price', placeholder: '650000', type: 'number' },
            { label: 'City', key: 'city', placeholder: 'Las Vegas, NV' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{f.label}</label>
              <input
                type={f.type || 'text'}
                required
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:outline-none"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Beds</label>
              <input
                type="number"
                required
                value={form.beds}
                onChange={e => setForm(p => ({ ...p, beds: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none"
                placeholder="3"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Baths</label>
              <input
                type="number"
                required
                value={form.baths}
                onChange={e => setForm(p => ({ ...p, baths: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none"
                placeholder="2"
              />
            </div>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
