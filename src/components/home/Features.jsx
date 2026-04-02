import React from 'react';
import {
  HiShieldCheck,
  HiClipboardDocumentCheck,
  HiUsers,
  HiLockClosed,
  HiSparkles,
  HiArrowTrendingUp,
  HiBanknotes,
  HiMap,
  HiArrowRight
} from 'react-icons/hi2';
import Label from '../shared/Label';

const P = 'var(--color-gold)';   // Luxury Gold
const P_DK = 'var(--color-gold-dark)';   // Gold Hover/Active
const S = 'var(--color-gold)';   // Accent Gold
const S_HV = 'var(--color-gold-dark)';   // Gold Hover
const S_DK = 'var(--color-primary-dark)';   // Deep Emerald Green
const S_C = 'var(--color-primary-dark)';   // Emerald background for sections
const OS = 'var(--color-on-surface)';   // Midnight Black
const OSV = 'var(--color-on-surface-variant)';   // Warm Gray
const BG = 'var(--color-surface-ivory)';   // Soft Ivory background
const SCL = 'var(--color-surface-container)';   // Border / Divider shade
const SURF = 'var(--color-surface-ivory)';   // Surface Ivory
const GM = 'var(--color-gold-muted)';   // Muted Gold

export default function Features() {
  return (
    <section style={{ background: BG }} className="py-20 px-8 md:px-14">
      <div className="max-w-7xl mx-auto">

       <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
          <div>
            <Label t="Platform Features" />
            <h2 className="font-headline font-black leading-tight"
              style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: OS, letterSpacing: '-0.025em' }}>
              Everything you need<br />to dominate your market
            </h2>
          </div>
          <p className="hidden md:block text-sm max-w-[220px] text-right leading-relaxed" style={{ color: OSV }}>
            Purpose-built tools for high-performance real estate professionals.
          </p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Smart Lead Routing */}
          <div className="group relative overflow-hidden rounded-sm p-8 cursor-default"
            style={{ background: BG, boxShadow: `0 2px 20px rgba(26,32,44,.07), 0 0 0 1px ${GM}`, transition: 'box-shadow .25s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 8px 40px rgba(26,32,44,.10), 0 0 0 1.5px var(--color-gold)`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = `0 2px 20px rgba(26,32,44,.07), 0 0 0 1px ${GM}`}>
            <div className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none"
              style={{ fontSize: 130, color: SURF, fontFamily: 'Space Grotesk', fontWeight: 900, lineHeight: 1, paddingRight: 8 }}>
              ✦
            </div>
            <div className="relative z-10">
              <div className="w-11 h-11 flex items-center justify-center rounded-full mb-6"
                style={{ background: GM, border: `1px solid var(--color-gold-dark)` }}>
                <HiSparkles size={22} color={S_C} />
              </div>
              <h3 className="font-headline font-black text-xl mb-3" style={{ color: OS }}>Smart Lead Routing</h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: OSV }}>
                Our neural algorithm recommends the right specialist to each buyer — delivering qualified leads to the highest-performing realtors in your territory.
              </p>
              <div className="flex items-center gap-2 transition-colors" style={{ color: S_DK }}
                onMouseEnter={e => e.currentTarget.style.color = S}
                onMouseLeave={e => e.currentTarget.style.color = S_DK}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Learn more</span>
                <HiArrowRight size={13} color="inherit" />
              </div>
            </div>
          </div>

          {/* Subscription Growth */}
          <div className="group relative overflow-hidden rounded-sm p-8 cursor-default"
            style={{ background: BG, boxShadow: `0 2px 20px rgba(26,32,44,.07), 0 0 0 1px ${GM}`, transition: 'box-shadow .25s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 8px 40px rgba(26,32,44,.10), 0 0 0 1.5px var(--color-gold)`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = `0 2px 20px rgba(26,32,44,.07), 0 0 0 1px ${GM}`}>
            <div className="absolute right-2 bottom-0 pointer-events-none"
              style={{ fontSize: 120, color: S, fontFamily: 'Space Grotesk', fontWeight: 900, lineHeight: 1, opacity: 0.1 }}>↗</div>
            <div className="relative z-10">
              <div className="w-11 h-11 flex items-center justify-center rounded-full mb-6"
                style={{ background: GM }}>
                <HiArrowTrendingUp size={22} color={S_C} />
              </div>
              <h3 className="font-headline font-black text-xl mb-3" style={{ color: OS }}>Subscription Growth</h3>
              <p className="text-sm leading-relaxed" style={{ color: OSV }}>
                Scale across Premium Tiers through proprietary channels. Grow your client pipeline automatically with smart forecasting and territory analytics.
              </p>
            </div>
          </div>

          {/* Commission Tracking */}
          <div className="relative overflow-hidden rounded-sm p-7"
            style={{ background: SCL, boxShadow: `0 1px 12px rgba(26,32,44,.04)` }}>
            <div className="absolute right-4 bottom-1 pointer-events-none font-headline font-black"
              style={{ fontSize: 80, color: OS, lineHeight: 1, opacity: 0.045, letterSpacing: '-0.04em' }}>$</div>
            <div className="w-10 h-10 flex items-center justify-center rounded-full mb-4 relative z-10"
              style={{ background: S_C }}>
              <HiBanknotes size={20} color={S} />
            </div>
            <h3 className="font-headline font-bold text-base mb-2 relative z-10" style={{ color: OS }}>Commission Tracking</h3>
            <p className="text-sm leading-relaxed relative z-10" style={{ color: OSV }}>
              Real-time ledger with immutable deal history. Clear milestones and transparent commissions at every stage of the transaction.
            </p>
          </div>

          {/* Territory Control */}
          <div className="relative overflow-hidden rounded-sm p-7"
            style={{ background: SCL, boxShadow: `0 1px 12px rgba(26,32,44,.04)` }}>
            <div className="absolute right-3 bottom-0 pointer-events-none font-headline font-black"
              style={{ fontSize: 80, color: OS, lineHeight: 1, opacity: 0.045 }}>T</div>
            <div className="w-10 h-10 flex items-center justify-center rounded-full mb-4 relative z-10"
              style={{ background: S_C }}>
              <HiMap size={20} color={S} />
            </div>
            <h3 className="font-headline font-bold text-base mb-2 relative z-10" style={{ color: OS }}>Territory Control</h3>
            <p className="text-sm leading-relaxed relative z-10" style={{ color: OSV }}>
              Claim exclusive digital territories mapped to luxury markets and zip codes globally. Own your market.
            </p>
          </div>
        </div>


     

      </div>
    </section>
  );
}
