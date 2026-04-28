import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiMapPin, HiEnvelope, HiPhone, HiArrowRight } from 'react-icons/hi2';
import Label from '../shared/Label';
import { useSiteSettings } from '../../context/SiteSettingsContext';

const GOLD = '#D4AF37';
const DEEP = '#1F4D3A';
const OS = '#111111';
const OSV = '#4B5563';
const LGRAY = '#6B7280';

export default function ContactSection() {
  const { contact, supportEmail } = useSiteSettings();

  const cityStateZip = [
    [contact.city, contact.state].filter(Boolean).join(', '),
    contact.zip,
  ].filter(Boolean).join(' ').trim();

  const INFO = [
    {
      icon: HiMapPin,
      label: 'Headquarters',
      lines: [contact.address, cityStateZip].filter(Boolean),
      color: DEEP,
      bg: '#E8F3EE',
    },
    {
      icon: HiEnvelope,
      label: 'Email Us',
      lines: [supportEmail].filter(Boolean),
      color: GOLD,
      bg: 'rgba(212,175,55,0.1)',
    },
    {
      icon: HiPhone,
      label: 'Call Us',
      lines: [contact.phone, contact.businessHours].filter(Boolean),
      color: DEEP,
      bg: '#E8F3EE',
    },
  ].filter(i => i.lines.length > 0);

  return (
    <section className="py-24 px-4 md:px-8 lg:px-14" style={{ background: '#F7F6F2' }}>
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left — copy */}
          <div>
            <Label t="Get in Touch" />
            <h2
              className="font-headline font-black mb-4"
              style={{ fontSize: 'clamp(1.9rem,3.2vw,2.6rem)', color: OS, letterSpacing: '-0.025em', lineHeight: 1.15 }}
            >
              Let's Start a<br />
              <span style={{ color: DEEP }}>Conversation</span>
            </h2>
            <p className="text-sm mb-8 max-w-md" style={{ color: OSV, lineHeight: 1.8 }}>
              Whether you're a realtor ready to grow your business, a developer looking to partner, or just curious about NLV Listings — we'd love to hear from you.
            </p>

            {/* Mascot Image */}
            <div className="mt-4 flex justify-center lg:justify-start">
              <img
                src="/images/mascot.png"
                alt="NLV Mascot"
                className="w-full max-w-[280px] h-auto object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105"
              />
            </div>
          </div>

          {/* Right — Details & CTA */}
          <div className="flex flex-col gap-8">
            {/* Contact info cards */}
            <div className="flex flex-col gap-4">
              {INFO.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-start gap-4 p-4 rounded-xl"
                    style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: item.bg }}
                    >
                      <Icon size={18} color={item.color} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: LGRAY }}>
                        {item.label}
                      </div>
                      {item.lines.map((line, i) => (
                        <div key={i} className="text-sm font-medium" style={{ color: i === 0 ? OS : LGRAY }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA card */}
            <div
              className="rounded-2xl p-8 md:p-10"
              style={{
                background: '#1A202C',
                boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                borderLeft: `3px solid ${GOLD}`,
              }}
            >
              <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: GOLD }}>
                Ready to join?
              </div>
              <h3 className="font-headline font-black text-white text-2xl mb-3">
                Start Your Journey with NLV Listings
              </h3>
              <p className="text-sm mb-8" style={{ color: '#9CA3AF', lineHeight: 1.8 }}>
                Join hundreds of elite realtors already growing their business on the platform. Limited early-access spots are available.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/signup"
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm no-underline transition-all"
                  style={{ background: GOLD, color: OS }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#B8962E'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = GOLD; }}
                >
                  Get Early Access
                  <HiArrowRight size={16} />
                </Link>
                <Link
                  to="/contact"
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm no-underline transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
