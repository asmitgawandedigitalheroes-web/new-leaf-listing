import React from 'react';
import Button from '../shared/Button';

const S = 'var(--color-gold)';   // Accent Gold
const S_DK = 'var(--color-primary-dark)';   // Deep Emerald Green
const OS = 'var(--color-on-surface)';   // Midnight Black
const BG = 'var(--color-surface-ivory)';   // Soft Ivory background

export default function NetworkCTA() {
  const GOLD_GRADIENT = 'linear-gradient(135deg, var(--color-gold-light) 0%, var(--color-gold) 50%, var(--color-gold-dark) 100%)';

  return (
    <section className="py-24 px-8 md:px-14 relative" style={{ background: S_DK }}>
      <div className="absolute inset-0 opacity-15"
        style={{ backgroundImage: `radial-gradient(${S} 0.5px, transparent 0.5px)`, backgroundSize: '32px 32px' }} />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="font-headline font-black leading-tight mb-8"
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', color: '#ffffff', letterSpacing: '-0.03em' }}>
          Start Building Your <br />
          <span style={{ 
            background: GOLD_GRADIENT, 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
            paddingBottom: '4px'
          }}>
            Real Estate Network
          </span> Today.
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button to="/signup" variant="gold">Get Started Now</Button>
          <Button to="/contact" variant="ghost">Speak with an advisor</Button>
        </div>
      </div>
    </section>
  );
}
