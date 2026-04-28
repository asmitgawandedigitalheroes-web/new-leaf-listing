import React from 'react';
import {
  HiShieldCheck,
  HiClipboardDocumentCheck,
  HiUsers,
  HiLockClosed
} from 'react-icons/hi2';
import Label from '../shared/Label';

const DEEP = '#1F4D3A';
const GOLD = '#D4AF37';
const OS = '#111111';
const OSV = '#4B5563';

export default function TrustBadges() {
  const badges = [
    { icon: HiShieldCheck, title: 'SSL Secured', desc: '256-bit encryption' },
    { icon: HiClipboardDocumentCheck, title: 'Verified Listings', desc: 'Manually reviewed' },
    { icon: HiUsers, title: 'NAR Compliant', desc: 'Data standards' },
    { icon: HiLockClosed, title: 'Privacy Protected', desc: 'CCPA & GDPR' },
  ];

  return (
    <section className="py-20 px-6 md:px-14 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Label t="Integrity & Security" />
          <h2
            className="font-headline font-black mb-4"
            style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: OS, letterSpacing: '-0.025em' }}
          >
            Built on <span style={{ color: DEEP }}>Trust</span>
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: OSV, lineHeight: 1.75 }}>
            We maintain the highest standards of data security and regulatory compliance, ensuring a safe and transparent marketplace for all members.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.map(b => (
            <div
              key={b.title}
              className="flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 border border-gray-100 bg-white hover:border-gold-muted hover:shadow-lg group"
              style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = GOLD + '44';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#F3F4F6';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.03)';
              }}
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110" 
                style={{ background: 'rgba(212,175,55,0.08)' }}
              >
                <b.icon size={22} color={GOLD} />
              </div>
              <div>
                <h4 className="font-headline font-bold text-sm mb-0.5" style={{ color: OS }}>{b.title}</h4>
                <p className="text-[11px] font-medium" style={{ color: OSV, letterSpacing: '0.01em' }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
