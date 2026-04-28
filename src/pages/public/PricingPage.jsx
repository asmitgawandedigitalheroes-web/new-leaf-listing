import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiCheck, HiCheckCircle } from 'react-icons/hi2';
import PublicNav from '../../components/layout/PublicNav';
import PublicFooter from '../../components/layout/PublicFooter';
import { useAuth } from '../../context/AuthContext';
import { usePricing } from '../../hooks/usePricing';

// NLV Brand Colors
const GOLD   = '#D4AF37';
const GOLD_D = '#B8962E';
const DEEP   = '#1F4D3A';
const DEEP_H = '#163A2B';
const GRAY   = '#4B5563';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';
const DARK   = '#111111';

// Skeleton card
function CardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: `1px solid ${BORDER}`, minHeight: 380 }}>
      <div className="p-6 flex flex-col gap-4">
        <div style={{ height: 10, width: 80, background: '#F3F4F6', borderRadius: 6 }} />
        <div style={{ height: 40, width: 110, background: '#F3F4F6', borderRadius: 6 }} />
        <div style={{ height: 10, width: '100%', background: '#F3F4F6', borderRadius: 6 }} />
        <div style={{ height: 10, width: '70%', background: '#F3F4F6', borderRadius: 6 }} />
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: 10, width: '90%', background: '#F3F4F6', borderRadius: 6 }} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan }) {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  function handleCta(e) {
    e.preventDefault();
    if (plan.slug === 'sponsor') {
      window.location.href = 'mailto:support@nlvlistings.com';
      return;
    }
    if (!user || isLoading) {
      navigate('/signup');
      return;
    }
    const role = profile?.role;
    if (role === 'admin')         navigate('/admin/pricing');
    else if (role === 'director') navigate('/director/billing');
    else                          navigate('/realtor/billing');
  }

  const isDark     = plan.dark;
  const isPopular  = plan.popular;
  const isCustom   = plan.monthlyPrice === 0;

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden relative h-full"
      style={{
        border:     isPopular ? `2px solid ${GOLD}` : isDark ? 'none' : `1px solid ${BORDER}`,
        background: isDark ? DEEP : '#fff',
        boxShadow:  isPopular
          ? `0 0 0 1px ${GOLD}, 0 16px 48px rgba(212,175,55,0.14)`
          : isDark
          ? '0 8px 32px rgba(0,0,0,0.18)'
          : '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      {isPopular && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
          style={{ background: GOLD, color: '#fff', whiteSpace: 'nowrap' }}
        >
          Most Popular
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        {/* Badge */}
        <div className="mb-4">
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full"
            style={
              isDark    ? { background: GOLD,                       color: '#fff'   } :
              isPopular ? { background: 'rgba(212,175,55,0.15)',    color: GOLD_D  } :
                          { background: DEEP,                       color: '#fff'   }
            }
          >
            {plan.badge}
          </span>
        </div>

        {/* Tier name */}
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-1"
          style={{ color: isDark ? 'rgba(255,255,255,0.5)' : LGRAY }}>
          {plan.tier}
        </p>

        {/* Price */}
        {!isCustom ? (
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-headline font-black leading-none"
              style={{ fontSize: 40, color: isDark ? '#fff' : DARK }}>
              ${plan.monthlyPrice}
            </span>
            <span className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : LGRAY }}>
              / month
            </span>
          </div>
        ) : (
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-headline font-black leading-none"
              style={{ fontSize: 32, color: '#fff' }}>
              Custom Pricing
            </span>
          </div>
        )}

        {/* Price note */}
        <p className="text-[11px] font-semibold mb-4"
          style={{ color: isPopular ? GOLD : isDark ? GOLD : GOLD_D }}>
          {plan.priceNote}
        </p>

        {/* Description */}
        <p className="text-[12px] leading-relaxed mb-5"
          style={{ color: isDark ? 'rgba(255,255,255,0.6)' : GRAY }}>
          {plan.desc}
        </p>

        {/* Divider */}
        <div className="mb-5"
          style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : BORDER }} />

        {/* Features */}
        <ul className="flex flex-col gap-3 flex-1 mb-6">
          {plan.features.map(f => (
            <li key={f} className="flex items-start gap-2.5">
              <HiCheckCircle size={16} color={isDark ? GOLD : DEEP}
                style={{ flexShrink: 0, marginTop: 1 }} />
              <span className="text-[12px] leading-snug"
                style={{ color: isDark ? 'rgba(255,255,255,0.75)' : GRAY }}>
                {f}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handleCta}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all"
          style={
            isPopular || isDark
              ? { background: GOLD,  color: '#fff' }
              : { background: DEEP,  color: '#fff' }
          }
          onMouseEnter={e => {
            e.currentTarget.style.background = isPopular || isDark ? GOLD_D : DEEP_H;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isPopular || isDark ? GOLD : DEEP;
          }}
        >
          {plan.cta}
        </button>
      </div>
    </div>
  );
}

// Comparison table rows — static since features are editorial
const COMPARE_ROWS = [
  { label: 'Unlimited Listings',              intro: true,  pro: true,  dom: true,  mo: true  },
  { label: 'CRM',                             intro: 'Basic', pro: 'Advanced', dom: 'Full Suite', mo: 'Full Suite' },
  { label: 'Lead Capture',                    intro: true,  pro: true,  dom: true,  mo: true  },
  { label: 'Analytics',                       intro: false, pro: true,  dom: true,  mo: true  },
  { label: 'New Leaf Buyer Network',          intro: false, pro: true,  dom: true,  mo: true  },
  { label: 'New Leaf Commissions',            intro: false, pro: true,  dom: true,  mo: true  },
  { label: 'Priority Lead Routing',           intro: false, pro: false, dom: true,  mo: true  },
  { label: 'Developer Pre-Sales Access',      intro: false, pro: false, dom: true,  mo: true  },
  { label: 'First-Look New Inventory',        intro: false, pro: false, dom: true,  mo: true  },
  { label: 'Higher Commission Opportunities', intro: false, pro: false, dom: true,  mo: true  },
  { label: 'Exclusive Territory Rights',      intro: false, pro: false, dom: false, mo: true  },
  { label: 'Protected Lead Flow',             intro: false, pro: false, dom: false, mo: true  },
  { label: 'Priority Market Positioning',     intro: false, pro: false, dom: false, mo: true  },
  { label: 'Direct Developer Access',         intro: false, pro: false, dom: false, mo: true  },
  { label: 'White-Glove Support',             intro: false, pro: false, dom: false, mo: true  },
];

export default function PricingPage() {
  const [showCompare, setShowCompare] = useState(false);
  const { plans, loading } = usePricing();

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-4 md:px-8 text-center" style={{ background: '#F7F8FA' }}>
        <div
          className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-6"
          style={{ background: GOLD, color: '#fff' }}
        >
          Limited Time
        </div>
        <h1 className="font-headline font-black text-3xl md:text-5xl leading-tight mb-4"
          style={{ color: DARK }}>
          Introductory Pricing — Limited Early Access
        </h1>
        <p className="text-sm md:text-base max-w-xl mx-auto" style={{ color: GRAY, lineHeight: 1.7 }}>
          Secure early pricing before official market launch. All plans include unlimited listings.
        </p>
      </section>

      {/* ── Plans ── */}
      <section className="pb-20 px-4 md:px-8" style={{ background: '#F7F8FA' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch pt-10">
          {loading
            ? [1,2,3,4].map(i => <CardSkeleton key={i} />)
            : plans.map(plan => <PlanCard key={plan.id} plan={plan} />)
          }
        </div>

        <div className="text-center mt-12">
          <p className="text-xs mb-1" style={{ color: LGRAY }}>
            All pricing shown is introductory and subject to change after initial rollout.
          </p>
          <p className="text-xs font-semibold mb-4" style={{ color: DARK }}>
            Early adopters lock in pricing and positioning.
          </p>
          <button
            onClick={() => setShowCompare(v => !v)}
            className="text-sm font-medium transition-colors"
            style={{ color: GOLD }}
            onMouseEnter={e => e.currentTarget.style.color = GOLD_D}
            onMouseLeave={e => e.currentTarget.style.color = GOLD}
          >
            {showCompare ? 'Hide' : 'View'} full plan comparison →
          </button>
        </div>
      </section>

      {/* ── Comparison table ── */}
      {showCompare && (
        <section className="py-12 px-4 md:px-8" style={{ background: '#fff' }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="font-headline text-2xl font-black text-center mb-8" style={{ color: DARK }}>
              Full Plan Comparison
            </h2>
            <div className="data-table rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}`, background: '#F9FAFB' }}>
                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-widest"
                      style={{ color: LGRAY, width: '30%' }}>Feature</th>
                    {['Intro','Pro Agent','Dominator','Market Owner'].map(n => (
                      <th key={n} className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-widest"
                        style={{ color: n === 'Dominator' ? DEEP : LGRAY }}>{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, i) => (
                    <tr key={row.label} style={{
                      borderBottom: i < COMPARE_ROWS.length - 1 ? `1px solid ${BORDER}` : 'none',
                      background: i % 2 === 0 ? '#fff' : '#F9FAFB',
                    }}>
                      <td className="px-5 py-3 text-[13px]" style={{ color: DARK }}>{row.label}</td>
                      {[row.intro, row.pro, row.dom, row.mo].map((val, ci) => (
                        <td key={ci} className="px-4 py-3 text-center text-[12px]" style={{ color: GRAY }}>
                          {val === true  ? <HiCheck size={16} color={DEEP} style={{ margin: '0 auto' }} /> :
                           val === false ? <span style={{ color: BORDER }}>—</span> :
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

      {/* ── CTA ── */}
      <section className="py-20 px-8" style={{ background: DEEP }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-headline font-black text-3xl md:text-4xl text-white mb-4">
            Ready to Secure Your Position?
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            Early access pricing won't last. Lock in your tier before the platform officially launches.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/signup"
              className="px-8 py-3.5 rounded-xl text-sm font-bold no-underline transition-all"
              style={{ background: GOLD, color: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.background = GOLD_D}
              onMouseLeave={e => e.currentTarget.style.background = GOLD}>
              Get Early Access
            </a>
            <a href="mailto:support@nlvlistings.com"
              className="px-8 py-3.5 rounded-xl text-sm font-bold no-underline transition-all"
              style={{ border: '1.5px solid rgba(212,175,55,0.4)', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.color = '#fff'; }}>
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
