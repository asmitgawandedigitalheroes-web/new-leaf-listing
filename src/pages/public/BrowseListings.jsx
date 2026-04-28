import { useState, useMemo } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { 
  HiHome, 
  HiSparkles, 
  HiSquare3Stack3D, 
  HiArrowLongRight, 
  HiChevronRight, 
  HiAdjustmentsVertical, 
  HiMagnifyingGlass, 
  HiSquares2X2, 
  HiBars3BottomLeft, 
  HiMagnifyingGlassCircle 
} from 'react-icons/hi2';
import PublicNav from '../../components/layout/PublicNav';
import PublicFooter from '../../components/layout/PublicFooter';
import Skeleton from '../../components/ui/Skeleton';
import { usePublicListings } from '../../hooks/usePublicListings';

// NLV Brand Colors
const P   = '#D4AF37';
const PH  = '#B8962E';
const S   = '#1F4D3A';
const SCL = '#E8F3EE';
const OS  = '#111111';
const OSV = '#4B5563';
const LGRAY = '#6B7280';
const BORDER = '#E5E7EB';
const SURFBG = '#F9FAFB';
const SURFMID = '#E8F3EE';

// Removed legacy Ico function

// Tier/upgrade filter — 'featured' and 'top' map to upgrade_type, not status
const TIER_FILTERS = [
  { value: 'all',      label: 'All Properties' },
  { value: 'top',      label: 'Top Picks' },
  { value: 'featured', label: 'Featured' },
];

const SORT_OPTIONS = [
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'newest',     label: 'Newest First' },
];

const PROPERTY_TYPES = ['Any Type', 'Residential', 'Commercial', 'Luxury', 'Land'];

const STATUS_COLORS = {
  active:   { bg: SCL,     color: S },
  featured: { bg: 'linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)', color: '#fff' },
  top:      { bg: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)', color: '#fff' },
  pending:  { bg: '#FFF7ED', color: '#C2410C' },
  sold:     { bg: '#F3F4F6', color: '#6B7280' },
};

function ListingCard({ listing }) {
  const sc = STATUS_COLORS[listing.status] || STATUS_COLORS.active;
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: '#fff', boxShadow: '0 2px 8px rgba(26,32,44,0.05)', border: `1px solid ${BORDER}` }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,32,44,0.10)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.35)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,32,44,0.05)'; e.currentTarget.style.borderColor = BORDER; }}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ height: 200 }}>
        <img
          src={listing.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80'}
          alt={listing.title}
          className="w-full h-full object-cover"
          style={{ transition: 'transform .35s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        />
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize"
          style={{ background: sc.bg, color: sc.color, letterSpacing: '0.03em' }}
        >
          {listing.status === 'active' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 mb-0.5" style={{ background: P }} />
          )}
          {listing.status}
        </div>
        {/* Upgrade badge */}
        {(listing.upgrade_type === 'featured' || listing.upgrade_type === 'top') && (
          <div
            className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ 
              background: STATUS_COLORS[listing.upgrade_type]?.bg,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            {listing.upgrade_type}
          </div>
        )}
        {/* Price */}
        <div
          className="absolute bottom-3 right-3 px-3 py-1 rounded-lg text-[12px] font-bold"
          style={{ background: 'rgba(26,32,44,0.80)', color: '#fff', backdropFilter: 'blur(4px)' }}
        >
          ${listing.price?.toLocaleString()}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-headline font-semibold text-sm leading-snug mb-0.5 truncate" style={{ color: OS }}>
          {listing.title}
        </h3>
        <p className="text-[12px] mb-3 truncate" style={{ color: LGRAY }}>
          {listing.address}, {listing.city}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4" style={{ color: OSV }}>
          <span className="flex items-center gap-1 text-[12px]"><HiHome size={14} color={LGRAY} /> {listing.bedrooms} bd</span>
          <span className="flex items-center gap-1 text-[12px]"><HiSparkles size={14} color={LGRAY} /> {listing.bathrooms} ba</span>
          <span className="flex items-center gap-1 text-[12px]"><HiSquare3Stack3D size={14} color={LGRAY} /> {listing.sqft?.toLocaleString()} ft²</span>
        </div>

        {/* Agent + CTA */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${P}, ${S})` }}
            >
              {listing.realtor?.avatar_url ? (
                <img src={listing.realtor.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                listing.realtor?.full_name?.[0] || 'A'
              )}
            </div>
            <span className="text-[11px]" style={{ color: LGRAY }}>{listing.realtor?.full_name || 'NLV Agent'}</span>
          </div>
          <Link
            to={`/listing/${listing.id}`}
            className="text-[11px] font-semibold no-underline flex items-center gap-1 transition-colors"
            style={{ color: P }}
            onMouseEnter={e => e.currentTarget.style.color = S}
            onMouseLeave={e => e.currentTarget.style.color = P}
          >
            View <HiArrowLongRight size={13} color="inherit" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ListingCardSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#fff', border: `1px solid ${BORDER}`, height: '400px' }}
    >
      <Skeleton height="200px" />
      <div className="p-4">
        <Skeleton variant="text" width="80%" height="1.2rem" className="mb-2" />
        <Skeleton variant="text" width="60%" className="mb-4" />
        <div className="flex gap-4 mb-4 mt-2">
          <Skeleton width="40px" height="15px" />
          <Skeleton width="40px" height="15px" />
          <Skeleton width="40px" height="15px" />
        </div>
        <div className="flex justify-between items-center pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <Skeleton variant="circle" width="24px" height="24px" />
            <Skeleton width="60px" height="10px" />
          </div>
          <Skeleton width="40px" height="15px" />
        </div>
      </div>
    </div>
  );
}

export default function BrowseListings() {
  useDocumentTitle('Browse Listings');
  const [search,       setSearch]       = useState('');
  const [tierFilter,   setTierFilter]   = useState('all');
  const [sort,         setSort]         = useState('newest');
  const [minPrice,     setMinPrice]     = useState('');
  const [maxPrice,     setMaxPrice]     = useState('');
  const [propType,     setPropType]     = useState('Any Type');
  const [viewMode,     setViewMode]     = useState('grid'); // 'grid' | 'list'
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [page,         setPage]         = useState(1);
  const PAGE_SIZE = 9;

  // usePublicListings handles auth-free fetching with priority sort (top → featured → standard)
  const { listings, isLoading } = usePublicListings({
    search,
    upgradeType: tierFilter === 'all' ? null : tierFilter,
    propertyType: propType,
    minPrice,
    maxPrice,
  });

  // Priority sort is already applied by the hook (top → featured → standard → newest).
  // Secondary client-side price sorts override when user selects price ordering.
  const filtered = useMemo(() => {
    setPage(1); // reset to first page on any filter/sort change
    if (sort === 'price-asc')  return [...listings].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return [...listings].sort((a, b) => b.price - a.price);
    return listings; // 'newest' — keep hook's priority sort
  }, [listings, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visibleListings = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearAll = () => {
    setSearch(''); setTierFilter('all'); setMinPrice(''); setMaxPrice(''); setPropType('Any Type');
  };

  return (
    <div className="min-h-screen" style={{ background: SURFBG }}>
      <PublicNav />

      {/* Page header */}
      <div className="pt-24 pb-10" style={{ background: '#fff', borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4" style={{ color: LGRAY }}>
            <Link to="/" className="text-[12px] no-underline transition-colors" style={{ color: LGRAY }}
              onMouseEnter={e => e.currentTarget.style.color = P}
              onMouseLeave={e => e.currentTarget.style.color = LGRAY}
            >Home</Link>
            <HiChevronRight size={14} color={LGRAY} />
            <span className="text-[12px]" style={{ color: OS }}>Browse Listings</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-headline text-3xl font-black mb-2" style={{ color: OS }}>
                  Property <span style={{ color: P }}>Listings</span>
                </h1>
                <p className="text-sm" style={{ color: OSV }}>
                  Discover {listings.length} curated properties from our exclusive network
                </p>
              </div>
              {/* Mobile Filters toggle button */}
              <button
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0"
                style={{ border: `1px solid ${BORDER}`, color: OSV, background: '#fff' }}
                onClick={() => setSidebarOpen(v => !v)}
              >
                <HiAdjustmentsVertical size={16} color={OSV} />
                Filters
              </button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <HiMagnifyingGlass size={18} color={LGRAY} />
              </span>
              <input
                type="text"
                placeholder="Search city, address…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-sm rounded-xl focus:outline-none w-full md:w-72 transition"
                style={{ border: `1px solid ${BORDER}`, background: '#fff', color: OS }}
                onFocus={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = ''; }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-7">

          {/* ── Sidebar filters ── */}
          <aside className={`lg:w-60 flex-shrink-0 ${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
            <div
              className="rounded-xl p-5 sticky top-24"
              style={{ background: '#fff', boxShadow: '0 2px 8px rgba(26,32,44,0.05)', border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="font-headline font-semibold text-sm" style={{ color: OS }}>Filters</span>
                <button
                  onClick={clearAll}
                  className="text-[11px] font-medium transition-colors"
                  style={{ color: LGRAY }}
                  onMouseEnter={e => e.currentTarget.style.color = P}
                  onMouseLeave={e => e.currentTarget.style.color = LGRAY}
                >
                  Clear all
                </button>
              </div>

              {/* Tier / Upgrade */}
              <div className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: LGRAY }}>Listing Tier</p>
                <div className="flex flex-col gap-1">
                  {TIER_FILTERS.map(tf => (
                    <button
                      key={tf.value}
                      onClick={() => setTierFilter(tf.value)}
                      className="px-3 py-2 rounded-lg text-[12px] text-left transition-all"
                      style={{
                        background: tierFilter === tf.value ? SCL : 'transparent',
                        color: tierFilter === tf.value ? S : OSV,
                        fontWeight: tierFilter === tf.value ? 600 : 400,
                        borderLeft: tierFilter === tf.value ? `2px solid ${P}` : '2px solid transparent',
                      }}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Type */}
              <div className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: LGRAY }}>Property Type</p>
                <div className="flex flex-col gap-1">
                  {PROPERTY_TYPES.map(pt => (
                    <button
                      key={pt}
                      onClick={() => setPropType(pt)}
                      className="px-3 py-2 rounded-lg text-[12px] text-left transition-all"
                      style={{
                        background: propType === pt ? SCL : 'transparent',
                        color: propType === pt ? S : OSV,
                        fontWeight: propType === pt ? 600 : 400,
                        borderLeft: propType === pt ? `2px solid ${P}` : '2px solid transparent',
                      }}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: LGRAY }}>Price Range</p>
                <div className="flex flex-col gap-2">
                  <input
                    type="number"
                    placeholder="Min price"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none transition"
                    style={{ border: `1px solid ${BORDER}`, color: OS, background: '#fff' }}
                    onFocus={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(212,175,55,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = ''; }}
                  />
                  <input
                    type="number"
                    placeholder="Max price"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none transition"
                    style={{ border: `1px solid ${BORDER}`, color: OS, background: '#fff' }}
                    onFocus={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(212,175,55,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = ''; }}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* ── Listings grid ── */}
          <div className="flex-1 min-w-0">
            {/* Sort / view bar */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm" style={{ color: OSV }}>
                <span className="font-semibold" style={{ color: OS }}>{filtered.length}</span> properties found
              </p>
              <div className="flex items-center gap-3">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="text-[12px] px-3 py-2 rounded-lg focus:outline-none"
                  style={{ border: `1px solid ${BORDER}`, color: OS, background: '#fff' }}
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* View toggle */}
                <div
                  className="flex rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${BORDER}` }}
                >
                  {[
                    { v: 'grid', icon: 'grid_view' },
                    { v: 'list', icon: 'view_list' },
                  ].map(({ v, icon }) => (
                    <button
                      key={v}
                      onClick={() => setViewMode(v)}
                      className="px-2.5 py-1.5 transition-colors"
                      style={{
                        background: viewMode === v ? P : 'transparent',
                        color: viewMode === v ? '#fff' : LGRAY,
                      }}
                    >
                      {v === 'grid' ? <HiSquares2X2 size={16} color={viewMode === v ? '#fff' : LGRAY} /> : <HiBars3BottomLeft size={16} color={viewMode === v ? '#fff' : LGRAY} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          {isLoading ? (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'flex flex-col gap-4'
            }>
              {[...Array(6)].map((_, i) => <ListingCardSkeleton key={i} />)}
            </div>
          ) : filtered.length > 0 ? (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'flex flex-col gap-4'
            }>
              {visibleListings.map(listing => (
                  viewMode === 'grid'
                    ? <ListingCard key={listing.id} listing={listing} />
                    : (
                      <div
                        key={listing.id}
                        className="flex flex-col sm:flex-row rounded-xl overflow-hidden transition-all"
                        style={{ background: '#fff', boxShadow: '0 2px 8px rgba(26,32,44,0.05)', border: `1px solid ${BORDER}` }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.35)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,32,44,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,32,44,0.05)'; }}
                      >
                        <div className="w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 overflow-hidden relative">
                          <img src={listing.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80'} alt={listing.title} className="w-full h-full object-cover" />
                          <div
                            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                            style={{
                              background: (STATUS_COLORS[listing.status] || STATUS_COLORS.active).bg,
                              color: (STATUS_COLORS[listing.status] || STATUS_COLORS.active).color,
                            }}
                          >
                            {listing.status}
                          </div>
                        </div>
                        <div className="flex-1 p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <h3 className="font-headline font-semibold text-sm" style={{ color: OS }}>{listing.title}</h3>
                              <span className="font-bold text-sm flex-shrink-0" style={{ color: '#D4AF37' }}>${listing.price?.toLocaleString()}</span>
                            </div>
                            <p className="text-[12px] mb-3" style={{ color: LGRAY }}>{listing.address}, {listing.city}</p>
                            <div className="flex items-center gap-4" style={{ color: OSV }}>
                              <span className="flex items-center gap-1 text-[12px]"><HiHome size={13} color={LGRAY} /> {listing.bedrooms} bd</span>
                              <span className="flex items-center gap-1 text-[12px]"><HiSparkles size={13} color={LGRAY} /> {listing.bathrooms} ba</span>
                              <span className="flex items-center gap-1 text-[12px]"><HiSquare3Stack3D size={13} color={LGRAY} /> {listing.sqft?.toLocaleString()} ft²</span>
                            </div>
                          </div>
                          <div
                            className="flex items-center justify-between pt-3"
                            style={{ borderTop: `1px solid ${BORDER}` }}
                          >
                            <span className="text-[11px]" style={{ color: LGRAY }}>{listing.realtor?.full_name || 'NLV Agent'}</span>
                            <Link
                              to={`/listing/${listing.id}`}
                              className="text-[12px] font-semibold no-underline flex items-center gap-1 transition-colors"
                              style={{ color: P }}
                              onMouseEnter={e => e.currentTarget.style.color = S}
                              onMouseLeave={e => e.currentTarget.style.color = P}
                            >
                              View Details <HiArrowLongRight size={13} color="inherit" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                ))}
              </div>
            ) : (
              <div
                className="text-center py-24 rounded-xl"
                style={{ background: '#fff', border: `1px solid ${BORDER}` }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: SCL }}
                >
                  <HiMagnifyingGlassCircle size={28} color={P} />
                </div>
                <p className="font-headline font-semibold mb-1" style={{ color: OS }}>No properties found</p>
                <p className="text-sm" style={{ color: OSV }}>Try adjusting your filters or search term</p>
                <button
                  onClick={clearAll}
                  className="mt-4 text-sm font-semibold transition-colors"
                  style={{ color: P }}
                  onMouseEnter={e => e.currentTarget.style.color = S}
                  onMouseLeave={e => e.currentTarget.style.color = P}
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-1.5">
                {/* Prev */}
                <button
                  disabled={page === 1}
                  onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ border: `1px solid ${BORDER}`, color: OSV, background: '#fff' }}
                  onMouseEnter={e => { if (page !== 1) { e.currentTarget.style.borderColor = P; e.currentTarget.style.color = S; } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = OSV; }}
                >
                  ← Prev
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-sm" style={{ color: LGRAY }}>…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="w-9 h-9 rounded-lg text-sm font-semibold transition-all"
                        style={
                          page === n
                            ? { background: S, color: '#fff', border: `1px solid ${S}` }
                            : { background: '#fff', color: OSV, border: `1px solid ${BORDER}` }
                        }
                        onMouseEnter={e => { if (page !== n) { e.currentTarget.style.borderColor = P; e.currentTarget.style.color = S; } }}
                        onMouseLeave={e => { if (page !== n) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = OSV; } }}
                      >
                        {n}
                      </button>
                    )
                  )
                }

                {/* Next */}
                <button
                  disabled={page === totalPages}
                  onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ border: `1px solid ${BORDER}`, color: OSV, background: '#fff' }}
                  onMouseEnter={e => { if (page !== totalPages) { e.currentTarget.style.borderColor = P; e.currentTarget.style.color = S; } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = OSV; }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
