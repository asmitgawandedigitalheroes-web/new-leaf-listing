import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import {
  HiMapPin,
  HiStar,
  HiBuildingOffice2,
  HiXMark,
  HiMagnifyingGlass,
  HiAdjustmentsVertical,
} from 'react-icons/hi2';
import PublicNav from '../../components/layout/PublicNav';
import { supabase } from '../../lib/supabase';

// Brand colors
const GOLD  = '#D4AF37';
const DEEP  = '#1F4D3A';
const GRAY  = '#4B5563';
const LGRAY = '#6B7280';
const BORDER = '#E5E7EB';

// ── Custom map pin icons ──────────────────────────────────────────────────────

function makeIcon(isTop) {
  const size = isTop ? 38 : 30;
  const bg   = isTop ? GOLD : DEEP;
  const html = `
    <div style="
      position:relative;
      width:${size}px;
      height:${size}px;
    ">
      <div style="
        width:${size}px;
        height:${size}px;
        background:${bg};
        border:3px solid #fff;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 10px rgba(0,0,0,0.28);
      "></div>
      ${isTop
        ? `<svg style="position:absolute;top:7px;left:7px;transform:rotate(45deg)" width="16" height="16" viewBox="0 0 20 20" fill="white"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`
        : `<svg style="position:absolute;top:6px;left:6px;transform:rotate(45deg)" width="14" height="14" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" clip-rule="evenodd"/></svg>`
      }
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor:[0, -(size + 4)],
  });
}

const ICON_TOP      = makeIcon(true);
const ICON_FEATURED = makeIcon(false);

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(price) {
  if (!price) return 'Price on request';
  return '$' + Number(price).toLocaleString();
}

// ── Sidebar listing card ──────────────────────────────────────────────────────

function SideCard({ listing, active, onClick }) {
  const isTop = listing.upgrade_type === 'top';
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl overflow-hidden transition-all"
      style={{
        border: active
          ? `2px solid ${isTop ? GOLD : DEEP}`
          : `1px solid ${BORDER}`,
        background: active ? (isTop ? 'rgba(212,175,55,0.05)' : 'rgba(31,77,58,0.04)') : '#fff',
        boxShadow: active ? `0 2px 12px rgba(0,0,0,0.08)` : 'none',
      }}
    >
      {/* Image strip */}
      {listing.images?.[0] ? (
        <div className="h-28 overflow-hidden">
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center" style={{ background: isTop ? 'rgba(212,175,55,0.08)' : 'rgba(31,77,58,0.06)' }}>
          <HiBuildingOffice2 size={28} color={isTop ? GOLD : DEEP} />
        </div>
      )}

      <div className="p-3">
        {/* Tier badge */}
        <span
          className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5"
          style={isTop
            ? { background: GOLD, color: '#fff' }
            : { background: DEEP, color: '#fff' }}
        >
          {isTop ? 'Market Owner' : 'Dominator'}
        </span>
        <p className="text-[12px] font-semibold leading-snug mb-1 line-clamp-2" style={{ color: '#111' }}>
          {listing.title}
        </p>
        <p className="text-[11px] mb-1.5" style={{ color: LGRAY }}>
          {[listing.city, listing.state].filter(Boolean).join(', ')}
        </p>
        <p className="text-[13px] font-bold" style={{ color: isTop ? GOLD : DEEP }}>
          {fmt(listing.price)}
        </p>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MapPage() {
  const [listings,  setListings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all'); // 'all' | 'top' | 'featured'
  const [search,    setSearch]    = useState('');
  const [active,    setActive]    = useState(null);  // active listing id
  const [sideOpen,  setSideOpen]  = useState(true);

  useEffect(() => {
    async function fetchMapListings() {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, city, state, address, images, upgrade_type, latitude, longitude')
        .eq('status', 'active')
        .in('upgrade_type', ['top', 'featured'])
        .not('latitude',  'is', null)
        .not('longitude', 'is', null)
        .order('upgrade_type', { ascending: true }); // 'top' comes last → renders on top

      if (!error && data) setListings(data);
      setLoading(false);
    }
    fetchMapListings();
  }, []);

  const filtered = useMemo(() => {
    let list = listings;
    if (filter !== 'all') list = list.filter(l => l.upgrade_type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.title?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q)  ||
        l.state?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [listings, filter, search]);

  const topCount      = listings.filter(l => l.upgrade_type === 'top').length;
  const featuredCount = listings.filter(l => l.upgrade_type === 'featured').length;

  const activeListingDetail = active ? listings.find(l => l.id === active) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0f0f0' }}>
      <PublicNav />

      {/* Page title bar */}
      <div
        className="flex items-center justify-between px-6 py-3 gap-4 flex-wrap"
        style={{ background: DEEP, marginTop: 80 }}
      >
        <div className="flex items-center gap-2">
          <HiMapPin size={18} color={GOLD} />
          <span className="text-sm font-bold text-white">Listings Map</span>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(212,175,55,0.2)', color: GOLD }}
          >
            {filtered.length} showing
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: GOLD }} />
            <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Market Owner ({topCount})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: DEEP, border: '1px solid rgba(255,255,255,0.3)' }} />
            <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Dominator ({featuredCount})
            </span>
          </div>
          {/* Sidebar toggle */}
          <button
            onClick={() => setSideOpen(v => !v)}
            className="hidden md:flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <HiAdjustmentsVertical size={13} />
            {sideOpen ? 'Hide' : 'Show'} Listings
          </button>
        </div>
      </div>

      {/* Main content: map + sidebar */}
      <div className="flex flex-1 relative" style={{ height: 'calc(100vh - 80px - 46px)' }}>

        {/* ── Map ── */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: DEEP, borderTopColor: 'transparent' }} />
                <p className="text-sm font-medium" style={{ color: GRAY }}>Loading map…</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={[39.5, -98.35]}
              zoom={4}
              zoomControl={false}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ZoomControl position="bottomright" />

              {filtered.map(listing => (
                <Marker
                  key={listing.id}
                  position={[listing.latitude, listing.longitude]}
                  icon={listing.upgrade_type === 'top' ? ICON_TOP : ICON_FEATURED}
                  eventHandlers={{
                    click: () => setActive(listing.id),
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 200, fontFamily: 'inherit' }}>
                      {listing.images?.[0] && (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
                        />
                      )}
                      <div
                        style={{
                          display: 'inline-block',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          padding: '2px 8px',
                          borderRadius: 999,
                          marginBottom: 6,
                          background: listing.upgrade_type === 'top' ? GOLD : DEEP,
                          color: '#fff',
                        }}
                      >
                        {listing.upgrade_type === 'top' ? 'Market Owner' : 'Dominator'}
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: '#111', lineHeight: 1.3 }}>
                        {listing.title}
                      </p>
                      <p style={{ fontSize: 11, color: LGRAY, margin: '0 0 6px' }}>
                        {[listing.city, listing.state].filter(Boolean).join(', ')}
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: listing.upgrade_type === 'top' ? GOLD : DEEP, margin: '0 0 10px' }}>
                        {fmt(listing.price)}
                      </p>
                      <a
                        href={`/listing/${listing.id}`}
                        style={{
                          display: 'block',
                          textAlign: 'center',
                          padding: '7px 12px',
                          borderRadius: 8,
                          background: listing.upgrade_type === 'top' ? GOLD : DEEP,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        View Listing →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}

          {/* Empty state overlay */}
          {!loading && filtered.length === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center z-[400] pointer-events-none"
            >
              <div
                className="text-center px-8 py-6 rounded-2xl pointer-events-auto"
                style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
              >
                <HiMapPin size={36} color={LGRAY} style={{ margin: '0 auto 12px' }} />
                <p className="font-bold text-sm mb-1" style={{ color: '#111' }}>No pinned listings yet</p>
                <p className="text-xs" style={{ color: LGRAY }}>
                  Market Owner and Dominator listings with map coordinates will appear here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        {sideOpen && (
          <div
            className="hidden md:flex flex-col"
            style={{
              width: 300,
              background: '#fff',
              borderLeft: `1px solid ${BORDER}`,
              overflowY: 'auto',
            }}
          >
            {/* Search + filter */}
            <div className="p-4 sticky top-0 bg-white z-10" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
                style={{ background: '#F9FAFB', border: `1px solid ${BORDER}` }}
              >
                <HiMagnifyingGlass size={14} color={LGRAY} />
                <input
                  type="text"
                  placeholder="Search city, state…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: '#111' }}
                />
                {search && (
                  <button onClick={() => setSearch('')}>
                    <HiXMark size={14} color={LGRAY} />
                  </button>
                )}
              </div>
              {/* Filter pills */}
              <div className="flex gap-2">
                {[
                  { value: 'all',      label: 'All' },
                  { value: 'top',      label: 'Market Owner' },
                  { value: 'featured', label: 'Dominator' },
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={
                      filter === f.value
                        ? { background: DEEP, color: '#fff' }
                        : { background: '#F3F4F6', color: GRAY }
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cards */}
            <div className="p-3 flex flex-col gap-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ border: `1px solid ${BORDER}` }}>
                    <div className="h-24 bg-gray-100" />
                    <div className="p-3">
                      <div className="h-3 bg-gray-100 rounded mb-2 w-1/2" />
                      <div className="h-4 bg-gray-100 rounded mb-1" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="text-center py-10">
                  <HiMapPin size={28} color={LGRAY} style={{ margin: '0 auto 8px' }} />
                  <p className="text-xs" style={{ color: LGRAY }}>No listings match your filter.</p>
                </div>
              ) : (
                filtered.map(listing => (
                  <SideCard
                    key={listing.id}
                    listing={listing}
                    active={active === listing.id}
                    onClick={() => setActive(active === listing.id ? null : listing.id)}
                  />
                ))
              )}
            </div>

            {/* Tier info footer */}
            <div className="mt-auto p-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: LGRAY }}>Map Access Tiers</p>
              <div className="flex items-start gap-2 mb-2">
                <HiStar size={13} color={GOLD} style={{ flexShrink: 0, marginTop: 1 }} />
                <p className="text-[11px]" style={{ color: GRAY }}>
                  <strong style={{ color: '#111' }}>Market Owner</strong> — Gold priority pins. Exclusive territory visibility.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <HiBuildingOffice2 size={13} color={DEEP} style={{ flexShrink: 0, marginTop: 1 }} />
                <p className="text-[11px]" style={{ color: GRAY }}>
                  <strong style={{ color: '#111' }}>Dominator</strong> — Standard pins. Visible to all buyers.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
