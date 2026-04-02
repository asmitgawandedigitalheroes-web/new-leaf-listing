import React from 'react';
import { Link } from 'react-router-dom';
import { HiMapPin, HiEnvelope, HiPhone, HiAtSymbol, HiBriefcase, HiCamera } from 'react-icons/hi2';
import NLVLogo from '../ui/NLVLogo';

const G  = 'var(--color-gold)';
const DG = 'var(--color-primary-dark)';

const COLS = [
  {
    heading: 'Platform',
    links: [
      { label: 'Browse Listings', to: '/browse' },
      { label: 'Pricing & Plans', to: '/pricing' },
      { label: 'Apply for Membership', to: '/signup' },
      { label: 'Sign In', to: '/login' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About NLV', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Privacy Policy', to: '#' },
      { label: 'Terms of Service', to: '#' },
    ],
  },
  {
    heading: 'Contact',
    items: [
      { icon: HiMapPin, text: '3250 S Durango Dr, Suite 200\nLas Vegas, NV 89117' },
      { icon: HiEnvelope,        text: 'hello@nlvlistings.com' },
      { icon: HiPhone,       text: '+1 (702) 555-0192' },
    ],
  },
];

const SOCIALS = [
  { icon: HiAtSymbol, label: 'Twitter' },
  { icon: HiCamera,    label: 'Instagram' },
  { icon: HiBriefcase,            label: 'LinkedIn' },
];

export default function Footer() {
  return (
    <footer style={{ background: DG, color: '#fff' }}>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <NLVLogo mode="dark" size="md" />
            <p className="text-xs leading-relaxed mt-4 mb-6" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 220 }}>
              The premier digital marketplace for elite real estate professionals. Curated listings, intelligent routing, absolute discretion.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-2">
              {SOCIALS.map(s => {
                const IconComp = s.icon;
                return (
                  <button
                    key={s.label}
                    title={s.label}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                  >
                    <IconComp size={16} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nav columns */}
          {COLS.map(col => (
            <div key={col.heading}>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5" style={{ color: G }}>
                {col.heading}
              </h4>

              {col.links && (
                <ul className="flex flex-col gap-3">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="text-sm no-underline transition-colors"
                        style={{ color: 'rgba(255,255,255,0.55)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {col.items && (
                <ul className="flex flex-col gap-4">
                  {col.items.map(item => {
                    const IconComp = item.icon;
                    return (
                      <li key={item.text} className="flex items-start gap-3">
                        <span className="mt-0.5 flex-shrink-0" style={{ color: G }}>
                          <IconComp size={15} />
                        </span>
                        <span className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {item.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © {new Date().getFullYear()} NLV Listings, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Crafted with</span>
            <span style={{ color: G, fontSize: 12 }}>♦</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>for elite brokerages</span>
          </div>
        </div>
      </div>

    </footer>
  );
}
