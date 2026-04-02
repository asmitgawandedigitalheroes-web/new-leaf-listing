import React from 'react';
import { HiLockClosed, HiChatBubbleLeftEllipsis, HiFingerPrint } from 'react-icons/hi2';
import Label from '../shared/Label';
import Button from '../shared/Button';

const S = 'var(--color-gold)';   // Accent Gold
const S_DK = 'var(--color-primary-dark)';   // Deep Emerald Green
const OS = 'var(--color-on-surface)';   // Midnight Black
const BG = 'var(--color-surface-ivory)';   // Soft Ivory background

export default function CollectorSection() {
  return (
    <section style={{ background: BG }} className="py-24 px-8 md:px-14 overflow-hidden relative">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        
        <div className="relative order-2 lg:order-1">
          <div className="aspect-[4/3] rounded-sm overflow-hidden" style={{ border: `1px solid ${S}40` }}>
            <img
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
              alt="Luxury interior"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Decorative element */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
            style={{ border: `2px dashed ${S}` }} />
        </div>

        <div className="order-1 lg:order-2">
          <Label t="Private Markets" green />
          <h2 className="font-headline font-black text-gray-900 mb-5 leading-tight"
            style={{ fontSize: 'clamp(2.2rem,4vw,3.2rem)', letterSpacing: '-0.028em' }}>
            For Global<br />Collectors
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#4D4635', lineHeight: 1.88 }}>
            Access off-market opportunities and exclusive pocket listings before they reach the public domain. Our platform connects you with the world's most unique architectural achievements.
          </p>
          <div className="flex flex-col gap-3.5 mb-10">
            {[
              { t: 'Exclusive off-market inventory',   Icon: HiLockClosed },
              { t: 'Concierge-level deal navigation',   Icon: HiChatBubbleLeftEllipsis },
              { t: 'Instant identity verification',     Icon: HiFingerPrint },
            ].map(item => (
              <div key={item.t} className="flex items-center gap-3 text-sm" style={{ color: OS }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `rgba(201,164,92,0.12)`, border: `1px solid rgba(201,164,92,0.2)` }}>
                  <item.Icon size={14} color={S} />
                </div>
                {item.t}
              </div>
            ))}
          </div>
          <Button to="/browse" variant="ghost">Discover listings</Button>
        </div>
      </div>
    </section>
  );
}
