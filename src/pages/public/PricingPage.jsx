import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiStar,
  HiCheck,
  HiSparkles,
  HiChevronUp,
  HiChevronDown,
  HiCheckCircle,
  HiMinus,
  HiHomeModern,
  HiUsers,
  HiBanknotes,
  HiPlus
} from 'react-icons/hi2';
import PublicNav from '../../components/layout/PublicNav';
import PublicFooter from '../../components/layout/PublicFooter';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useNavigate } from 'react-router-dom';
import { pricingService } from '../../../services/pricing.service';

// NLV Brand Colors
const PRIMARY   = '#D4AF37';
const PRIMARY_H = '#B8962E';
const DEEP      = '#1F4D3A';
const SURFACE   = '#E8F3EE';
const GOLD      = '#D4AF37';
const GOLD_D    = '#B8962E';
const CHARCOAL  = '#111111';
const GRAY      = '#4B5563';
const LGRAY     = '#6B7280';
const SURFBG    = '#F9FAFB';
const SURFMID   = '#E8F3EE';
const BORDER    = '#E5E7EB';

// Removed legacy Ico function

const FAQ = [
  { q: 'Can I switch plans at any time?', a: 'Yes — upgrade or downgrade whenever you like. Changes apply at the next billing cycle.' },
  { q: 'Is there a free trial?', a: 'All paid plans include a 14-day free trial. No credit card required to start.' },
  { q: 'How does commission tracking work?', a: 'Commissions are calculated automatically from your configured split percentages. All parties are notified instantly upon disbursement.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, ACH transfers, and wire payments for Enterprise plans.' },
  { q: 'Do you offer discounts for larger teams?', a: 'Yes. Contact us for Enterprise pricing — we offer custom packages for brokerages with 50+ realtors.' },
];

const COMPARE_FEATURES = [
  { label: 'Active Listings',       free: '2',     starter: '10',    professional: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Team Members',          free: '1',     starter: '3',     professional: '15',        enterprise: 'Unlimited' },
  { label: 'Lead Management',       free: 'Basic', starter: 'Standard', professional: 'Full CRM', enterprise: 'Custom' },
  { label: 'Commission Tracking',   free: false,   starter: true,    professional: true,        enterprise: true },
  { label: 'Analytics Dashboard',   free: false,   starter: 'Basic', professional: 'Advanced',  enterprise: 'Custom' },
  { label: 'API Access',            free: false,   starter: false,   professional: true,        enterprise: true },
  { label: 'Priority Support',      free: false,   starter: false,   professional: true,        enterprise: true },
  { label: 'White-glove Onboarding',free: false,   starter: false,   professional: false,       enterprise: true },
];

const TIER_CONFIG = {
  Free:         { accent: '#E5E7EB', headerBg: '#F9FAFB', popular: false },
  Starter:      { accent: GOLD,      headerBg: '#FFFBEB', popular: false },
  Professional: { accent: PRIMARY,   headerBg: SURFACE,   popular: true  },
  Enterprise:   { accent: '#1A202C', headerBg: '#0F2318', popular: false },
};

function PlanCard({ plan, annual, adjPrice }) {
  const { user } = useAuth();
  const { subscription, createCheckoutSession, isLoading } = useSubscriptions();
  const navigate = useNavigate();
  
  const cfg   = TIER_CONFIG[plan.name] || TIER_CONFIG.Free;
  const isG   = plan.name === 'Professional';
  const isEnt = plan.name === 'Enterprise';
  const isCurrent = subscription?.plan_id === plan.name.toLowerCase();

  const handleAction = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/signup');
      return;
    }
    if (isCurrent) return;
    
    if (plan.name === 'Enterprise') {
      window.location.href = 'mailto:sales@nlvlistings.com';
      return;
    }

    if (plan.price === 'Free') {
      navigate('/app');
      return;
    }

    await createCheckoutSession(plan.name.toLowerCase());
  };

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        border: isG ? `2px solid ${PRIMARY}` : isEnt ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${BORDER}`,
        boxShadow: isG
          ? '0 16px 48px rgba(212,175,55,0.16), 0 4px 16px rgba(0,0,0,0.06)'
          : isEnt
          ? '0 8px 32px rgba(0,0,0,0.2)'
          : '0 2px 8px rgba(0,0,0,0.05)',
        background: isEnt ? '#111827' : '#fff',
      }}
    >
      {/* Card header */}
      <div className="px-6 pt-6 pb-5 relative" style={{ background: isEnt ? 'rgba(255,255,255,0.04)' : cfg.headerBg, borderBottom: `1px solid ${isEnt ? 'rgba(255,255,255,0.06)' : BORDER}` }}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: cfg.accent }} />

        {/* Tier name + popular badge */}
        <div className="flex items-center justify-between mb-4 pt-1">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: isEnt ? 'rgba(255,255,255,0.45)' : LGRAY }}
          >
            {plan.name}
          </span>
          {isCurrent ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 uppercase">Current</span>
          ) : cfg.popular && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: PRIMARY, color: '#fff' }}
            >
              <HiStar size={10} color="#fff" /> Most Popular
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <span
            className="font-headline font-black leading-none"
            style={{ fontSize: 40, color: isEnt ? '#fff' : CHARCOAL }}
          >
            {adjPrice(plan.price)}
          </span>
          {plan.price !== 'Free' && plan.price !== 'Custom' && (
            <span className="text-sm font-medium" style={{ color: isEnt ? 'rgba(255,255,255,0.4)' : LGRAY }}>
              /{annual ? 'yr' : 'mo'}
            </span>
          )}
        </div>
        <p className="text-[11px]" style={{ color: isEnt ? 'rgba(255,255,255,0.35)' : LGRAY }}>
          {annual && plan.price !== 'Free' && plan.price !== 'Custom'
            ? 'Billed annually · Save 20%'
            : plan.period}
        </p>
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col flex-1">
        {/* Description */}
        <p className="text-[12px] leading-relaxed mb-5" style={{ color: isEnt ? 'rgba(255,255,255,0.55)' : GRAY }}>
          {plan.description}
        </p>

        {/* Features */}
        <ul className="flex flex-col gap-3 flex-1 mb-6">
          {plan.features?.map(f => (
            <li key={f} className="flex items-start gap-3 text-[13px]">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: isEnt ? 'rgba(212,175,55,0.15)' : (isG ? SURFACE : '#F3F4F6') }}
              >
                <HiCheck size={12} color={isG ? DEEP : PRIMARY} />
              </div>
              <span style={{ color: isEnt ? 'rgba(255,255,255,0.7)' : GRAY }}>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA — always at bottom */}
        <Button
          onClick={handleAction}
          isLoading={isLoading}
          disabled={isCurrent}
          fullWidth
          variant={isG ? 'primary' : isEnt ? 'outline' : 'outline'}
          className="mt-auto"
          style={
            !isG && !isEnt ? { color: CHARCOAL, borderColor: BORDER } : {}
          }
        >
          {isCurrent ? 'Active Plan' : (plan.cta || 'Get Started')}
        </Button>
      </div>
    </div>
  );
}

// Convert a DB pricing_plan row to the shape PlanCard expects
function dbPlanToCard(p) {
  return {
    name:        p.name,
    price:       p.slug === 'sponsor' ? 'Custom' : p.monthly_price === 0 ? 'Free' : `$${p.monthly_price}`,
    annualPrice: p.annual_price,
    period:      p.slug === 'sponsor' ? 'Contact sales' : p.monthly_price === 0 ? 'Forever' : 'per month',
    description: p.features[0] ?? '',
    features:    p.features,
    cta:         p.slug === 'sponsor' ? 'Contact Sales' : p.slug === 'dominator' ? 'Go Dominator' : 'Get Started',
    highlighted: p.slug === 'pro',
    slug:        p.slug,
  };
}

export default function PricingPage() {
  const [annual,      setAnnual]      = useState(false);
  const [openFaq,     setOpenFaq]     = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const [dbPlans,     setDbPlans]     = useState(null); // null = loading

  useEffect(() => {
    pricingService.getPricingPlans()
      .then(plans => {
        const active = plans.filter(p => p.is_active);
        setDbPlans(active.length > 0 ? active.map(dbPlanToCard) : null);
      })
      .catch(() => setDbPlans(null));
  }, []);

  // Use DB plans if available
  const activePlans = dbPlans || [];

  if (dbPlans === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 font-medium">Loading pricing plans...</div>
      </div>
    );
  }

  function adjPrice(price) {
    if (!price || price === 'Free' || price === 'Custom') return price;
    const n = parseInt(price.replace('$', ''));
    return annual ? `$${Math.round(n * 0.8 * 12).toLocaleString()}` : price;
  }

  return (
    <div className="min-h-screen" style={{ background: '#fff' }}>
      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-4 md:px-8 text-center" style={{ background: '#fff' }}>
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
          style={{ background: SURFACE, border: `1px solid rgba(212,175,55,0.3)` }}
        >
          <HiSparkles size={13} color={PRIMARY} />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: DEEP }}>
            Transparent Pricing
          </span>
        </div>
        <h1 className="font-headline text-3xl md:text-5xl font-black mb-4 leading-tight" style={{ color: CHARCOAL }}>
          Choose Your <span style={{ color: PRIMARY }}>Growth</span> Plan
        </h1>
        <p className="text-base max-w-xl mx-auto mb-10" style={{ color: GRAY, lineHeight: 1.7 }}>
          From solo realtors to enterprise brokerages — every tier is built to scale with your ambition.
        </p>

        {/* Toggle */}
        <div
          className="inline-flex items-center gap-3 px-5 py-3 rounded-xl"
          style={{ background: SURFMID, border: `1px solid ${BORDER}` }}
        >
          <span className="text-sm font-medium" style={{ color: !annual ? CHARCOAL : LGRAY }}>Monthly</span>
          <button
            onClick={() => setAnnual(v => !v)}
            className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
            style={{ background: annual ? PRIMARY : '#CBD5E0' }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
              style={{ left: annual ? '22px' : '2px' }}
            />
          </button>
          <span className="text-sm font-medium" style={{ color: annual ? CHARCOAL : LGRAY }}>
            Annual{' '}
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: SURFACE, color: DEEP }}
            >
              Save 20%
            </span>
          </span>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="pb-20 px-4 md:px-8" style={{ background: '#fff' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {activePlans.map(plan => (
            <PlanCard key={plan.name} plan={plan} annual={annual} adjPrice={adjPrice} />
          ))}
        </div>

        {/* Compare link */}
        <div className="text-center mt-12">
          <button
            onClick={() => setShowCompare(v => !v)}
            className="text-sm font-medium flex items-center gap-1 mx-auto transition-colors"
            style={{ color: LGRAY }}
            onMouseEnter={e => e.currentTarget.style.color = PRIMARY}
            onMouseLeave={e => e.currentTarget.style.color = LGRAY}
          >
            {showCompare ? 'Hide' : 'Compare'} all features
            {showCompare ? <HiChevronUp size={18} color="inherit" /> : <HiChevronDown size={18} color="inherit" />}
          </button>
        </div>
      </section>

      {/* ── Comparison table ── */}
      {showCompare && (
        <section className="py-12 px-8" style={{ background: SURFBG }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="font-headline text-2xl font-black text-center mb-8" style={{ color: CHARCOAL }}>
              Full Feature Comparison
            </h2>
            <div className="rounded-xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 16px rgba(26,32,44,0.06)', border: `1px solid ${BORDER}` }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-widest" style={{ color: LGRAY, width: '30%' }}>Feature</th>
                    {['Free', 'Starter', 'Professional', 'Enterprise'].map(n => (
                      <th key={n} className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-widest"
                        style={{ color: n === 'Professional' ? DEEP : LGRAY }}>
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_FEATURES.map((row, i) => (
                    <tr key={row.label} style={{
                      borderBottom: i < COMPARE_FEATURES.length - 1 ? `1px solid ${BORDER}` : 'none',
                      background: i % 2 === 0 ? '#fff' : SURFBG,
                    }}>
                      <td className="px-5 py-3 text-[13px]" style={{ color: CHARCOAL }}>{row.label}</td>
                      {[row.free, row.starter, row.professional, row.enterprise].map((val, ci) => (
                        <td key={ci} className="px-4 py-3 text-center text-[12px]" style={{ color: GRAY }}>
                          {val === true  ? <HiCheckCircle size={16} color={PRIMARY} /> :
                           val === false ? <HiMinus size={16} color={BORDER} /> :
                           <span>{val}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Trust stats ── */}
      <section className="py-16 px-8" style={{ background: SURFMID }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: HiHomeModern, val: '2,400+', label: 'Active Listings' },
            { icon: HiUsers,   val: '340+',   label: 'Top Realtors' },
            { icon: HiBanknotes, val: '$1.2B',  label: 'Transactions' },
            { icon: HiStar,     val: '4.9/5',  label: 'Avg. Rating' },
          ].map(stat => (
            <div
              key={stat.label}
              className="text-center rounded-xl py-7 px-4"
              style={{ background: '#fff', boxShadow: '0 2px 8px rgba(26,32,44,0.05)', border: `1px solid ${BORDER}` }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: SURFACE }}
              >
                <stat.icon size={20} color={PRIMARY} />
              </div>
              <p className="font-headline font-black text-xl mb-0.5" style={{ color: CHARCOAL }}>{stat.val}</p>
              <p className="text-[11px]" style={{ color: LGRAY }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-8" style={{ background: '#fff' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: PRIMARY }}>FAQ</p>
            <h2 className="font-headline text-3xl font-black" style={{ color: CHARCOAL }}>Common Questions</h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  border: openFaq === i ? `1px solid rgba(212,175,55,0.4)` : `1px solid ${BORDER}`,
                  background: '#fff',
                }}
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-sm pr-4" style={{ color: CHARCOAL }}>{item.q}</span>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: openFaq === i ? SURFACE : SURFMID }}
                  >
                    {openFaq === i ? <HiMinus size={14} color={PRIMARY} /> : <HiPlus size={14} color={LGRAY} />}
                  </div>
                </button>
                {openFaq === i && (
                  <div
                    className="px-5 pb-4 text-sm leading-relaxed"
                    style={{ color: GRAY, borderTop: `1px solid ${BORDER}` }}
                  >
                    <div className="pt-3">{item.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Enterprise CTA ── */}
      <section className="py-20 px-8 relative overflow-hidden" style={{ background: DEEP }}>
        {/* Ambient green glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 60% 60% at 50% 100%, rgba(212,175,55,0.12), transparent)`,
        }} />
        <div className="max-w-3xl mx-auto text-center relative">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: PRIMARY }}>Enterprise</p>
          <h2 className="font-headline text-4xl font-black text-white mb-4">
            Need a Custom Plan?
          </h2>
          <p className="text-base mb-10" style={{ color: '#9CA3AF', lineHeight: 1.7 }}>
            For brokerages with 50+ realtors, we offer white-glove onboarding, custom SLAs, and dedicated account management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="px-8 py-3.5 rounded-xl text-sm font-semibold no-underline font-headline transition-all"
              style={{ background: PRIMARY, color: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.background = PRIMARY_H}
              onMouseLeave={e => e.currentTarget.style.background = PRIMARY}
            >
              Contact Sales
            </Link>
            <Link
              to="/"
              className="px-8 py-3.5 rounded-xl text-sm font-semibold no-underline font-headline transition-all"
              style={{ border: '1px solid rgba(212,175,55,0.4)', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.color = PRIMARY; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.color = '#fff'; }}
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
  