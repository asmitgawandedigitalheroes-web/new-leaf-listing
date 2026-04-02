import React, { useState } from 'react';
import { HiUserPlus, HiHomeModern, HiWallet } from 'react-icons/hi2';
import Label from '../shared/Label';

const S = 'var(--color-gold)';   // Accent Gold
const P = 'var(--color-gold-dark)';   // Luxury Gold
const OS = 'var(--color-on-surface)';   // Midnight Black
const OSV = '#6F6F6F';   // Warm Gray
const BG = '#F7F6F2';   // Soft Ivory
const SURF = '#F7F6F2';

export default function Process() {
  const [hovered, setHovered] = useState(null);

  const steps = [
    { num: '01', icon: HiUserPlus, label: 'Join Platform', desc: 'Complete onboarding and join our elite professional ecosystem with verified credentials.', hi: false },
    { num: '02', icon: HiHomeModern, label: 'List Properties', desc: 'Publish your high-value inventory through our premium curated networks with quality standards.', hi: false },
    { num: '03', icon: HiWallet, label: 'Receive & Earn', desc: 'Automated commission settlement with instant payouts upon deal closure confirmation.', hi: false },
  ];

  return (
    <section style={{ background: BG }} className="py-20 px-8 md:px-14">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Label t="How It Works" />
          <h2 className="font-headline font-black"
            style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: OS, letterSpacing: '-0.025em' }}>
            Our Orchestration Process
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 relative gap-8 md:gap-0">
          {/* Dashed connector line */}
          <div className="absolute hidden md:block"
            style={{ top: 28, left: '19%', right: '19%', height: 1, borderTop: `1.5px dashed rgba(212,175,55,.35)`, zIndex: 0 }} />

          {steps.map((step, idx) => {
            const isHovered = hovered === idx;
            const isActive = step.hi || isHovered;

            return (
              <div key={step.num} className="flex flex-col items-center text-center px-8 relative z-10"
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}>

                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6 relative transition-all duration-300 transform cursor-pointer"
                  style={{
                    background: isHovered ? S : 'transparent',
                    border: `1.5px solid ${isActive ? S : 'rgba(212,175,55,.2)'}`,
                    boxShadow: isHovered ? `0 8px 32px rgba(212,175,55,0.4)` : `none`,
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  }}>
                  <step.icon size={22} color={isHovered ? '#fff' : S} />
                  {/* Step badge */}
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center font-headline font-black transition-colors"
                    style={{
                      fontSize: 8.5,
                      background: isActive ? OS : SURF,
                      color: isActive ? P : OSV,
                      border: `1px solid ${isActive ? P : 'rgba(26,32,44,.1)'}`
                    }}>
                    {step.num}
                  </div>
                </div>

                <h3 className="font-headline font-bold text-base mb-2.5 transition-colors"
                  style={{ color: isHovered ? S : OS }}>
                  {step.label}
                </h3>
                <p className="text-sm leading-relaxed transition-opacity"
                  style={{ color: OSV, opacity: isHovered ? 1 : 0.85 }}>
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
