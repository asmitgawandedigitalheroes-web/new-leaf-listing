import { Link } from 'react-router-dom';
import { HiMapPin, HiEnvelope, HiPhone } from 'react-icons/hi2';
import { FaXTwitter, FaInstagram, FaLinkedinIn, FaFacebookF, FaYoutube, FaTiktok } from 'react-icons/fa6';
import NLVLogo from '../ui/NLVLogo';
import { useSiteSettings, formatAddress } from '../../context/SiteSettingsContext';

const G  = '#D4AF37';
const DG = '#1F4D3A';

const SOCIAL_ICONS = {
  twitter:   { icon: FaXTwitter,   label: 'Twitter / X' },
  instagram: { icon: FaInstagram,  label: 'Instagram' },
  linkedin:  { icon: FaLinkedinIn, label: 'LinkedIn' },
  facebook:  { icon: FaFacebookF,  label: 'Facebook' },
  youtube:   { icon: FaYoutube,    label: 'YouTube' },
  tiktok:    { icon: FaTiktok,     label: 'TikTok' },
};

const NAV_COLS = [
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
];

export default function PublicFooter() {
  const { contact, social, supportEmail } = useSiteSettings();

  const contactItems = [
    { icon: HiMapPin,   text: formatAddress(contact) },
    { icon: HiEnvelope, text: supportEmail },
    { icon: HiPhone,    text: contact.phone },
  ].filter(i => i.text);

  const socials = Object.entries(social)
    .filter(([, href]) => href)
    .map(([key, href]) => ({ ...SOCIAL_ICONS[key], href }))
    .filter(s => s.icon);

  return (
    <footer style={{ background: DG, color: '#fff' }}>
      <div className="flex justify-center pt-8">
        <div style={{ width: '100%', maxWidth: 1200, height: 1, background: `linear-gradient(90deg, transparent 0%, ${G} 50%, transparent 100%)`, boxShadow: `0 0 12px ${G}`, opacity: 0.8 }} />
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
            <div className="flex items-center gap-2 flex-wrap">
              {socials.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all no-underline"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLS.map(col => (
            <div key={col.heading}>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5" style={{ color: G }}>
                {col.heading}
              </h4>
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
            </div>
          ))}

          {/* Contact column (synced with admin settings) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5" style={{ color: G }}>Contact</h4>
            <ul className="flex flex-col gap-4">
              {contactItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0" style={{ color: G }}>
                    <item.icon size={15} />
                  </span>
                  <span className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Partners */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
          <p className="text-xs font-bold uppercase tracking-[0.15em] mb-5 text-center" style={{ color: G }}>Our Partners</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { src: '/partners/nuevo-vizion.png', alt: 'Nuevo Vizion', href: 'https://www.nuevovizion.com', bg: '#fff' },
              { src: '/partners/new-leaf.png',     alt: 'New Leaf Vision', href: 'https://www.newleafvision.com', bg: '#111827' },
              { src: '/partners/bold-group-dev.jpg', alt: 'Bold Group Development', href: 'https://www.boldgroup.dev', bg: '#fff' },
            ].map(p => (
              <a
                key={p.alt}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group transition-all no-underline rounded-xl p-2.5 flex items-center justify-center shadow-sm hover:shadow-md"
                style={{ 
                  width: 140, 
                  height: 60, 
                  background: p.bg,
                  border: p.bg === '#fff' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)'
                }}
                title={p.alt}
              >
                <img
                  src={p.src}
                  alt={p.alt}
                  className="opacity-90 group-hover:opacity-100 transition-opacity"
                  style={{ height: '100%', width: '100%', objectFit: 'contain' }}
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextSibling.style.display = 'inline';
                  }}
                />
                <span className="text-[10px] font-bold text-gray-900 hidden">{p.alt}</span>
              </a>
            ))}
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
