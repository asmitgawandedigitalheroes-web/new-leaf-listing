import React from 'react';
import { HiShieldCheck, HiCpuChip, HiBolt } from 'react-icons/hi2';
import Label from '../shared/Label';
import Button from '../shared/Button';

const S = 'var(--color-gold)';   // Accent Gold
const S_DK = 'var(--color-primary-dark)';   // Deep Emerald Green
const OS = 'var(--color-on-surface)';   // Midnight Black
const BG = 'var(--color-surface-ivory)';   // Soft Ivory

export default function ProfessionalSection() {
  return (
    <section style={{ background: S_DK }} className="py-24 px-8 md:px-14 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 65% 55% at 10% 85%, ${OS}40, transparent)` }} />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
        <div>
          <Label t="Elite Sourcing" gold />
          <h2 className="font-headline font-black text-white mb-5 leading-tight"
            style={{ fontSize: 'clamp(2.2rem,4vw,3.2rem)', letterSpacing: '-0.028em' }}>
            For Real Estate<br />Professionals
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,.42)', lineHeight: 1.88 }}>
            Stop chasing dead ends. Our ecosystem identifies high-net-worth individuals actively searching for properties in your expertise zone — delivered directly to you.
          </p>
          <div className="flex flex-col gap-3.5 mb-10">
            {[
              { t: 'Verified high-net-worth leads',    Icon: HiShieldCheck },
              { t: 'AI-matched territory alignment',   Icon: HiCpuChip },
              { t: 'Instant commission settlements',   Icon: HiBolt },
            ].map(item => (
              <div key={item.t} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,.7)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${S}28`, border: `1px solid ${S}50` }}>
                  <item.Icon size={14} color={S} />
                </div>
                {item.t}
              </div>
            ))}
          </div>
          <Button to="/signup" variant="gold">Partner with us</Button>
        </div>

        <div className="relative">
          <div className="aspect-[4/3] rounded-sm overflow-hidden" style={{ border: `1px solid ${S}40` }}>
            <img
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80"
              alt="Professional team"
              className="w-full h-full object-cover grayscale opacity-80"
            />
          </div>
          {/* Floating stat */}
          <div className="absolute -bottom-6 -left-6 p-6 rounded-sm shadow-2xl border"
            style={{ 
              background: OS, 
              borderColor: 'rgba(212,175,55,0.3)',
              minWidth: 200 
            }}>
            <p className="font-headline font-black text-3xl mb-1 text-white">94%</p>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S }}>Lead Accuracy Rate</p>
          </div>
        </div>
      </div>
    </section>
  );
}
