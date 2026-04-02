import React from 'react';
import { Link } from 'react-router-dom';
import { HiStar, HiCheck, HiArrowRight } from 'react-icons/hi2';
import Label from '../shared/Label';

const S = 'var(--color-gold)';   // Accent Gold
const S_HV = 'var(--color-gold-dark)';   // Gold Hover
const S_DK = 'var(--color-primary-dark)';   // Deep Emerald Green
const P_LT = 'var(--color-gold-light)';   // Light Gold tint
const OS = 'var(--color-on-surface)';   // Midnight Black
const OSV = 'var(--color-on-surface-variant)';   // Warm Gray
const SURF = 'var(--color-surface-ivory)';
const GM = 'var(--color-gold-muted)';   // Muted Gold

export default function Pricing() {
  const plans = [
    { tier: 'Standard',          price: '$499',   period: '/mo', desc: 'Perfect entry point for individual realtors.',         features: ['10 Listings', 'Basic CRM', 'Email Support', 'Basic Analytics'],                                          hi: false, ent: false, cta: 'Select Plan'   },
    { tier: 'Professional',       price: '$1,299', period: '/mo', desc: 'Scale your pipeline with advanced tools and reach.',  features: ['50 Listings', 'Advanced CRM', 'Priority Support', 'Deal Pipeline'],                                       hi: false, ent: false, cta: 'Select Plan'   },
    { tier: 'The Elite Standard', price: '$2,499', period: '/mo', desc: 'Unlimited power for top-performing brokers.',         features: ['Unlimited Listings', 'AI Lead Scoring', 'Dedicated Concierge', 'First-Look Access', 'Territories'],    hi: true,  ent: false, cta: 'Subscribe Now' },
    { tier: 'Enterprise',         price: 'Custom', period: '',    desc: 'Tailored solutions for large brokerages and teams.',  features: ['Custom Terms', 'White-label', 'SLA Guarantee', 'Onboarding Team'],                                         hi: false, ent: true,  cta: 'Inquire'       },
  ];

  return (
    <section style={{ background: SURF }} className="py-24 px-4 md:px-8 lg:px-14">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Label t="Pricing" />
          <h2 className="font-headline font-black mb-3"
            style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: OS, letterSpacing: '-0.025em' }}>
            Subscription Models
          </h2>
          <p className="text-sm max-w-md mx-auto" style={{ color: OSV, lineHeight: 1.75 }}>
            Select the tier that matches your market dominance and growth goals.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
          {plans.map(plan => {
            const baseStyle = {
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'transform 0.22s ease, box-shadow 0.22s ease',
              ...(plan.hi ? {
                background: '#fff',
                border: `2px solid ${S}`,
                boxShadow: `0 20px 56px rgba(212,175,55,0.22), 0 6px 20px rgba(0,0,0,0.07)`,
                zIndex: 2,
                transform: 'translateY(-12px)', // Standard focus for all screens
              } : plan.ent ? {
                background: `linear-gradient(155deg, var(--color-primary-dark) 0%, #09281F 50%, #051813 100%)`,
                border: `1px solid ${GM}`,
                boxShadow: '0 8px 32px rgba(9,40,31,0.45)',
              } : {
                background: '#fff',
                border: '1px solid var(--color-surface-container)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              }),
            };

            return (
              <div
                key={plan.tier}
                style={baseStyle}
                onMouseEnter={e => {
                  if (!plan.hi) {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = plan.ent
                      ? '0 16px 48px rgba(15,35,24,0.55)'
                      : '0 10px 32px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseLeave={e => {
                  if (!plan.hi) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = plan.ent
                      ? '0 8px 32px rgba(15,35,24,0.45)'
                      : '0 2px 12px rgba(0,0,0,0.05)';
                  }
                }}
              >
                {/* Most Popular banner */}
                {plan.hi && (
                  <div
                    className="flex items-center justify-center gap-2 py-3"
                    style={{ background: `linear-gradient(90deg, ${S_HV}, ${S}, ${P_LT}, ${S})`, backgroundSize: '200% 100%' }}
                  >
                    <HiStar size={12} color="#fff" />
                    <span className="font-headline font-black uppercase text-white" style={{ fontSize: 10, letterSpacing: '0.22em' }}>
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Card header */}
                <div
                  className="px-7 pt-7 pb-6 relative"
                  style={{
                    background: plan.ent
                      ? 'rgba(255,255,255,0.04)'
                      : plan.hi
                      ? 'var(--color-surface-ivory)'
                      : 'var(--color-surface)',
                    borderBottom: `1px solid ${plan.ent ? 'var(--color-gold-muted)' : plan.hi ? 'var(--color-gold-muted)' : 'var(--color-surface-container)'}`,
                  }}
                >
                  {!plan.hi && (
                    <div
                      className="absolute top-0 left-0 right-0 h-[3px]"
                      style={{
                        background: plan.ent
                          ? `linear-gradient(90deg, ${S}, ${P_LT})`
                          : '#E5E7EB',
                        borderRadius: '20px 20px 0 0',
                      }}
                    />
                  )}

                  <div className="flex items-center justify-between mb-5">
                    <span
                      className="inline-block font-headline font-bold uppercase"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.2em',
                        color: plan.ent ? S : S_DK,
                        background: plan.ent ? GM : plan.hi ? GM : 'rgba(31,77,58,0.07)',
                        padding: '4px 10px',
                        borderRadius: 20,
                      }}
                    >
                      {plan.tier}
                    </span>
                  </div>

                  <div className="flex items-end gap-1.5 mb-1">
                    <span
                      className="font-headline font-black leading-none"
                      style={{
                        fontSize: plan.price === 'Custom' ? 38 : 44,
                        color: plan.ent ? '#fff' : OS,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span
                        className="font-medium mb-1.5"
                        style={{ fontSize: 14, color: plan.ent ? 'rgba(255,255,255,0.45)' : 'var(--color-on-surface-muted)' }}
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: plan.ent ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>
                    {plan.price === 'Custom' ? 'Contact us for pricing' : 'Billed monthly'}
                  </p>
                </div>

                {/* Card body */}
                <div className="px-7 py-6 flex flex-col flex-1">
                  <p
                    className="leading-relaxed mb-6"
                    style={{ fontSize: 13, color: plan.ent ? 'rgba(255,255,255,0.55)' : OSV }}
                  >
                    {plan.desc}
                  </p>

                  <div
                    className="mb-5"
                    style={{ height: 1, background: plan.ent ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }}
                  />

                  <ul className="flex flex-col gap-3.5 flex-1 mb-7">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: plan.ent
                              ? GM
                              : plan.hi
                              ? GM
                              : 'rgba(31,77,58,0.08)',
                          }}
                        >
                          <HiCheck size={11} color={plan.ent ? S : plan.hi ? S : S_DK} />
                        </div>
                        <span style={{ fontSize: 13, color: plan.ent ? 'rgba(255,255,255,0.72)' : OSV }}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/pricing"
                    className="block text-center rounded-xl font-headline font-bold no-underline transition-all mt-auto"
                    style={{
                      padding: '13px 20px',
                      fontSize: 13,
                      letterSpacing: '0.04em',
                      ...(plan.hi ? {
                        background: 'var(--color-gold)',
                        color: OS,
                        boxShadow: '0 4px 18px rgba(212,175,55,0.4)',
                      } : plan.ent ? {
                        background: 'var(--color-gold)',
                        color: OS,
                        boxShadow: '0 4px 16px rgba(212,175,55,0.3)',
                      } : {
                        background: 'transparent',
                        color: 'var(--color-gold)',
                        border: '1.5px solid var(--color-gold)',
                      }),
                    }}
                    onMouseEnter={e => {
                      if (plan.hi) {
                        e.currentTarget.style.background = 'var(--color-gold-light)';
                        e.currentTarget.style.boxShadow = '0 6px 24px rgba(212,175,55,0.52)';
                      } else if (plan.ent) {
                        e.currentTarget.style.background = 'var(--color-gold-light)';
                      } else {
                        e.currentTarget.style.background = 'var(--color-primary-dark)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (plan.hi) {
                        e.currentTarget.style.background = 'var(--color-gold)';
                        e.currentTarget.style.boxShadow = '0 4px 18px rgba(212,175,55,0.4)';
                      } else if (plan.ent) {
                        e.currentTarget.style.background = 'var(--color-gold)';
                      } else {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium no-underline transition-colors"
            style={{ color: OSV }}
            onMouseEnter={e => e.currentTarget.style.color = S_DK}
            onMouseLeave={e => e.currentTarget.style.color = OSV}
          >
            View full plan comparison
            <HiArrowRight size={16} color="inherit" />
          </Link>
        </div>
      </div>
    </section>
  );
}
