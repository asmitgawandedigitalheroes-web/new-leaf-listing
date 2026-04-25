import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import NLVLogo from '../../components/ui/NLVLogo';
import Button from '../../components/ui/Button';
import {
  HiIdentification,
  HiEnvelope,
  HiLockClosed,
  HiCheckBadge,
  HiExclamationTriangle,
  HiClock,
  HiEye,
  HiEyeSlash,
  HiArrowRightOnRectangle,
} from 'react-icons/hi2';

const P      = '#D4AF37';
const S      = '#1F4D3A';
const SCL    = '#E8F3EE';
const OS     = '#111111';
const OSV    = '#4B5563';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';

export default function AcceptInvitePage() {
  const [searchParams]    = useSearchParams();
  const token             = searchParams.get('token') || '';
  const navigate          = useNavigate();
  const auth              = useAuth();
  const { addToast }      = useToast();

  // Token validation
  const [invitation,  setInvitation]  = useState(null);
  const [tokenState,  setTokenState]  = useState('loading'); // loading | valid | invalid | used | expired
  const [tokenError,  setTokenError]  = useState('');

  // Password form
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [fieldErrors,     setFieldErrors]     = useState({});
  const [loading,         setLoading]         = useState(false);

  // ── Validate token on mount ──────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenState('invalid');
      setTokenError('No invite token found in this URL. Please use the exact link sent to you.');
      return;
    }

    supabase
      .from('user_invitations')
      .select('id, email, full_name, role, territory_id, status, expires_at')
      .eq('token', token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setTokenState('invalid');
          setTokenError('This invite link is invalid or has been revoked. Please request a new one from your admin.');
          return;
        }
        if (data.status === 'accepted') {
          setTokenState('used');
          setTokenError('This invite link has already been used to create an account. Try signing in instead.');
          return;
        }
        if (data.status === 'revoked') {
          setTokenState('invalid');
          setTokenError('This invite link has been revoked. Please contact your admin for a new one.');
          return;
        }
        if (data.status !== 'pending' || new Date(data.expires_at) < new Date()) {
          setTokenState('expired');
          setTokenError('This invite link has expired. Please ask your admin to generate a new invite.');
          return;
        }
        setInvitation(data);
        setTokenState('valid');
      });
  }, [token]);

  // ── Submit handler ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!password || password.length < 8)   errs.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword)         errs.confirm  = 'Passwords do not match.';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);

    const { error } = await auth.signup({
      email:        invitation.email,
      password,
      full_name:    invitation.full_name,
      role:         invitation.role,
      territory_id: invitation.territory_id,
      invite_token: token,
    });

    setLoading(false);

    if (error) {
      if (error.message?.toLowerCase().includes('already registered') ||
          error.message?.toLowerCase().includes('already exists')) {
        addToast({
          type: 'error',
          title: 'Email already registered',
          desc: 'This email already has an account. Try signing in instead.',
        });
      } else {
        addToast({ type: 'error', title: 'Account creation failed', desc: error.message });
      }
      return;
    }

    addToast({ type: 'success', title: 'Account activated!', desc: 'Welcome to NLV Listings.' });
    setTimeout(() => {
      // Directors must sign the Territory Partner Agreement before the dashboard
      navigate(invitation.role === 'director' ? '/onboarding/sign-contract' : '/realtor/dashboard');
    }, 500);
  };

  // ── Loading state ────────────────────────────────────────────────
  if (tokenState === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: `3px solid ${BORDER}`,
            borderTopColor: P, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: 14, color: LGRAY }}>Validating your invite link…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error / invalid / used / expired state ───────────────────────
  if (tokenState !== 'valid') {
    const isExpired = tokenState === 'expired';
    const isUsed    = tokenState === 'used';
    const IconComp  = isExpired ? HiClock : HiExclamationTriangle;
    const iconColor = isExpired ? '#D97706' : '#EF4444';
    const iconBg    = isExpired ? '#FEF3C7' : '#FEE2E2';

    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 20, padding: '40px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: `1px solid ${BORDER}`, textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <NLVLogo size="sm" />
          </div>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <IconComp size={26} color={iconColor} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: OS, marginBottom: 8 }}>
            {isUsed ? 'Invite Already Used' : isExpired ? 'Invite Link Expired' : 'Invalid Invite Link'}
          </h1>
          <p style={{ fontSize: 14, color: OSV, lineHeight: 1.6, marginBottom: 28 }}>
            {tokenError}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isUsed && (
              <Button onClick={() => navigate('/login')} fullWidth>
                <HiArrowRightOnRectangle size={15} />
                Sign In
              </Button>
            )}
            <a
              href="mailto:support@nlvlistings.com"
              style={{
                display: 'block', textAlign: 'center', padding: '10px 0',
                fontSize: 13, color: LGRAY, textDecoration: 'none',
              }}
            >
              Contact support@nlvlistings.com
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Valid invite — show password form ────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ maxWidth: 460, width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <NLVLogo size="sm" />
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: `1px solid ${BORDER}` }}>

          {/* Invite banner */}
          <div style={{
            background: SCL, border: `1px solid rgba(31,77,58,0.2)`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 28,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <HiCheckBadge size={20} color={S} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: S, margin: '0 0 3px' }}>
                {invitation.role === 'director' ? 'Director Invite' : 'Realtor Invite'}
              </p>
              <p style={{ fontSize: 13, color: '#2D5A4A', margin: 0, lineHeight: 1.5 }}>
                You've been invited to join NLV Listings as a{' '}
                <strong>{invitation.role === 'director' ? 'Regional Director' : 'Realtor'}</strong>.
                Set a password below to activate your account — no approval wait required.
              </p>
            </div>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 800, color: OS, marginBottom: 6, textAlign: 'center' }}>
            Activate Your Account
          </h2>
          <p style={{ fontSize: 13, color: LGRAY, textAlign: 'center', marginBottom: 28 }}>
            Your details are pre-filled. Just set a password.
          </p>

          <form onSubmit={handleSubmit}>

            {/* Pre-filled Full Name (read-only) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: OSV, display: 'block', marginBottom: 6 }}>
                Full Name
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', border: `1px solid ${BORDER}`,
                borderRadius: 8, background: '#F3F4F6', fontSize: 14, color: OSV,
              }}>
                <HiIdentification size={15} color={LGRAY} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{invitation.full_name}</span>
                <span style={{ fontSize: 10, color: LGRAY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pre-filled</span>
              </div>
            </div>

            {/* Pre-filled Email (read-only) */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: OSV, display: 'block', marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', border: `1px solid ${BORDER}`,
                borderRadius: 8, background: '#F3F4F6', fontSize: 14, color: OSV,
              }}>
                <HiEnvelope size={15} color={LGRAY} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{invitation.email}</span>
                <span style={{ fontSize: 10, color: LGRAY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pre-filled</span>
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: OSV, display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <HiLockClosed size={15} color={fieldErrors.password ? '#EF4444' : LGRAY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  style={{
                    width: '100%', paddingLeft: 36, paddingRight: 40, paddingTop: 10, paddingBottom: 10,
                    border: `1.5px solid ${fieldErrors.password ? '#EF4444' : BORDER}`,
                    borderRadius: 8, fontSize: 14, color: OS, outline: 'none',
                    background: '#fff', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {showPass ? <HiEyeSlash size={16} color={LGRAY} /> : <HiEye size={16} color={LGRAY} />}
                </button>
              </div>
              {fieldErrors.password && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{fieldErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: OSV, display: 'block', marginBottom: 6 }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <HiLockClosed size={15} color={fieldErrors.confirm ? '#EF4444' : LGRAY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  style={{
                    width: '100%', paddingLeft: 36, paddingRight: 40, paddingTop: 10, paddingBottom: 10,
                    border: `1.5px solid ${fieldErrors.confirm ? '#EF4444' : BORDER}`,
                    borderRadius: 8, fontSize: 14, color: OS, outline: 'none',
                    background: '#fff', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {showConfirm ? <HiEyeSlash size={16} color={LGRAY} /> : <HiEye size={16} color={LGRAY} />}
                </button>
              </div>
              {fieldErrors.confirm && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{fieldErrors.confirm}</p>}
            </div>

            <Button type="submit" fullWidth isLoading={loading} size="lg">
              Activate Account
            </Button>

          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 13, color: LGRAY, marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: P, fontWeight: 700, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}
