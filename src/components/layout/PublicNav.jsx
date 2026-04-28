import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { HiXMark, HiBars3 } from 'react-icons/hi2';
import NLVLogo from '../ui/NLVLogo';
import { useAuth } from '../../context/AuthContext';

const G = '#D4AF37';
const GH = '#B8962E';
const DG = '#1F4D3A';

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Browse', to: '/browse' },
  { label: 'Map', to: '/map' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
];

// Removed legacy Ico function

export default function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, profile } = useAuth();

  const dashboardHref =
    profile?.role === 'admin'    ? '/admin/dashboard' :
    profile?.role === 'director' ? '/director/dashboard' :
                                   '/realtor/dashboard';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 w-full z-[1000] font-headline transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.97)' : '#ffffff',
        borderBottom: `1px solid ${scrolled ? 'rgba(212,175,55,0.22)' : 'rgba(212,175,55,0.12)'}`,
        boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.06)' : 'none',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 md:h-[80px] flex items-center gap-8">

        {/* Logo */}
        <Link to="/" className="no-underline flex-shrink-0 flex items-center">
          <div className="hidden md:block">
            <NLVLogo mode="light" size="sm" />
          </div>
          <div className="md:hidden">
            <NLVLogo mode="light" size="xs" />
          </div>
        </Link>

        {/* Center nav — desktop */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {LINKS.map(l => (
            <NavLink
              key={l.label}
              to={l.to}
              className="no-underline px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={({ isActive }) => ({
                color: isActive ? DG : '#4B5563',
                background: isActive ? 'rgba(31,77,58,0.07)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.color = DG;
                  e.currentTarget.style.background = 'rgba(31,77,58,0.05)';
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.dataset.active) {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.background = '';
                }
              }}
            >{l.label}</NavLink>
          ))}
        </div>

        {/* Right actions — desktop */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          {/* Secondary — green outline */}
          <Link
            to={user ? dashboardHref : '/login'}
            className="text-sm font-bold no-underline px-5 py-2.5 rounded-xl transition-all"
            style={{ background: 'transparent', color: DG, border: `1.5px solid ${DG}` }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E8F3EE'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {user ? 'Dashboard' : 'Sign In'}
          </Link>
          {/* Primary — gold */}
          <Link
            to="/contact"
            className="text-sm font-bold no-underline px-5 py-2.5 rounded-xl transition-all"
            style={{ background: G, color: '#ffffff', boxShadow: '0 4px 14px rgba(212,175,55,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.background = GH; e.currentTarget.style.boxShadow = '0 6px 18px rgba(212,175,55,0.48)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = G; e.currentTarget.style.boxShadow = '0 4px 14px rgba(212,175,55,0.35)'; }}
          >
            Contact Agent
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: '#111111' }}
          onClick={() => setMenuOpen(v => !v)}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(31,77,58,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {menuOpen ? <HiXMark size={22} /> : <HiBars3 size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-6 pb-5 pt-2 flex flex-col gap-1"
          style={{ borderTop: '1px solid rgba(212,175,55,0.15)', background: '#fff' }}
        >
          {LINKS.map(l => (
            <NavLink
              key={l.label}
              to={l.to}
              className="no-underline px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={({ isActive }) => ({
                color: isActive ? DG : '#4B5563',
                background: isActive ? 'rgba(31,77,58,0.07)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
              })}
              onClick={() => setMenuOpen(false)}
            >{l.label}</NavLink>
          ))}
          <div className="flex flex-col gap-2 pt-3 mt-1" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
            {/* Secondary */}
            <Link
              to={user ? dashboardHref : '/login'}
              className="text-center py-2.5 text-sm font-bold rounded-xl no-underline transition-all"
              style={{ background: 'transparent', color: DG, border: `1.5px solid ${DG}` }}
              onClick={() => setMenuOpen(false)}
              onMouseEnter={e => e.currentTarget.style.background = '#E8F3EE'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {user ? 'Dashboard' : 'Sign In'}
            </Link>
            {/* Primary */}
            <Link
              to="/contact"
              className="text-center py-2.5 text-sm font-bold rounded-xl no-underline transition-all"
              style={{ background: G, color: '#ffffff' }}
              onClick={() => setMenuOpen(false)}
              onMouseEnter={e => e.currentTarget.style.background = GH}
              onMouseLeave={e => e.currentTarget.style.background = G}
            >
              Contact Agent
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
