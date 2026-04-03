import { useState, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import ListingCard from '../../../components/shared/ListingCard';
import Tabs from '../../../components/ui/Tabs';
import Skeleton from '../../../components/ui/Skeleton';
import { useListings } from '../../../hooks/useListings';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';

export default function DirectorListingsPage() {
  useDocumentTitle('Territory Listings');
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const {
    listings: allListings,
    isLoading,
    approveListing,
    rejectListing,
    markSold,
    archiveListing,
  } = useListings({ search });

  const tabs = useMemo(() => [
    { key: 'all',     label: 'All',     count: allListings.length },
    { key: 'pending', label: 'Pending', count: allListings.filter(l => l.status === 'pending').length },
    { key: 'active',  label: 'Active',  count: allListings.filter(l => l.status === 'active').length },
    { key: 'sold',    label: 'Sold',    count: allListings.filter(l => l.status === 'sold').length },
  ], [allListings]);

  const filteredListings = useMemo(() => {
    if (activeTab === 'all') return allListings;
    return allListings.filter(l => l.status === activeTab);
  }, [allListings, activeTab]);

  const handleAction = async (id, action) => {
    const actions = { approve: approveListing, reject: rejectListing, sold: markSold, archive: archiveListing };
    const fn = actions[action];
    if (!fn) return;
    const { error } = await fn(id);
    addToast(error
      ? { type: 'error', title: 'Action failed', desc: error.message }
      : { type: 'success', title: `Listing ${action}d successfully` });
  };

  return (
    <AppLayout role="director" title="Territory Listings">
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Territory Listings</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {allListings.length} properties in your territory
            </p>
          </div>
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

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 p-4 bg-white shadow-sm">
                <Skeleton height="160px" className="mb-3" />
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="40%" />
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
                onApprove={() => handleAction(listing.id, 'approve')}
                onReject={() => handleAction(listing.id, 'reject')}
                onMarkSold={() => handleAction(listing.id, 'sold')}
                onArchive={() => handleAction(listing.id, 'archive')}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-gray-400">
            <div className="text-5xl mb-3">🏠</div>
            <p className="font-medium text-gray-500">No listings found</p>
            <p className="text-sm mt-1">No listings match the current filter in your territory.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
