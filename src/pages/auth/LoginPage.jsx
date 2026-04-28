import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiHomeModern,
  HiUsers,
  HiBanknotes,
  HiEnvelope,
  HiLockClosed,
  HiEyeSlash,
  HiEye,
  HiArrowRightOnRectangle,
  HiArrowLeft
} from 'react-icons/hi2';
import { HiMiniChatBubbleLeftRight } from 'react-icons/hi2';
import NLVLogo from '../../components/ui/NLVLogo';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { APP_URL } from '../../utils/appUrl';

// NLV Brand Colors
const P   = '#D4AF37';
const PH  = '#B8962E';
const S   = '#1F4D3A';
const SCL = '#E8F3EE';
const OS  = '#111111';
const OSV = '#4B5563';
const LGRAY = '#6B7280';

// Removed legacy Ico function

const BRAND_STATS = [
  { icon: HiHomeModern,  val: '2,400+', label: 'Active Listings' },
  { icon: HiUsers,       val: '340+',   label: 'Elite Realtors' },
  { icon: HiBanknotes,   val: '$1.2B',  label: 'Transactions' },
];

const TESTIMONIAL = {
  quote: "New Leaf Listings transformed how our brokerage operates. Lead routing alone saved us 8 hours a week.",
  name: 'Marcus A.',
  role: 'Regional Director',
};

export default function LoginPage() {
  useDocumentTitle('Sign In');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const auth = useAuth();
  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    const userRole = auth.profile?.role;
    if (!userRole) return;
    if (userRole === 'admin')         navigate('/admin/dashboard', { replace: true });
    else if (userRole === 'director') navigate('/director/dashboard', { replace: true });
    else                              navigate('/realtor/dashboard', { replace: true });
  }, [auth.profile?.role]);

  const [form, setForm]           = useState({ email: '', password: '' });
  const [loading, setLoading]     = useState(false);
  const [showPw, setShowPw]       = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!form.email) {
      addToast({ type: 'warning', title: 'Enter your email', desc: 'Type your email address above, then click Forgot password.' });
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${APP_URL}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      addToast({ type: 'error', title: 'Reset failed', desc: error.message });
    } else {
      setResetSent(true);
      addToast({ type: 'success', title: 'Reset email sent', desc: `Check ${form.email} for a password reset link.` });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error, profile: loggedInProfile } = await auth.login(form.email, form.password);
    setLoading(false);
    if (error) {
      addToast({ type: 'error', title: 'Sign in failed', desc: error.message });
      return;
    }
    addToast({ type: 'success', title: 'Welcome back!', desc: 'Signed in successfully.' });
    
    // Use the profile returned by login for immediate redirection
    const userRole   = loggedInProfile?.role;
    const userStatus = loggedInProfile?.status;
    if (userRole === 'admin') {
      navigate('/admin/dashboard');
    } else if (userRole === 'director') {
      navigate(userStatus === 'pending' ? '/onboarding/pending' : '/director/dashboard');
    } else {
      navigate(userStatus === 'pending' ? '/onboarding/pending' : '/realtor/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F9FAFB' }}>

      {/* ── Left panel — NLV branding ── */}
      <div
        className="hidden lg:flex w-[480px] flex-shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#1A202C' }}
      >
        {/* Ambient green glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 80% 60% at 20% 90%, rgba(212,175,55,0.12), transparent)`,
        }} />
        {/* Noise overlay */}
        <div className="absolute inset-0 noise-overlay pointer-events-none" />

        {/* Top — Logo */}
        <div className="relative">
          <NLVLogo mode="dark" size="md" />
        </div>

        {/* Middle — headline */}
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: P }}>
            The Digital Curator
          </p>
          <p className="font-headline text-4xl font-black text-white leading-snug mb-5">
            The Premium Platform<br />
            for <span style={{ color: P }}>Top Realtors</span>
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>
            Manage listings, track leads, and close more deals with the platform trusted by elite brokerages nationwide.
          </p>

          {/* Stats */}
          <div className="flex gap-6 mt-8">
            {BRAND_STATS.map(st => (
              <div key={st.label}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <st.icon size={14} color={P} />
                  <p className="font-headline font-black text-lg text-white">{st.val}</p>
                </div>
                <p className="text-[11px]" style={{ color: LGRAY }}>{st.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — testimonial */}
        <div
          className="relative rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <HiMiniChatBubbleLeftRight size={24} color={P} />
          <p className="text-sm leading-relaxed mt-2 mb-4" style={{ color: '#D1D5DB' }}>
            "{TESTIMONIAL.quote}"
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${P}, ${S})` }}
            >
              {TESTIMONIAL.name[0]}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{TESTIMONIAL.name}</p>
              <p className="text-[10px]" style={{ color: LGRAY }}>{TESTIMONIAL.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-10 py-8 md:py-16">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex justify-center mb-10 lg:hidden">
            <NLVLogo mode="light" size="md" />
          </div>

          <div className="mb-8">
            <h1 className="font-headline text-2xl font-black mb-1.5" style={{ color: OS }}>Welcome back</h1>
            <p className="text-sm" style={{ color: OSV }}>Sign in to your NLV Listings account</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="text-[10px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: OSV }}>
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <HiEnvelope size={16} color={OSV} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@brokerage.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg focus:outline-none"
                  style={{ border: '1px solid #E5E7EB', background: '#fff', color: OS }}
                  onFocus={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = ''; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: OSV }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading || resetSent}
                  className="text-[11px] font-medium transition-colors bg-transparent border-0 p-0 cursor-pointer"
                  style={{ color: resetSent ? '#10B981' : P }}
                  onMouseEnter={e => { if (!resetSent) e.currentTarget.style.color = S; }}
                  onMouseLeave={e => { if (!resetSent) e.currentTarget.style.color = P; }}
                >
                  {resetSent ? '✓ Reset email sent' : resetLoading ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <HiLockClosed size={16} color={OSV} />
                </span>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  maxLength={15}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg focus:outline-none"
                  style={{ border: '1px solid #E5E7EB', background: '#fff', color: OS }}
                  onFocus={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = ''; }}
                />
                <button
                  type="button"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  onClick={() => setShowPw(v => !v)}
                >
                  {showPw ? <HiEyeSlash size={16} color={OSV} /> : <HiEye size={16} color={OSV} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              isLoading={loading}
              fullWidth
              size="lg"
              className="mt-1"
            >
              <HiArrowRightOnRectangle size={16} />
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
            <span className="text-[11px]" style={{ color: LGRAY }}>or</span>
            <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm" style={{ color: OSV }}>
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold no-underline transition-colors"
              style={{ color: P }}
              onMouseEnter={e => e.currentTarget.style.color = S}
              onMouseLeave={e => e.currentTarget.style.color = P}
            >
              Get started free
            </Link>
          </p>

          {/* Back home */}
          <div className="flex justify-center mt-8">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-[12px] no-underline transition-colors"
              style={{ color: LGRAY }}
              onMouseEnter={e => e.currentTarget.style.color = OS}
              onMouseLeave={e => e.currentTarget.style.color = LGRAY}
            >
              <HiArrowLeft size={13} color="inherit" />
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
