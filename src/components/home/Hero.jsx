import React from 'react';
import { Link } from 'react-router-dom';
import { HiArrowRight } from 'react-icons/hi2';
import Button from '../ui/Button';

const S = 'var(--color-gold)';
const IVORY = 'var(--color-ivory)';
const JET_BLACK = 'var(--color-jet-black)';

function Icon({ n, sz = 18, c = 'currentColor' }) {
  if (n === 'arrow_forward') return <HiArrowRight size={sz} color={c} style={{ display: 'inline-block', verticalAlign: 'middle' }} />;
  return (
    <span className="material-symbols-outlined" style={{
      fontSize: sz, color: c, lineHeight: 1, display: 'inline-block', verticalAlign: 'middle',
      fontVariationSettings: `'FILL' 0,'wght' 400,'GRAD' 0,'opsz' ${sz}`,
    }}>{n}</span>
  );
}

const fadeUp = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;


export default function Hero() {
  return (
    <section id="hero-section" className="relative overflow-hidden flex flex-col lg:block bg-primary-dark lg:bg-jet-black" style={{ minHeight: '100vh' }}>
      <style>{`
        ${fadeUp}
        #hero-section { background: var(--color-primary-dark); }
        @media (min-width: 1024px) {
          #hero-section { background: var(--color-jet-black); }
        }
      `}</style>
      
      {/* Right/Top: house image */}
      <div className="relative lg:absolute lg:right-0 lg:top-0 lg:bottom-0 h-[45vh] lg:h-full lg:w-3/5" style={{ zIndex: 0 }}>
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=92"
          alt="Luxury property"
          className="w-full h-full object-cover object-center"
          style={{ filter: 'brightness(0.8) contrast(1.1) saturate(0.9)' }}
        />
        <div className="absolute inset-0 hidden lg:block" style={{
          background: `linear-gradient(100deg, var(--color-jet-black) 0%, var(--color-jet-black) 6%, rgba(10,10,10,.94) 20%, rgba(10,10,10,.5) 38%, transparent 58%)`,
        }} />
        {/* Mobile overlay */}
        <div className="absolute inset-0 lg:hidden" style={{ background: `linear-gradient(to bottom, transparent 60%, var(--color-primary-dark))` }} />
        <div className="absolute inset-x-0 bottom-0 h-32 hidden lg:block" style={{ background: `linear-gradient(to top, var(--color-jet-black), transparent)` }} />
      </div>

      {/* Left/Bottom: copy */}
      <div className="relative z-10 flex flex-col justify-center px-6 md:px-12 lg:pl-[max(20px,6vw)] lg:pr-8 lg:min-h-screen lg:max-w-[58%] pt-10 lg:pt-24 pb-16 lg:pb-20"
        style={{ animation: 'fadeUp 0.8s ease-out forwards' }}>

        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 self-start mb-6 px-3.5 py-1.5 rounded-full"
          style={{ background: 'rgba(201, 164, 92, 0.12)', border: `1px solid var(--color-gold)` }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-gold)' }} />
          <span className="font-headline font-bold uppercase text-[10px] tracking-[0.2em]" style={{ color: 'var(--color-gold)' }}>
            The Digital Real Estate Curator
          </span>
        </div>

        <h1 className="font-headline font-black leading-[1.08] mb-5"
          style={{ fontSize: 'clamp(2.4rem, 8vw, 4.5rem)', color: 'var(--color-ivory)', letterSpacing: '-0.03em' }}>
          The Future of<br className="hidden sm:block" />
          <em className="italic inline-block pb-1" style={{
            background: `linear-gradient(135deg, var(--color-gold-tint) 0%, var(--color-gold) 50%, var(--color-gold-hover) 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Real Estate</em>
          Market.
        </h1>

        <p className="text-sm md:text-base mb-10 max-w-md lg:max-w-[360px]" style={{ color: 'rgba(247, 246, 242, 0.7)', lineHeight: 1.82 }}>
          A curated digital ecosystem bridging architectural excellence and visionary investment — built exclusively for elite brokerages.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-14">
          <Button as={Link} to="/browse" variant="primary" premium size="lg" className="w-full sm:w-auto">
            Browse Listings
          </Button>
          <Button as={Link} to="/signup" variant="secondary" size="lg" className="w-full sm:w-auto">Join as Realtor</Button>
        </div>

        {/* Metrics row */}
        <div className="hidden sm:flex sm:flex-row items-center gap-0 pt-7" style={{ borderTop: `1px solid rgba(201, 164, 92, 0.2)` }}>
          {[
            { val: '2,400+', label: 'Listings' },
            { val: '340+', label: 'Realtors' },
            { val: '$1.2B', label: 'Transacted' },
          ].map((m, i) => (
            <div key={m.label} className="flex items-center w-full sm:w-auto">
              <div className={`flex-1 sm:flex-none ${i > 0 ? 'sm:pl-7' : 'sm:pr-7'}`} style={i === 1 ? { paddingLeft: 28, paddingRight: 28 } : {}}>
                <p className="font-headline font-black text-xl leading-none mb-0.5" style={{ color: 'var(--color-gold)' }}>{m.val}</p>
                <p style={{ fontSize: 10, color: 'rgba(247, 246, 242, 0.5)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{m.label}</p>
              </div>
              {i < 2 && <div className="hidden sm:block h-7 w-px" style={{ background: `rgba(201, 164, 92, 0.2)` }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Floating card */}
      <div className="absolute bottom-14 right-10 hidden xl:block z-10"
        style={{
          background: 'rgba(10,10,10,.7)', backdropFilter: 'blur(24px)',
          borderRadius: 4, padding: '18px 24px', minWidth: 240,
          border: '1px solid rgba(201, 164, 92, 0.2)',
          boxShadow: `0 12px 48px rgba(0,0,0,.4)`,
        }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-gold)' }} />
          <p style={{ fontSize: 9, color: 'rgba(247, 246, 242, 0.6)', letterSpacing: '0.22em', fontWeight: 700, textTransform: 'uppercase' }}>New · Beverly Hills</p>
        </div>
        <p className="font-headline font-bold text-sm leading-snug mb-1.5" style={{ color: 'var(--color-ivory)' }}>The Obsidian Penthouse</p>
        <p className="font-headline font-black text-2xl leading-none" style={{ color: 'var(--color-gold)' }}> $12,400,000</p>
      </div>
    </section>
  );
}
