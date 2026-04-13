import { Link } from 'react-router-dom';
import { 
  HiMapPin, 
  HiEnvelope, 
  HiPhone, 
  HiAtSymbol, 
  HiCamera, 
  HiBriefcase 
} from 'react-icons/hi2';
import NLVLogo from '../ui/NLVLogo';

const G  = '#D4AF37';
const DG = '#1F4D3A';

const COLS = [
  {
    heading: 'Platform',
    links: [
      { label: 'Browse Listings', to: '/browse' },
      { label: 'Pricing & Plans', to: '/pricing' },
      { label: 'Apply for Membership', to: '/signup' },
      { label: 'Sign In', to: '/login' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About NLV', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms of Service', to: '/terms-of-service' },
    ],
  },
  {
    heading: 'Contact',
    items: [
      { icon: HiMapPin,  text: '8 The Green St\nDover, DE, 19901' },
      { icon: HiEnvelope, text: 'support@nlvlistings.com' },
      { icon: HiPhone,    text: '1-866-886-3040' },
    ],
  },
];

const SOCIALS = [
  { icon: HiAtSymbol, label: 'Twitter' },
  { icon: HiCamera,    label: 'Instagram' },
  { icon: HiBriefcase,            label: 'LinkedIn' },
];

// Removed legacy Ico function

export default function PublicFooter() {
  return (
    <footer style={{ background: DG, color: '#fff' }}>
      <div className="flex justify-center pt-8">
        <div style={{ width: 1200, height: 1, background: `linear-gradient(90deg, transparent 0%, ${G} 50%, transparent 100%)`, boxShadow: `0 0 12px ${G}`, opacity: 0.8 }} />
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <NLVLogo mode="dark" size="md" />
            <p className="text-xs leading-relaxed mt-4 mb-6" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 220 }}>
              The premier digital marketplace for elite real estate professionals. Curated listings, intelligent routing, absolute discretion.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-2">
              {SOCIALS.map(s => (
                <button
                  key={s.label}
                  title={s.label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                >
                  <s.icon size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {COLS.map(col => (
            <div key={col.heading}>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5" style={{ color: G }}>
                {col.heading}
              </h4>

              {col.links && (
                <ul className="flex flex-col gap-3">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="text-sm no-underline transition-colors"
                        style={{ color: 'rgba(255,255,255,0.55)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {col.items && (
                <ul className="flex flex-col gap-4">
                  {col.items.map(item => (
                    <li key={item.icon} className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0" style={{ color: G }}>
                        <item.icon size={15} />
                      </span>
                      <span className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Partners */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
          <p className="text-xs font-bold uppercase tracking-[0.15em] mb-5 text-center" style={{ color: G }}>Our Partners</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a
              href="https://newleafvision.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold no-underline transition-colors"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
            >
              New Leaf Vision
            </a>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Nuevo Vizion Ingenieria Y Arquitectura
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Bold Group Development
            </span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-5 flex flex-col items-center gap-1 text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © 2026 NLVListings a product of New Leaf Vision Inc. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            IP owned by Bold Family Holdco FZCO
          </p>
        </div>
      </div>

    </footer>
  );
}
