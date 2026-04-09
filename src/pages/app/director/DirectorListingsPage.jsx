import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import Badge from '../../../components/ui/Badge';
import Tabs from '../../../components/ui/Tabs';
import Skeleton from '../../../components/ui/Skeleton';
import { useListings } from '../../../hooks/useListings';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { ActionPill, ActionMenu } from '../../../components/shared/TableActions';
import {
  HiEye, HiMapPin,
  HiCheckCircle, HiXCircle, HiCurrencyDollar, HiArchiveBox,
} from 'react-icons/hi2';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80';

export default function DirectorListingsPage() {
  useDocumentTitle('Territory Listings');
  const { profile } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

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

  const buildMenuItems = (listing) => {
    const items = [];
    if (listing.status === 'pending') {
      items.push({ icon: HiCheckCircle, label: 'Approve', color: '#16a34a', onClick: () => handleAction(listing.id, 'approve') });
      items.push({ icon: HiXCircle, label: 'Reject', color: '#dc2626', onClick: () => handleAction(listing.id, 'reject') });
    }
    if (listing.status === 'active' || listing.status === 'under_contract') {
      items.push({ icon: HiCurrencyDollar, label: 'Mark Sold', color: '#7c3aed', onClick: () => handleAction(listing.id, 'sold') });
    }
    if (listing.status === 'active') {
      items.push({ icon: HiArchiveBox, label: 'Archive', color: '#6B7280', onClick: () => handleAction(listing.id, 'archive') });
    }
    return items;
  };

  const renderActions = (listing) => {
    const menuItems = buildMenuItems(listing);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ActionPill
          icon={HiEye} label="View"
          color="#1D4ED8" bg="rgba(219,234,254,0.8)"
          onClick={() => navigate(`/listings/${listing.id}`)}
        />
        <ActionMenu
          items={menuItems}
          open={openMenuId === listing.id}
          onToggle={v => setOpenMenuId(v ? listing.id : null)}
        />
      </div>
    );
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

        {/* ── Desktop Table ─────────────────────────────────────────────────────── */}
        <div className="hidden md:block">
          {isLoading ? (
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                  <Skeleton width={44} height={44} />
                  <div className="flex-1"><Skeleton variant="text" width="60%" /></div>
                  <Skeleton variant="text" width={60} />
                  <Skeleton variant="text" width={80} />
                  <Skeleton width={120} height={28} />
                </div>
              ))}
            </div>
          ) : (
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
                  {filteredListings.length > 0 ? filteredListings.map(listing => (
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
                            <div className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{listing.title}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <HiMapPin size={10} />
                              {[listing.city, listing.state].filter(Boolean).join(', ') || 'No location'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3"><Badge status={listing.status} /></td>
                      <td className="px-5 py-3 font-semibold text-gray-900">${listing.price?.toLocaleString()}</td>
                      <td className="px-5 py-3">{renderActions(listing)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="text-center py-16 text-gray-400">
                        <div className="text-4xl mb-2">🏠</div>
                        <p className="font-medium text-gray-500">No listings found</p>
                        <p className="text-sm mt-1">No listings match the current filter in your territory.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Mobile Cards ──────────────────────────────────────────────────────── */}
        <div className="md:hidden flex flex-col gap-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <Skeleton height="160px" className="mb-3" />
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="40%" />
              </div>
            ))
          ) : filteredListings.length > 0 ? filteredListings.map(listing => (
            <div key={listing.id} className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}>
              <div className="relative h-44">
                <img
                  src={listing.images?.[0] || FALLBACK_IMAGE}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2"><Badge status={listing.status} /></div>
              </div>
              <div className="p-4">
                <div className="font-semibold text-gray-900 mb-1">{listing.title}</div>
                <div className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                  <HiMapPin size={11} />
                  {[listing.city, listing.state].filter(Boolean).join(', ') || 'No location'}
                </div>
                <div className="font-bold text-gray-900 mb-3">${listing.price?.toLocaleString()}</div>
                {renderActions(listing)}
              </div>
            </div>
          )) : (
            <div className="text-center py-24 text-gray-400">
              <div className="text-5xl mb-3">🏠</div>
              <p className="font-medium text-gray-500">No listings found</p>
              <p className="text-sm mt-1">No listings match the current filter in your territory.</p>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
