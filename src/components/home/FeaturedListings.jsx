import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiMapPin, HiHomeModern, HiSparkles, HiArrowsPointingOut, HiArrowRight } from 'react-icons/hi2';
import Label from '../shared/Label';
import { supabase } from '../../lib/supabase';

const S     = 'var(--color-gold)';
const P_DK  = 'var(--color-primary-dark)';
const P_LT  = 'var(--color-gold-light)';
const OS    = 'var(--color-on-surface)';
const SURF  = 'var(--color-surface)';
const GR    = 'var(--color-dark-700)';

// Fallback images used when a listing has no uploaded image
const FALLBACKS = [
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=90',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=700&q=85',
  'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=700&q=85',
];

const TIER_ORDER = { top: 1, featured: 2, standard: 3 };

function formatPrice(price) {
  if (!price) return 'Price on Request';
  return '$' + Number(price).toLocaleString('en-US');
}

function getBadge(listing) {
  if (listing.status === 'sold')           return { label: 'Sold',           color: GR };
  if (listing.status === 'under_contract') return { label: 'Under Contract', color: GR };
  if (listing.upgrade_type === 'top')      return { label: 'Top Listing',    color: S  };
  if (listing.upgrade_type === 'featured') return { label: 'Featured',       color: S  };
  return { label: 'New Listing', color: S };
}

export default function FeaturedListings() {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    supabase
      .from('listings')
      .select('id, title, price, city, state, bedrooms, bathrooms, sqft, images, status, upgrade_type')
      .in('status', ['active', 'sold', 'under_contract'])
      .limit(10)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const sorted = [...data].sort(
          (a, b) => (TIER_ORDER[a.upgrade_type] || 3) - (TIER_ORDER[b.upgrade_type] || 3)
        );
        setListings(sorted.slice(0, 3));
      });
  }, []);

  // Build display items: use real listing if available, otherwise keep slot empty
  const primary   = listings[0] || null;
  const secondary = [listings[1] || null, listings[2] || null];

  function getImage(listing, index) {
    if (listing?.images?.length > 0) return listing.images[0];
    return FALLBACKS[index] || FALLBACKS[0];
  }

  function getLocation(listing) {
    if (!listing) return '';
    const parts = [listing.city, listing.state].filter(Boolean);
    return parts.join(', ');
  }

  return (
    <section style={{ background: SURF }} className="py-20 px-6 md:px-14">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <Label t="Curated Properties" />
            <h2 className="font-headline font-black"
              style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: OS, letterSpacing: '-0.025em' }}>
              Featured Listings
            </h2>
          </div>
          <Link to="/browse"
            className="hidden sm:inline-flex items-center gap-1.5 font-headline font-bold no-underline uppercase transition-opacity hover:opacity-70"
            style={{ fontSize: 10.5, letterSpacing: '0.2em', color: P_DK }}>
            Explore All <HiArrowRight size={14} color={P_DK} />
          </Link>
        </div>

        {/* 1 big left + 2 stacked right */}
        <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr] gap-5">

          {/* Primary card */}
          <Link
            to={primary ? `/listing/${primary.id}` : '/browse'}
            className="no-underline group cursor-pointer relative overflow-hidden rounded-sm block"
            style={{ aspectRatio: '3/2', background: '#000' }}
          >
            <img
              src={getImage(primary, 0)}
              alt={primary?.title || 'Featured listing'}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ opacity: 0.88 }}
            />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(26,32,44,.88) 0%, rgba(26,32,44,.15) 50%, transparent 70%)' }} />
            {primary && (() => { const b = getBadge(primary); return (
              <div className="absolute top-4 left-4 px-2.5 py-1 text-white font-headline font-black text-[10px] uppercase tracking-widest rounded-sm"
                style={{ background: b.color }}>{b.label}</div>
            ); })()}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="font-headline font-black text-white text-xl mb-1 leading-snug">
                {primary?.title || 'The Obsidian Penthouse'}
              </p>
              <div className="flex items-center justify-between mb-3">
                <p className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,.6)' }}>
                  <HiMapPin size={12} color="rgba(255,255,255,.6)" />
                  {getLocation(primary) || 'Beverly Hills, CA'}
                </p>
                <p className="font-headline font-black text-lg" style={{ color: P_LT }}>
                  {primary ? formatPrice(primary.price) : '$11,500,000'}
                </p>
              </div>
              {primary && (primary.bedrooms || primary.bathrooms || primary.sqft) && (
                <div className="flex items-center gap-4 pt-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.52)', fontSize: 12 }}>
                  {primary.bedrooms > 0 && (
                    <span className="flex items-center gap-1"><HiHomeModern size={13} color="rgba(255,255,255,.52)" />{primary.bedrooms} Beds</span>
                  )}
                  {primary.bathrooms > 0 && (
                    <span className="flex items-center gap-1"><HiSparkles size={13} color="rgba(255,255,255,.52)" />{primary.bathrooms} Baths</span>
                  )}
                  {primary.sqft > 0 && (
                    <span className="flex items-center gap-1"><HiArrowsPointingOut size={13} color="rgba(255,255,255,.52)" />{Number(primary.sqft).toLocaleString()} ft²</span>
                  )}
                </div>
              )}
              {!primary && (
                <div className="flex items-center gap-4 pt-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.52)', fontSize: 12 }}>
                  <span className="flex items-center gap-1"><HiHomeModern size={13} color="rgba(255,255,255,.52)" />5 Beds</span>
                  <span className="flex items-center gap-1"><HiSparkles size={13} color="rgba(255,255,255,.52)" />6 Baths</span>
                  <span className="flex items-center gap-1"><HiArrowsPointingOut size={13} color="rgba(255,255,255,.52)" />6,200 ft²</span>
                </div>
              )}
            </div>
          </Link>

          {/* Stacked secondary cards */}
          <div className="flex flex-col gap-5">
            {secondary.map((listing, i) => {
              const badge = listing ? getBadge(listing) : { label: i === 0 ? 'New Listing' : 'Sold', color: i === 0 ? S : GR };
              const fallbackData = i === 0
                ? { title: 'Villa Marbella', price: '$5,500,000', city: 'Marbella, Spain' }
                : { title: 'Alpine Quest Estate', price: '$3,200,000', city: 'Aspen, CO' };

              return (
                <Link
                  key={i}
                  to={listing ? `/listing/${listing.id}` : '/browse'}
                  className="no-underline group cursor-pointer relative overflow-hidden rounded-sm flex-1 block"
                  style={{ background: '#000', minHeight: 180 }}
                >
                  <img
                    src={getImage(listing, i + 1)}
                    alt={listing?.title || fallbackData.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 absolute inset-0"
                    style={{ opacity: 0.84 }}
                  />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(26,32,44,.85) 0%, transparent 60%)' }} />
                  <div
                    className="absolute top-3 left-3 px-2 py-0.5 font-headline font-black text-white text-[9px] uppercase tracking-widest rounded-sm"
                    style={{ background: badge.color }}
                  >{badge.label}</div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-headline font-bold text-sm text-white leading-snug mb-0.5">
                          {listing?.title || fallbackData.title}
                        </p>
                        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.55)' }}>
                          {getLocation(listing) || fallbackData.city}
                        </p>
                      </div>
                      <p className="font-headline font-black text-base flex-shrink-0 ml-3" style={{ color: P_LT }}>
                        {listing ? formatPrice(listing.price) : fallbackData.price}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
