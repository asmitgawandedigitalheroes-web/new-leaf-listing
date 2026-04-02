import React from 'react';
import { 
  HiShieldCheck, 
  HiClipboardDocumentCheck, 
  HiUsers, 
  HiLockClosed 
} from 'react-icons/hi2';

const P_DK = 'var(--color-gold-dark)';   // Gold Hover/Active
const OS = 'var(--color-on-surface)';   // Midnight Black
const OSV = 'var(--color-on-surface-variant)';   // Warm Gray
const BG = 'var(--color-surface-ivory)';   // Soft Ivory background
const GM = 'var(--color-gold-muted)';   // Muted Gold
const SCL = 'var(--color-surface-container)';   // Border / Divider shade
const S_C = 'var(--color-primary-dark)';   // Emerald background for sections

export default function TrustBadges() {
  return (
    <section className="py-14 px-6 md:px-14" style={{ background: BG, borderTop: `1px solid ${GM}` }}>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12">
          {[
            { icon: HiShieldCheck, title: 'SSL Secured', desc: '256-bit encryption on all data' },
            { icon: HiClipboardDocumentCheck, title: 'Verified Listings', desc: 'Every property manually reviewed' },
            { icon: HiUsers, title: 'NAR Compliant', desc: 'Meets NAR data standards' },
            { icon: HiLockClosed, title: 'Privacy Protected', desc: 'CCPA & GDPR compliant platform' },
          ].map(b => (
            <div
              key={b.title}
              className="flex flex-col items-center text-center gap-3 px-4 py-6 rounded-2xl transition-all duration-300 cursor-default"
              style={{ background: SCL, border: '1px solid transparent' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = S_C;
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 24px -10px rgba(31,77,58,0.3)';
                const title = e.currentTarget.querySelector('.badge-title');
                const desc = e.currentTarget.querySelector('.badge-desc');
                const iconWrap = e.currentTarget.querySelector('.icon-wrap');
                if (title) title.style.color = '#FFFFFF';
                if (desc) desc.style.color = 'rgba(255,255,255,0.7)';
                if (iconWrap) iconWrap.style.background = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = SCL;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                const title = e.currentTarget.querySelector('.badge-title');
                const desc = e.currentTarget.querySelector('.badge-desc');
                const iconWrap = e.currentTarget.querySelector('.icon-wrap');
                if (title) title.style.color = OS;
                if (desc) desc.style.color = OSV;
                if (iconWrap) iconWrap.style.background = GM;
              }}
            >
              <div className="icon-wrap w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300" style={{ background: GM }}>
                <b.icon size={20} color={P_DK} />
              </div>
              <div>
                <p className="badge-title font-headline font-bold text-xs mb-1 transition-colors duration-300" style={{ color: OS }}>{b.title}</p>
                <p className="badge-desc transition-colors duration-300" style={{ fontSize: 11, color: OSV, lineHeight: 1.5 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      
              <div className="w-full h-px mb-12" style={{ background: GM }} />


      <div className="max-w-7xl mx-auto">
        <p className="text-center font-headline font-bold uppercase tracking-[0.2em] mb-8" style={{ fontSize: 10, color: OSV }}>
          As Featured In
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 mb-12">
          {[
            { name: 'Forbes', style: { fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' } },
            { name: 'Bloomberg', style: { fontFamily: 'Arial, sans-serif', fontWeight: 900, fontSize: 17, letterSpacing: '0.04em' } },
            { name: 'WSJ', style: { fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 14, fontStyle: 'italic' }, label: 'The Wall Street Journal' },
            { name: 'CNBC', style: { fontFamily: 'Arial Black, sans-serif', fontWeight: 900, fontSize: 19, letterSpacing: '0.06em' } },
            { name: 'Inman', style: { fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 18 } },
          ].map(pub => (
            <span
              key={pub.name}
              style={{ ...pub.style, color: 'var(--color-on-surface-variant)', transition: 'color .2s', cursor: 'default', userSelect: 'none', opacity: 0.25 }}
              onMouseEnter={e => { e.currentTarget.style.color = P_DK; e.currentTarget.style.opacity = 1; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-on-surface-variant)'; e.currentTarget.style.opacity = 0.25; }}
            >
              {pub.label || pub.name}
            </span>
          ))}
        </div>


      
      </div>
    </section>
  );
}
