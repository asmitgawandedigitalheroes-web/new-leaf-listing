import React from 'react';
import Label from '../shared/Label';

const OS   = '#111111';
const OSV  = '#4B5563';
const GOLD = '#D4AF37';
const DEEP = '#1F4D3A';

const PARTNERS = [
  {
    id:   'nuevo-vizion',
    name: 'Nuevo Vizion Ingenieria Y Arquitectura',
    sub:  'Engineering & Architecture',
    logo: '/partners/nuevo-vizion.svg',
    desc: 'A Mexico-based design and engineering firm representing New Leaf Vision, delivering modern architectural and technical expertise.',
    href: 'https://www.nuevovizion.com',
    accent: '#6BBF3E',
  },
  {
    id:   'new-leaf',
    name: 'New Leaf Vision Inc',
    sub:  'Panelized Construction & Franchise Network',
    logo: '/partners/new-leaf.svg',
    desc: 'An integrated panelized construction platform combined with a franchise network, enabling efficient, scalable, high-performance development.',
    href: 'https://www.newleafvision.com',
    accent: '#6BBF3E',
  },
  {
    id:   'bold-group-dev',
    name: 'Bold Group Development',
    sub:  'Real Estate Development',
    logo: '/partners/bold-group-dev.svg',
    desc: 'A real estate development company focused on delivering high-value projects and investment opportunities.',
    href: 'https://www.boldgroup.dev',
    accent: GOLD,
  },
];

export default function Partners() {
  return (
    <section className="py-24 px-4 md:px-8 lg:px-14" style={{ background: '#fff' }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <Label t="Ecosystem" />
          <h2
            className="font-headline font-black mb-3"
            style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: OS, letterSpacing: '-0.025em' }}
          >
            Our Partner Network
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: OSV, lineHeight: 1.75 }}>
            NLV Listings is part of a broader ecosystem of trusted partners delivering value across real estate, development, and infrastructure.
          </p>
        </div>

        {/* Partner cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PARTNERS.map(p => (
            <a
              key={p.id}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-2xl overflow-hidden no-underline transition-all duration-300"
              style={{
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.10)`;
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = p.accent;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = '#E5E7EB';
              }}
            >
              {/* Logo area */}
              <div
                className="flex items-center justify-center p-8"
                style={{ background: '#FAFAFA', borderBottom: '1px solid #F3F4F6', minHeight: 140 }}
              >
                <img
                  src={p.logo}
                  alt={p.name}
                  className="max-h-20 w-auto object-contain transition-all duration-300"
                  style={{ maxWidth: 200 }}
                  onError={e => {
                    // Fallback to text if SVG fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextSibling.style.display = 'block';
                  }}
                />
                {/* Text fallback */}
                <span
                  className="font-headline font-black text-xl hidden"
                  style={{ color: p.accent }}
                >
                  {p.name}
                </span>
              </div>

              {/* Card body */}
              <div className="p-6 flex flex-col flex-1">
                <div className="mb-1">
                  <div className="font-headline font-black text-base" style={{ color: OS }}>{p.name}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: p.accent }}>{p.sub}</div>
                </div>
                <p className="text-xs leading-relaxed mt-3 flex-1" style={{ color: OSV }}>{p.desc}</p>

                <div
                  className="flex items-center gap-1.5 mt-5 text-[11px] font-bold uppercase tracking-wider transition-colors"
                  style={{ color: p.accent }}
                >
                  Learn More
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Divider note */}
        <div className="text-center mt-12">
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            Interested in becoming a platform partner?{' '}
            <a href="/contact" className="font-semibold no-underline transition-colors" style={{ color: DEEP }}
              onMouseEnter={e => e.currentTarget.style.color = GOLD}
              onMouseLeave={e => e.currentTarget.style.color = DEEP}
            >
              Contact us →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
