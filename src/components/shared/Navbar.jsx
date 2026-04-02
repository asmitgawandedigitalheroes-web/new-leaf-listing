import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { HiBars3, HiXMark } from 'react-icons/hi2';
import NLVLogo from '../ui/NLVLogo';

const G = 'var(--color-gold)';
const GH = 'var(--color-gold-dark)';
const DG = 'var(--color-primary-dark)';

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Browse', to: '/browse' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 w-full z-50 font-headline transition-all duration-300"
      style={{
        background: scrolled ? 'var(--color-surface)' : '#ffffff',
        borderBottom: `1px solid ${scrolled ? 'var(--color-gold-muted)' : 'var(--color-gold-muted)'}`,
        boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.06)' : 'none',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-[80px] flex items-center gap-8">

        {/* Logo */}
        <Link to="/" className="no-underline flex-shrink-0">
          <NLVLogo mode="light" />
        </Link>

        {/* Center nav — desktop */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {LINKS.map(l => (
            <NavLink
              key={l.label}
              to={l.to}
              className="no-underline px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={({ isActive }) => ({
                color: isActive ? DG : 'var(--color-on-surface-variant)',
                background: isActive ? 'var(--color-primary-muted)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.color = DG;
                  e.currentTarget.style.background = 'var(--color-primary-muted)';
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.dataset.status !== 'active') {
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
            to="/login"
            className="text-sm font-bold no-underline px-5 py-2.5 rounded-xl transition-all"
            style={{ background: 'transparent', color: DG, border: `1.5px solid ${DG}` }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-low)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Sign In
          </Link>
          {/* Primary — gold */}
          <Link
            to="/contact"
            className="text-sm font-bold no-underline px-5 py-2.5 rounded-xl transition-all"
            style={{ background: 'var(--color-gold)', color: '#ffffff', boxShadow: '0 4px 14px rgba(212,175,55,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-gold-dark)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(212,175,55,0.48)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-gold)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(212,175,55,0.35)'; }}
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
          className="md:hidden px-6 pb-8 pt-4 flex flex-col gap-2"
          style={{ 
            borderTop: '1px solid var(--color-gold-muted)', 
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
          }}
        >
          {LINKS.map(l => (
            <NavLink
              key={l.label}
              to={l.to}
              className="no-underline px-4 py-3.5 rounded-xl text-base font-bold transition-all"
              style={({ isActive }) => ({
                color: isActive ? DG : 'var(--color-on-surface-variant)',
                background: isActive ? 'var(--color-primary-muted)' : 'transparent',
              })}
              onClick={() => setMenuOpen(false)}
            >{l.label}</NavLink>
          ))}
          <div className="flex flex-col gap-3 pt-5 mt-2" style={{ borderTop: `1px solid var(--color-gold-muted)` }}>
            {/* Secondary */}
            <Link
              to="/login"
              className="text-center py-3.5 text-sm font-bold rounded-xl no-underline transition-all"
              style={{ background: 'transparent', color: DG, border: `1.5px solid ${DG}` }}
              onClick={() => setMenuOpen(false)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container-low)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Sign In
            </Link>
            {/* Primary */}
            <Link
              to="/contact"
              className="text-center py-3.5 text-sm font-bold rounded-xl no-underline transition-all"
              style={{ background: 'var(--color-gold)', color: '#ffffff', boxShadow: '0 4px 12px rgba(212,175,55,0.3)' }}
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
