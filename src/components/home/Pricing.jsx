import React from 'react';
import { Link } from 'react-router-dom';
import { HiStar, HiCheck, HiArrowRight } from 'react-icons/hi2';
import Label from '../shared/Label';
import { usePricing } from '../../hooks/usePricing';

const GOLD    = '#D4AF37';
const GOLD_DK = '#B8962E';
const DEEP    = '#1F4D3A';
const OS      = '#111111';
const OSV     = '#4B5563';
const SURF    = 'var(--color-surface-ivory)';

// Skeleton card shown while loading
function PricingCardSkeleton() {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24, minHeight: 320 }}>
      <div style={{ height: 10, width: 80, background: '#F3F4F6', borderRadius: 6, marginBottom: 16 }} />
      <div style={{ height: 40, width: 100, background: '#F3F4F6', borderRadius: 6, marginBottom: 12 }} />
      <div style={{ height: 10, width: '100%', background: '#F3F4F6', borderRadius: 6, marginBottom: 8 }} />
      <div style={{ height: 10, width: '70%', background: '#F3F4F6', borderRadius: 6, marginBottom: 24 }} />
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 10, width: '90%', background: '#F3F4F6', borderRadius: 6, marginBottom: 10 }} />
      ))}
    </div>
  );
}

export default function Pricing() {
  const { plans, loading } = usePricing();

  return (
    <section style={{ background: SURF }} className="py-24 px-4 md:px-8 lg:px-14">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <Label t="Limited Time" />
          <h2
            className="font-headline font-black mb-3"
            style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: OS, letterSpacing: '-0.025em' }}
          >
            Introductory Pricing — Limited Early Access
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: OSV, lineHeight: 1.75 }}>
            Secure early pricing before official market launch. All plans include unlimited listings.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {loading
            ? [1,2,3,4].map(i => <PricingCardSkeleton key={i} />)
            : plans.map(plan => <PricingCard key={plan.id} plan={plan} />)
          }
        </div>

        {/* Footer */}
        <div className="text-center mt-10 flex flex-col items-center gap-2">
          <p className="text-xs" style={{ color: OSV }}>
            All pricing shown is introductory and subject to change after initial rollout.{' '}
            <span className="font-semibold" style={{ color: OS }}>Early adopters lock in pricing and positioning.</span>
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium no-underline transition-colors mt-1"
            style={{ color: OSV }}
            onMouseEnter={e => e.currentTarget.style.color = DEEP}
            onMouseLeave={e => e.currentTarget.style.color = OSV}
          >
            View full plan comparison
            <HiArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PricingCard({ plan }) {
  const cardStyle = plan.dark ? {
    background: `linear-gradient(155deg, ${DEEP} 0%, #09281F 50%, #051813 100%)`,
    border: `1px solid rgba(212,175,55,0.3)`,
    boxShadow: '0 8px 32px rgba(9,40,31,0.45)',
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  } : plan.popular ? {
    background: '#fff',
    border: `2px solid ${GOLD}`,
    boxShadow: `0 20px 56px rgba(212,175,55,0.22), 0 6px 20px rgba(0,0,0,0.07)`,
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transform: 'translateY(-10px)',
  } : {
    background: '#fff',
    border: '1px solid #E5E7EB',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const isCustom   = plan.monthlyPrice === 0;
  const checkBg    = plan.dark ? 'rgba(212,175,55,0.18)' : plan.popular ? 'rgba(212,175,55,0.12)' : 'rgba(31,77,58,0.08)';
  const checkColor = plan.dark ? GOLD : plan.popular ? GOLD_DK : DEEP;

  return (
    <div style={cardStyle}>
      {plan.popular && (
        <div
          className="flex items-center justify-center gap-2 py-2.5"
          style={{ background: `linear-gradient(90deg, ${GOLD_DK}, ${GOLD}, #F0D060, ${GOLD})` }}
        >
          <HiStar size={11} color="#fff" />
          <span className="font-headline font-black uppercase text-white" style={{ fontSize: 9, letterSpacing: '0.22em' }}>
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-6 pb-5" style={{
        borderBottom: `1px solid ${plan.dark ? 'rgba(212,175,55,0.15)' : plan.popular ? 'rgba(212,175,55,0.2)' : '#F3F4F6'}`,
      }}>
        <span
          className="inline-block font-bold uppercase mb-4"
          style={{
            fontSize: 9, letterSpacing: '0.18em',
            color:      plan.dark ? GOLD : plan.popular ? GOLD : DEEP,
            background: plan.dark ? 'rgba(212,175,55,0.15)' : plan.popular ? 'rgba(212,175,55,0.12)' : 'rgba(31,77,58,0.08)',
            padding: '3px 10px', borderRadius: 20,
          }}
        >
          {plan.badge}
        </span>

        <div className="font-headline font-black uppercase mb-2"
          style={{ fontSize: 11, letterSpacing: '0.18em', color: plan.dark ? 'rgba(255,255,255,0.45)' : OSV }}>
          {plan.tier}
        </div>

        <div className="flex items-end gap-1 mb-1">
          <span className="font-headline font-black leading-none"
            style={{ fontSize: isCustom ? 32 : 42, color: plan.dark ? '#fff' : OS, letterSpacing: '-0.02em' }}>
            {isCustom ? 'Custom' : `$${plan.monthlyPrice}`}
          </span>
          {!isCustom && (
            <span className="mb-1.5 font-medium" style={{ fontSize: 13, color: plan.dark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>
              / month
            </span>
          )}
        </div>
        <p className="text-[11px] italic" style={{ color: GOLD }}>{plan.priceNote}</p>
      </div>

      {/* Body */}
      <div className="px-6 py-5 flex flex-col flex-1">
        <p className="leading-relaxed mb-5" style={{ fontSize: 12, color: plan.dark ? 'rgba(255,255,255,0.55)' : OSV }}>
          {plan.desc}
        </p>
        <div className="mb-4" style={{ height: 1, background: plan.dark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }} />

        <ul className="flex flex-col gap-3 flex-1 mb-6">
          {plan.features.map(f => (
            <li key={f} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: checkBg }}>
                <HiCheck size={9} color={checkColor} />
              </div>
              <span style={{ fontSize: 12, color: plan.dark ? 'rgba(255,255,255,0.72)' : OSV, lineHeight: 1.5 }}>{f}</span>
            </li>
          ))}
        </ul>

        <Link
          to={plan.ctaHref}
          className="block text-center rounded-xl font-headline font-bold no-underline transition-all"
          style={{
            padding: '12px 16px', fontSize: 12, letterSpacing: '0.05em',
            ...(plan.popular || plan.dark
              ? { background: GOLD, color: OS, boxShadow: '0 4px 18px rgba(212,175,55,0.38)' }
              : { background: 'transparent', color: DEEP, border: `1.5px solid ${DEEP}` }),
          }}
          onMouseEnter={e => {
            if (plan.popular || plan.dark) {
              e.currentTarget.style.background = GOLD_DK;
            } else {
              e.currentTarget.style.background = DEEP;
              e.currentTarget.style.color = '#fff';
            }
          }}
          onMouseLeave={e => {
            if (plan.popular || plan.dark) {
              e.currentTarget.style.background = GOLD;
              e.currentTarget.style.color = OS;
            } else {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = DEEP;
            }
          }}
        >
          {plan.cta}
        </Link>
      </div>
    </div>
  );
}
