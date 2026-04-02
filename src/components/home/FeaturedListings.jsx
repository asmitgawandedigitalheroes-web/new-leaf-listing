import React from 'react';
import { Link } from 'react-router-dom';
import { HiMapPin, HiHomeModern, HiSparkles, HiArrowsPointingOut, HiArrowRight } from 'react-icons/hi2';
import Label from '../shared/Label';

const S = 'var(--color-gold)';   // Accent Gold
const P_DK = 'var(--color-primary-dark)';   // Gold Hover/Active
const P_LT = 'var(--color-gold-light)';   // Light Gold tint
const OS = 'var(--color-on-surface)';   // Midnight Black
const SURF = 'var(--color-surface)';   // Surface Ivory
const GR = 'var(--color-dark-700)';   // Gray for badges

export default function FeaturedListings() {
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
          <div className="group cursor-pointer relative overflow-hidden rounded-sm"
            style={{ aspectRatio: '3/2', background: '#000' }}>
            <img
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=90"
              alt="The Obsidian Penthouse"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ opacity: 0.88 }}
            />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(26,32,44,.88) 0%, rgba(26,32,44,.15) 50%, transparent 70%)' }} />
            {/* Badge */}
            <div className="absolute top-4 left-4 px-2.5 py-1 text-white font-headline font-black text-[10px] uppercase tracking-widest rounded-sm"
              style={{ background: S }}>New Listing</div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="font-headline font-black text-white text-xl mb-1 leading-snug">The Obsidian Penthouse</p>
              <div className="flex items-center justify-between mb-3">
                <p className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,.6)' }}>
                  <HiMapPin size={12} color="rgba(255,255,255,.6)" /> Beverly Hills, CA
                </p>
                <p className="font-headline font-black text-lg" style={{ color: P_LT }}>$11,500,000</p>
              </div>
              <div className="flex items-center gap-4 pt-3"
                style={{ borderTop: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.52)', fontSize: 12 }}>
                <span className="flex items-center gap-1"><HiHomeModern size={13} color="rgba(255,255,255,.52)" />5 Beds</span>
                <span className="flex items-center gap-1"><HiSparkles size={13} color="rgba(255,255,255,.52)" />6 Baths</span>
                <span className="flex items-center gap-1"><HiArrowsPointingOut size={13} color="rgba(255,255,255,.52)" />6,200 ft²</span>
              </div>
            </div>
          </div>

          {/* Stacked secondary cards */}
          <div className="flex flex-col gap-5">
            {[
              { title: 'Villa Marbella', price: '$5,500,000', city: 'Marbella, Spain', badge: 'New Listing', badgeC: S, img: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=700&q=85', beds: 6, baths: 5, sqft: '7,800' },
              { title: 'Alpine Quest Estate', price: '$3,200,000', city: 'Aspen, CO', badge: 'Sold', badgeC: GR, img: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=700&q=85', beds: 4, baths: 4, sqft: '4,100' },
            ].map(p => (
              <div key={p.title} className="group cursor-pointer relative overflow-hidden rounded-sm flex-1"
                style={{ background: '#000', minHeight: 180 }}>
                <img src={p.img} alt={p.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 absolute inset-0"
                  style={{ opacity: 0.84 }} />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(26,32,44,.85) 0%, transparent 60%)' }} />
                <div className="absolute top-3 left-3 px-2 py-0.5 font-headline font-black text-white text-[9px] uppercase tracking-widest rounded-sm"
                  style={{ background: p.badgeC }}>{p.badge}</div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-headline font-bold text-sm text-white leading-snug mb-0.5">{p.title}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.55)' }}>{p.city}</p>
                    </div>
                    <p className="font-headline font-black text-base flex-shrink-0 ml-3" style={{ color: P_LT }}>{p.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
