import React from 'react';
import { HiStar } from 'react-icons/hi2';
import Label from '../shared/Label';

const DEEP = '#1F4D3A';
const GOLD = '#D4AF37';
const OS = '#111111';
const OSV = '#4B5563';

const TESTIMONIALS = [
  {
    name: 'Sarah Jenkins',
    role: 'Pro Realtor, Miami',
    content: "NLV Listings has transformed my lead generation. The territory-based system gives me a competitive edge I couldn't find anywhere else. The featured placement actually works!",
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop'
  },
  {
    name: 'Marcus Thorne',
    role: 'Director, NY Realty',
    content: "As a Director, managing my team and tracking commissions has never been easier. The platform is intuitive, secure, and incredibly professional. It's the standard for modern brokers.",
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop'
  },
  {
    name: 'Elena Rodriguez',
    role: 'Luxury Specialist',
    content: "The 14-day trial sold me. Within the first week, I had three serious inquiries on my listings. The quality of leads is significantly higher than other platforms.",
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop'
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 px-6 md:px-14 bg-white border-t border-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Label t="Testimonials" />
          <h2
            className="font-headline font-black mb-4"
            style={{ fontSize: 'clamp(2.2rem,4vw,3.2rem)', color: OS, letterSpacing: '-0.025em' }}
          >
            What Our <span style={{ color: DEEP }}>Members</span> Say
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: OSV, lineHeight: 1.8 }}>
            Join thousands of real estate professionals who are growing their business with the most advanced listing platform in the market.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {TESTIMONIALS.map((t, i) => (
            <div 
              key={i}
              className="p-10 rounded-[2.5rem] border border-gray-100 bg-[#F9FAFB] flex flex-col h-full hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500 hover:border-gold-muted group"
            >
              <div className="flex gap-1 mb-8">
                {[...Array(t.rating)].map((_, i) => (
                  <HiStar key={i} size={18} color={GOLD} />
                ))}
              </div>
              
              <p className="flex-1 text-[15px] font-medium mb-10 leading-relaxed italic" style={{ color: OS }}>
                "{t.content}"
              </p>
              
              <div className="flex items-center gap-4 mt-auto">
                <div className="relative">
                  <img 
                    src={t.avatar} 
                    alt={t.name} 
                    className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gold rounded-full border-2 border-white flex items-center justify-center">
                    <HiStar size={10} color="white" />
                  </div>
                </div>
                <div>
                  <h4 className="font-headline font-bold text-base" style={{ color: OS }}>{t.name}</h4>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: DEEP }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
