import React from 'react';
import { HiHomeModern, HiUsers, HiBanknotes, HiGlobeAlt } from 'react-icons/hi2';

const S = 'var(--color-gold)';   // Accent Gold
const S_DK = 'var(--color-primary-dark)';   // Deep Emerald Green
const OS = 'var(--color-on-surface)';   // Midnight Black
const GOLD_GRADIENT = `linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))`;

export default function Stats() {
  return (
    <>
      {/* ── Marquee ── */}
      <div style={{ background: S_DK, overflow: 'hidden', whiteSpace: 'nowrap', padding: '16px 0', borderTop: `1px solid rgba(212,175,55,0.2)` }}>
        <div style={{ display: 'inline-block', animation: 'marquee 40s linear infinite' }}>
          {Array(4).fill(null).map((_, i) => (
            <span key={i} className="font-headline font-bold uppercase"
              style={{ fontSize: 10, letterSpacing: '0.3em', marginRight: 64, color: `rgba(212,175,55,.85)` }}>
              Premium Listings &nbsp;·&nbsp; Elite Realtors &nbsp;·&nbsp; Verified Properties &nbsp;·&nbsp; The Digital Curator &nbsp;·&nbsp; Luxury Real Estate &nbsp;·&nbsp;
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ background: S_DK }}>
        <div className="max-w-7xl mx-auto px-6 md:px-14 py-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-10">
          {[
            { icon: HiHomeModern, val: '2,400+', label: 'Active Listings',    sub: 'Across 14 countries' },
            { icon: HiUsers,   val: '340+',   label: 'Elite Realtors',      sub: 'Verified & credentialed' },
            { icon: HiBanknotes, val: '$1.2B',  label: 'Transactions Closed', sub: 'Past 12 months' },
            { icon: HiGlobeAlt,   val: '14',     label: 'Global Markets',      sub: 'And growing' },
          ].map((st, i) => (
            <div key={st.label} className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-4">
              {i > 0 && <div className="hidden md:block w-px self-stretch mr-6" style={{ background: 'rgba(212,175,55,.15)' }} />}
              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                  <st.icon size={15} color={S} />
                  <span style={{ fontSize: 9, color: '#fff', letterSpacing: '0.24em', fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>{st.label}</span>
                </div>
                <p className="font-headline font-black leading-none mb-1 text-white" style={{ fontSize: 38 }}>{st.val}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>{st.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
