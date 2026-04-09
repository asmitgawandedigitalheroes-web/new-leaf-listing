import { Link } from 'react-router-dom';
import { HiCheckBadge, HiLockClosed, HiPresentationChartLine, HiUsers } from 'react-icons/hi2';
import PublicNav from '../../components/layout/PublicNav';
import PublicFooter from '../../components/layout/PublicFooter';

const G  = '#D4AF37';
const GH = '#B8962E';
const DG = '#1F4D3A';
const SB = '#E8F3EE';
const TX = '#111111';
const TS = '#4B5563';
const TM = '#6B7280';

const STATS = [
  { value: '2,400+', label: 'Active Listings' },
  { value: '340+',   label: 'Elite Realtors' },
  { value: '14',     label: 'Global Markets' },
  { value: '$1.2B',  label: 'Transactions Closed' },
];

const VALUES = [
  {
    icon: HiCheckBadge,
    title: 'Curatorial Excellence',
    desc: 'Every listing on NLV undergoes a rigorous vetting process. We accept only properties that meet our standards of architectural distinction and investment merit.',
  },
  {
    icon: HiUsers,
    title: 'Broker-First Philosophy',
    desc: 'We are a platform built for professionals. Our tools, workflows, and intelligence layer are designed to amplify what great agents already do — not replace them.',
  },
  {
    icon: HiLockClosed,
    title: 'Privacy & Discretion',
    desc: 'Many of our listings are off-market. We protect the privacy of both buyers and sellers with enterprise-grade security and confidentiality standards.',
  },
  {
    icon: HiPresentationChartLine,
    title: 'Data-Driven Decisions',
    desc: 'Our platform surfaces real-time market intelligence so that agents and directors can make confident decisions backed by verified data, not assumptions.',
  },
];

const TEAM = [
  {
    name: 'Asmit Shah',
    role: 'Founder & CEO',
    bio: 'Former Goldman Sachs VP with 15 years in luxury real estate investment.',
    img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
    initials: 'AS',
  },
  {
    name: 'Maria Torres',
    role: 'Chief Operations Officer',
    bio: 'Ex-Sotheby\'s director who scaled operations across 12 international markets.',
    img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    initials: 'MT',
  },
  {
    name: 'James Park',
    role: 'Head of Product',
    bio: 'Previously led product at Compass. Obsessed with agent workflows and PropTech UX.',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    initials: 'JP',
  },
  {
    name: 'Sarah Kim',
    role: 'Head of Listings',
    bio: 'Licensed broker with $600M+ in closed transactions across Beverly Hills and Miami.',
    img: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80',
    initials: 'SK',
  },
];

// Removed legacy Ico function

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen font-body">
      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6 md:px-8" style={{ background: 'linear-gradient(160deg, #fff 55%, #E8F3EE 100%)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <span
            className="inline-block text-xs font-bold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(212,175,55,0.1)', color: GH, border: '1px solid rgba(212,175,55,0.25)' }}
          >
            Our Story
          </span>
          <h1
            className="font-headline font-black text-4xl md:text-6xl leading-tight mb-6"
            style={{ color: TX }}
          >
            The Platform Built for<br />
            <span style={{ color: G }}>Elite Real Estate</span> Professionals
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: TS }}>
            NLV Listings was founded on a simple belief: luxury real estate deserves a platform as exceptional as the properties it represents. We connect discerning brokerages with the intelligence, reach, and tools to close at the highest level.
          </p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{ background: DG }}>
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="font-headline font-black text-3xl md:text-4xl mb-1" style={{ color: G }}>{s.value}</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="py-20 px-6 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] mb-3 block" style={{ color: G }}>Our Mission</span>
              <h2 className="font-headline font-black text-3xl md:text-4xl leading-tight mb-5" style={{ color: TX }}>
                Elevating the Standard of Real Estate Intelligence
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: TS }}>
                We believe the future of real estate belongs to brokerages that pair exceptional human expertise with powerful digital infrastructure. NLV Listings provides the curated marketplace, the lead routing intelligence, and the commission transparency that top teams demand.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: TS }}>
                From off-market penthouses in Beverly Hills to waterfront estates in Miami, we are the connective tissue between exceptional properties and the agents who move them.
              </p>
            </div>
            {/* Image */}
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
                alt="Luxury property"
                className="w-full h-72 md:h-80 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-20 px-6 md:px-8" style={{ background: '#F9FAFB' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.12em] mb-3 block" style={{ color: G }}>What We Stand For</span>
            <h2 className="font-headline font-black text-3xl md:text-4xl" style={{ color: TX }}>Our Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map(v => (
              <div
                key={v.title}
                className="bg-white rounded-2xl p-6 md:p-8"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: SB }}
                >
                  <v.icon size={22} color={DG} />
                </div>
                <h3 className="font-headline font-bold text-base mb-2" style={{ color: TX }}>{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: TS }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team (Temporarily hidden) ── */}
      {/* 
      <section className="py-20 px-6 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.12em] mb-3 block" style={{ color: G }}>The People Behind NLV</span>
            <h2 className="font-headline font-black text-3xl md:text-4xl" style={{ color: TX }}>Leadership Team</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map(m => (
              <div
                key={m.name}
                className="bg-white rounded-2xl overflow-hidden text-center"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}
              >
                <div className="relative h-48 overflow-hidden" style={{ background: SB }}>
                  <img
                    src={m.img}
                    alt={m.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: G }} />
                </div>
                <div className="p-5">
                  <h3 className="font-headline font-bold text-sm" style={{ color: TX }}>{m.name}</h3>
                  <p className="text-xs font-semibold mb-2" style={{ color: G }}>{m.role}</p>
                  <p className="text-xs leading-relaxed" style={{ color: TM }}>{m.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* ── CTA ── */}
      <section className="py-20 px-6 md:px-8" style={{ background: DG }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline font-black text-3xl md:text-4xl text-white mb-4">
            Ready to Join NLV Listings?
          </h2>
          <p className="text-sm md:text-base mb-8" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Apply for membership and get your brokerage in front of the right buyers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-block font-bold text-sm px-8 py-3.5 rounded-xl no-underline transition-all"
              style={{ background: G, color: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.background = GH}
              onMouseLeave={e => e.currentTarget.style.background = G}
            >
              Apply for Membership
            </Link>
            <Link
              to="/contact"
              className="inline-block font-bold text-sm px-8 py-3.5 rounded-xl no-underline transition-all"
              style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
            >
              Contact Our Team
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
