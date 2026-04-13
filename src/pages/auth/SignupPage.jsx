import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiUser,
  HiSparkles,
  HiCheckCircle,
  HiCheck,
  HiIdentification,
  HiBuildingOffice,
  HiEnvelope,
  HiLockClosed,
  HiHomeModern,
  HiUserGroup,
  HiArrowRight,
  HiArrowLeft,
  HiCheckBadge,
  HiRocketLaunch,
  HiMapPin as HiMap,
  HiDocumentText,
  HiClipboardDocumentList,
  HiEye,
  HiEyeSlash,
} from 'react-icons/hi2';
import NLVLogo from '../../components/ui/NLVLogo';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

// NLV Brand Colors
const P      = '#D4AF37';
const S      = '#1F4D3A';
const SCL    = '#E8F3EE';
const OS     = '#111111';
const OSV    = '#4B5563';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';
const SURFBG = '#F9FAFB';

// Steps per flow
// step 0 = Role selection (skipped when role is forced via URL)
// step 1 = Account details
// step 2 = Select Plan (realtor only, skipped for director)
// step 3 = Confirm & submit

const REALTOR_STEPS = [
  { label: 'Role',        icon: HiUserGroup },
  { label: 'Account',     icon: HiUser },
  { label: 'Select Plan', icon: HiSparkles },
  { label: 'Confirm',     icon: HiCheckCircle },
];

const DIRECTOR_STEPS = [
  { label: 'Role',    icon: HiUserGroup },
  { label: 'Account', icon: HiUser },
  { label: 'Confirm', icon: HiCheckCircle },
];

// When role is forced by invite URL — no role-selection step
const DIRECTOR_INVITE_STEPS = [
  { label: 'Account', icon: HiUser },
  { label: 'Confirm', icon: HiCheckCircle },
];

function InputField({ label, type = 'text', placeholder, value, onChange, icon, required = true, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: OSV }}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <icon.component size={15} color={focused ? P : (error ? '#EF4444' : OSV)} />
          </span>
        )}
        <input
          type={type}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={e => {
            setFocused(true);
            e.currentTarget.style.borderColor = P;
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.12)';
          }}
          onBlur={e => {
            setFocused(false);
            e.currentTarget.style.borderColor = error ? '#EF4444' : BORDER;
            e.currentTarget.style.boxShadow = '';
          }}
          className="w-full py-2.5 text-sm rounded-lg focus:outline-none"
          style={{
            paddingLeft: icon ? '36px' : '12px',
            paddingRight: '12px',
            border: `1px solid ${error ? '#EF4444' : BORDER}`,
            background: '#fff',
            color: OS,
          }}
        />
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// Password rules
const PW_RULES = [
  { key: 'length',    label: '8–15 characters',         test: v => v.length >= 8 && v.length <= 15 },
  { key: 'uppercase', label: 'One uppercase letter',     test: v => /[A-Z]/.test(v) },
  { key: 'number',    label: 'One number',               test: v => /[0-9]/.test(v) },
  { key: 'symbol',    label: 'One symbol (!@#$…)',       test: v => /[^A-Za-z0-9\s]/.test(v) },
  { key: 'nospace',   label: 'No spaces',                test: v => !/\s/.test(v) },
];

function PasswordField({ value, onChange, error }) {
  const [focused, setFocused] = useState(false);
  const [show, setShow]       = useState(false);
  const [touched, setTouched] = useState(false);

  const showRules = touched && value.length > 0;

  return (
    <div className="sm:col-span-2">
      <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: OSV }}>
        Password
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <HiLockClosed size={15} color={focused ? P : (error ? '#EF4444' : OSV)} />
        </span>
        <input
          type={show ? 'text' : 'password'}
          required
          autoComplete="new-password"
          maxLength={15}
          placeholder="Min. 8 chars, 1 uppercase, 1 number, 1 symbol"
          value={value}
          onChange={e => { setTouched(true); onChange(e); }}
          onFocus={e => {
            setFocused(true);
            setTouched(true);
            e.currentTarget.style.borderColor = P;
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.12)';
          }}
          onBlur={e => {
            setFocused(false);
            e.currentTarget.style.borderColor = error ? '#EF4444' : BORDER;
            e.currentTarget.style.boxShadow = '';
          }}
          className="w-full py-2.5 text-sm rounded-lg focus:outline-none"
          style={{
            paddingLeft: '36px',
            paddingRight: '40px',
            border: `1px solid ${error ? '#EF4444' : BORDER}`,
            background: '#fff',
            color: OS,
          }}
        />
        <button
          type="button"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        >
          {show ? <HiEyeSlash size={15} color={OSV} /> : <HiEye size={15} color={OSV} />}
        </button>
      </div>

      {/* Inline error from parent validation */}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}

      {/* Live rule checklist */}
      {showRules && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          {PW_RULES.map(rule => {
            const pass = rule.test(value);
            return (
              <div key={rule.key} className="flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-black"
                  style={{ background: pass ? '#D1FAE5' : '#FEE2E2', color: pass ? '#059669' : '#DC2626' }}
                >
                  {pass ? '✓' : '✗'}
                </span>
                <span className="text-[11px]" style={{ color: pass ? '#059669' : '#DC2626' }}>
                  {rule.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  useDocumentTitle('Create Account');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const auth = useAuth();
  const [searchParams] = useSearchParams();

  // Invite / role params from URL
  const inviteTerritoryId = searchParams.get('territory_id') || '';
  const inviteDirectorId  = searchParams.get('director_id')  || '';
  const roleParam         = searchParams.get('role')         || '';
  const isDirectorInvite  = roleParam === 'director';

  // Admin invite token (Flow 2 — quick link)
  const inviteToken = searchParams.get('invite_token') || '';
  const [inviteData,    setInviteData]    = useState(null);
  const [inviteError,   setInviteError]   = useState('');
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);

  // If role is forced by URL or invite token present, skip the role-selection step
  const [step, setStep] = useState((isDirectorInvite || !!inviteToken) ? 1 : 0);
  const [form, setForm] = useState({
    name: '', email: '', password: '', company: '',
    country: '', state: '', city: '',
    role: isDirectorInvite ? 'director' : '',   // empty until user picks
    plan: 'pro',
    licenseNumber: '', licenseState: '', licenseExpiry: '',
  });
  const [loading, setLoading]           = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pricingPlans, setPricingPlans]   = useState([]);
  // OBS-001/002: inline field-level errors for Step 1
  const [fieldErrors, setFieldErrors] = useState({});

  const isDirector = form.role === 'director';

  // Active steps / display-step index
  const activeSteps = isDirectorInvite
    ? DIRECTOR_INVITE_STEPS
    : isDirector
      ? DIRECTOR_STEPS
      : REALTOR_STEPS;

  // Map internal step numbers to the visual step indicator index
  const currentDisplayStep = isDirectorInvite
    ? (step === 1 ? 0 : 1)                                   // Account=0, Confirm=1
    : isDirector
      ? (step === 0 ? 0 : step === 1 ? 1 : 2)               // Role=0, Account=1, Confirm=2
      : step;                                                 // Role=0, Account=1, Plan=2, Confirm=3

  useEffect(() => {
    supabase
      .from('pricing_plans')
      .select('slug, name, monthly_price, features')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPricingPlans(data.map(p => ({
            id: p.slug,
            name: p.name,
            price: p.monthly_price,
            features: Array.isArray(p.features) ? p.features : [],
          })));
        }
      });
  }, []);

  // Validate admin invite token (Flow 2)
  useEffect(() => {
    if (!inviteToken) return;
    setInviteLoading(true);
    supabase
      .from('user_invitations')
      .select('role, territory_id, email, full_name, status, expires_at')
      .eq('token', inviteToken)
      .maybeSingle()
      .then(({ data, error }) => {
        setInviteLoading(false);
        if (error || !data) {
          setInviteError('This invite link is invalid or has been revoked. Please request a new one from your admin.');
          return;
        }
        if (data.status === 'accepted') {
          setInviteError('This invite link has already been used. Please sign in or request a new invite.');
          return;
        }
        if (data.status !== 'pending' || new Date(data.expires_at) < new Date()) {
          setInviteError('This invite link has expired. Please ask your admin for a new one.');
          return;
        }
        setInviteData(data);
        // Pre-fill role and any pre-provided fields from the invite
        setForm(prev => ({
          ...prev,
          role: data.role,
          email: data.email || prev.email,
          name:  data.full_name || prev.name,
        }));
      });
  }, [inviteToken]);

  const update = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  const next = async (e) => {
    e?.preventDefault();

    // ── Step 0: role selection — handled by card click, not this fn ──────────

    // ── Step 1: account details ───────────────────────────────────────────────
    if (step === 1) {
      // OBS-001/002: Collect ALL errors in one pass and show them inline simultaneously
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const errs = {};
      if (!form.name.trim())                          errs.name     = 'Full name is required.';
      if (!form.email.trim())                         errs.email    = 'Email address is required.';
      else if (!EMAIL_RE.test(form.email.trim()))     errs.email    = 'Enter a valid email address.';
      if (!form.password) {
        errs.password = 'Password is required.';
      } else if (PW_RULES.some(r => !r.test(form.password))) {
        errs.password = 'Password does not meet all requirements.';
      }
      if (!form.company.trim())                       errs.company  = 'Company or brokerage name is required.';
      if (!form.country.trim())                       errs.country  = 'Country is required.';
      if (!form.state.trim())                         errs.state    = 'State / province is required.';
      if (!form.city.trim())                          errs.city     = 'City is required.';

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }
      setFieldErrors({});
      // Directors skip plan selection
      setStep(isDirector ? 3 : 2);
      return;
    }

    // ── Step 2: plan selection (realtor only) ─────────────────────────────────
    if (step === 2) {
      if (!form.plan) {
        addToast({ type: 'error', title: 'Plan required', desc: 'Please select a subscription plan.' });
        return;
      }
      setStep(3);
      return;
    }

    // ── Step 3: confirm & submit ──────────────────────────────────────────────
    if (!acceptedTerms) {
      addToast({ type: 'error', title: 'Action required', desc: 'Please agree to the terms to continue.' });
      return;
    }
    setLoading(true);
    const { error } = await auth.signup({
      email:                form.email,
      password:             form.password,
      full_name:            form.name,
      company:              form.company,
      country:              form.country,
      state:                form.state,
      city:                 form.city,
      role:                 form.role,
      territory_id:         inviteData?.territory_id || inviteTerritoryId || null,
      assigned_director_id: inviteDirectorId  || null,
      license_number:       form.licenseNumber || null,
      license_state:        form.licenseState  || null,
      license_expiry:       form.licenseExpiry || null,
      invite_token:         inviteToken || null,
    });
    setLoading(false);
    if (error) {
      addToast({ type: 'error', title: 'Signup failed', desc: error.message });
      return;
    }
    addToast({ type: 'success', title: 'Account created!', desc: 'Welcome to New Leaf Listings.' });
    setTimeout(() => {
      // Admin-invited users (inviteToken) and directors go straight to their dashboard
      const goToDirectorDash = isDirector || inviteData?.role === 'director';
      if (inviteToken) {
        navigate(goToDirectorDash ? '/director/dashboard' : '/realtor/dashboard');
      } else {
        navigate(isDirector ? '/director/dashboard' : '/onboarding/pending');
      }
    }, 500);
  };

  const goBack = () => {
    if (step === 1) {
      // Only go back to role selection if it wasn't forced by URL or invite token
      if (!isDirectorInvite && !inviteToken) setStep(0);
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(isDirector ? 1 : 2);
    }
  };

  // Show loading/error state while validating invite token
  if (inviteToken && inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: SURFBG }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: LGRAY }}>Validating invite link…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (inviteToken && !inviteLoading && inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: SURFBG }}>
        <div style={{ maxWidth: 400, width: '100%', background: '#fff', borderRadius: 20, padding: '40px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB', textAlign: 'center' }}>
          <div className="flex justify-center mb-6"><NLVLogo mode="light" size="sm" /></div>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <HiRocketLaunch size={24} color="#DC2626" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: OS, marginBottom: 8 }}>Invite Link Issue</h2>
          <p style={{ fontSize: 14, color: OSV, lineHeight: 1.6, marginBottom: 24 }}>{inviteError}</p>
          <a href="mailto:support@nlvlistings.com" style={{ fontSize: 13, color: LGRAY }}>Contact support@nlvlistings.com</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 md:px-6 py-8 md:py-12" style={{ background: SURFBG }}>
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <NLVLogo mode="light" size="md" />
        </div>

        {/* ── Step indicators ── */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {activeSteps.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: i < currentDisplayStep ? S : i === currentDisplayStep ? P : '#E8F3EE',
                    color: i <= currentDisplayStep ? '#fff' : LGRAY,
                    boxShadow: i === currentDisplayStep ? `0 0 0 3px rgba(212,175,55,0.2)` : 'none',
                  }}
                >
                  {i < currentDisplayStep ? <HiCheck size={14} color="#fff" /> : <span>{i + 1}</span>}
                </div>
                <span
                  className="text-[12px] font-medium hidden sm:block"
                  style={{ color: i === currentDisplayStep ? OS : i < currentDisplayStep ? OSV : LGRAY }}
                >
                  {s.label}
                </span>
              </div>
              {i < activeSteps.length - 1 && (
                <div
                  className="w-10 h-px mx-3 flex-shrink-0"
                  style={{ background: i < currentDisplayStep ? P : BORDER }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Card ── */}
        <div
          className="rounded-xl"
          style={{
            background: '#fff',
            boxShadow: '0 4px 24px rgba(26,32,44,0.07)',
            border: `1px solid ${BORDER}`,
          }}
        >

          {/* ── Step 0: Role selection ── */}
          {step === 0 && (
            <div className="p-5 md:p-8">
              <h2 className="font-headline text-xl font-black mb-1" style={{ color: OS }}>
                Choose your role
              </h2>
              <p className="text-sm mb-8" style={{ color: OSV }}>
                Select how you'll be using NLV Listings.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Realtor card */}
                <button
                  type="button"
                  onClick={() => { setForm(p => ({ ...p, role: 'realtor' })); setStep(1); }}
                  className="flex flex-col items-center gap-4 p-6 rounded-xl text-left transition-all group"
                  style={{ border: `1.5px solid ${BORDER}`, background: '#fff' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.background = SCL; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = '#fff'; }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: `${P}18` }}
                  >
                    <HiHomeModern size={28} color={P} />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-black mb-1" style={{ color: OS }}>Realtor</p>
                    <p className="text-xs leading-relaxed" style={{ color: OSV }}>
                      List properties, manage leads, and grow your book of business.
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mt-auto"
                    style={{ color: P }}
                  >
                    Get started <HiArrowRight size={13} />
                  </div>
                </button>

                {/* Director card — invite-only, not self-signup */}
                <div
                  className="flex flex-col items-center gap-4 p-6 rounded-xl text-left"
                  style={{ border: `1.5px solid ${BORDER}`, background: SURFBG, opacity: 0.85 }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: `${S}18` }}
                  >
                    <HiUserGroup size={28} color={S} />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-black mb-1" style={{ color: OS }}>Regional Director</p>
                    <p className="text-xs leading-relaxed" style={{ color: OSV }}>
                      Oversee a territory, manage realtors, and earn recurring commissions.
                    </p>
                  </div>
                  <div
                    className="flex flex-col items-center gap-1 mt-auto"
                  >
                    <span
                      className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ background: `${S}18`, color: S }}
                    >
                      Invite Only
                    </span>
                    <p className="text-[11px] text-center mt-1" style={{ color: LGRAY }}>
                      Contact <a href="mailto:support@nlvlistings.com" style={{ color: S, fontWeight: 700 }}>support@nlvlistings.com</a> to apply.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Account details ── */}
          {step === 1 && (
            <form onSubmit={next} className="p-5 md:p-8">
              <h2 className="font-headline text-xl font-black mb-1" style={{ color: OS }}>Create your account</h2>
              <p className="text-sm mb-6" style={{ color: OSV }}>
                {isDirector
                  ? 'Set up your Regional Director account.'
                  : 'Start your 14-day free trial. No credit card required.'}
              </p>

              {/* Director invite banner */}
              {isDirectorInvite && (
                <div className="flex items-start gap-3 p-4 rounded-xl mb-5" style={{ background: SCL, border: '1px solid rgba(31,77,58,0.2)' }}>
                  <HiCheckBadge size={18} color={S} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider mb-0.5" style={{ color: S }}>Regional Director Invite</div>
                    <p className="text-xs leading-relaxed" style={{ color: '#2D5A4A' }}>
                      You've been invited as a Regional Director. Your account will be activated immediately with full territory access.
                    </p>
                  </div>
                </div>
              )}

              {/* Realtor invite banner */}
              {!isDirectorInvite && !inviteToken && inviteTerritoryId && inviteDirectorId && (
                <div className="flex items-start gap-3 p-4 rounded-xl mb-5" style={{ background: SCL, border: '1px solid rgba(31,77,58,0.2)' }}>
                  <HiCheckBadge size={18} color={S} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider mb-0.5" style={{ color: S }}>Director Invite</div>
                    <p className="text-xs leading-relaxed" style={{ color: '#2D5A4A' }}>
                      You've been invited to join a territory. After signing up, you will be placed in the director's approval queue and automatically assigned to their territory.
                    </p>
                  </div>
                </div>
              )}

              {/* Admin invite token banner (Flow 2) */}
              {inviteData && (
                <div className="flex items-start gap-3 p-4 rounded-xl mb-5" style={{ background: SCL, border: '1px solid rgba(31,77,58,0.2)' }}>
                  <HiCheckBadge size={18} color={S} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider mb-0.5" style={{ color: S }}>
                      {inviteData.role === 'director' ? 'Director Invite' : 'Realtor Invite'} — Admin
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#2D5A4A' }}>
                      You've been invited to join as a <strong>{inviteData.role === 'director' ? 'Regional Director' : 'Realtor'}</strong>.
                      Your account will be <strong>instantly activated</strong> — no approval wait required.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <InputField label="Full Name"           placeholder="John Smith"                       value={form.name}     onChange={e => { update('name')(e);     setFieldErrors(p => ({ ...p, name: '' })); }}     icon={{ component: HiIdentification }} error={fieldErrors.name} />
                <InputField label="Company / Brokerage" placeholder="Acme Realty"                     value={form.company}  onChange={e => { update('company')(e);  setFieldErrors(p => ({ ...p, company: '' })); }} icon={{ component: HiBuildingOffice }} error={fieldErrors.company} />
                <InputField label="Email Address"       type="email" placeholder="john@brokerage.com" value={form.email}    onChange={e => { update('email')(e);    setFieldErrors(p => ({ ...p, email: '' })); }}    icon={{ component: HiEnvelope }} error={fieldErrors.email} />
                <PasswordField value={form.password} onChange={e => { update('password')(e); setFieldErrors(p => ({ ...p, password: '' })); }} error={fieldErrors.password} />
                <InputField label="Country"             placeholder="United States"                    value={form.country}  onChange={e => { update('country')(e);  setFieldErrors(p => ({ ...p, country: '' })); }} icon={{ component: HiMap }} error={fieldErrors.country} />
                <InputField label="State / Province"    placeholder="Nevada"                           value={form.state}    onChange={e => { update('state')(e);    setFieldErrors(p => ({ ...p, state: '' })); }}    icon={{ component: HiMap }} error={fieldErrors.state} />
                <InputField label="City"                placeholder="Las Vegas"                        value={form.city}     onChange={e => { update('city')(e);     setFieldErrors(p => ({ ...p, city: '' })); }}     icon={{ component: HiMap }} error={fieldErrors.city} />
              </div>

              {/* License fields — realtors only */}
              {!isDirector && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <InputField label="License Number" placeholder="e.g. LIC-12345" value={form.licenseNumber} onChange={update('licenseNumber')} icon={{ component: HiClipboardDocumentList }} required={false} />
                  <InputField label="License State"  placeholder="e.g. NV"        value={form.licenseState}  onChange={update('licenseState')}  icon={{ component: HiMap }} required={false} />
                  <InputField label="License Expiry" type="date"                   value={form.licenseExpiry} onChange={update('licenseExpiry')} icon={{ component: HiDocumentText }} required={false} />
                </div>
              )}

              <div className="flex gap-3">
                {!isDirectorInvite && !inviteToken && (
                  <Button type="button" variant="outline" onClick={goBack} className="flex-shrink-0">
                    <HiArrowLeft size={15} />
                  </Button>
                )}
                <Button type="submit" fullWidth size="lg">
                  Continue <HiArrowRight size={16} />
                </Button>
              </div>
            </form>
          )}

          {/* ── Step 2: Select Plan (realtors only) ── */}
          {step === 2 && (
            <div className="p-5 md:p-8">
              <h2 className="font-headline text-xl font-black mb-1" style={{ color: OS }}>Choose a plan</h2>
              <p className="text-sm mb-6" style={{ color: OSV }}>You can change this anytime. 14-day free trial included.</p>

              <div className="flex flex-col gap-3 mb-6">
                {pricingPlans.map(plan => (
                  <button
                    key={plan.name}
                    onClick={() => setForm(p => ({ ...p, plan: plan.name }))}
                    className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                    style={{
                      border: form.plan === plan.name ? `1.5px solid ${P}` : `1px solid ${BORDER}`,
                      background: form.plan === plan.name ? SCL : '#fff',
                      borderLeftWidth: form.plan === plan.name ? '3px' : '1px',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        borderColor: form.plan === plan.name ? P : '#CBD5E0',
                        background: form.plan === plan.name ? P : 'transparent',
                      }}
                    >
                      {form.plan === plan.name && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm" style={{ color: form.plan === plan.name ? S : OS }}>
                          {plan.name}
                        </span>
                        <span className="font-bold text-sm" style={{ color: P }}>
                          ${plan.price}<span className="text-[11px] font-normal" style={{ color: LGRAY }}>/mo</span>
                        </span>
                      </div>
                      {plan.name === 'Pro Agent' && (
                        <p className="text-[11px] mt-0.5" style={{ color: S }}>
                          Includes NLV product referral commissions
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <HiArrowLeft size={15} /> Back
                </Button>
                <Button onClick={next} className="flex-1">
                  Continue <HiArrowRight size={15} />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm & submit ── */}
          {step === 3 && (
            <div className="p-5 md:p-8">
              <h2 className="font-headline text-xl font-black mb-1" style={{ color: OS }}>Review & Confirm</h2>
              <p className="text-sm mb-6" style={{ color: OSV }}>
                {isDirector ? 'Review your details and accept the Director Agreement.' : 'Your 14-day free trial starts today. Cancel anytime.'}
              </p>

              <div className="rounded-xl mb-6 overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                {[
                  { icon: HiIdentification, label: 'Name',     value: form.name },
                  { icon: HiEnvelope,       label: 'Email',    value: form.email },
                  { icon: HiBuildingOffice, label: 'Company',  value: form.company },
                  { icon: HiMap,            label: 'Location', value: [form.city, form.state, form.country].filter(Boolean).join(', ') || '—' },
                  { icon: isDirector ? HiUserGroup : HiHomeModern, label: 'Role', value: isDirector ? 'Regional Director' : 'Realtor' },
                  ...(!isDirector ? [{ icon: HiSparkles, label: 'Plan', value: form.plan }] : []),
                ].map((r, i, arr) => (
                  <div
                    key={r.label}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{
                      borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                      background: i % 2 === 0 ? '#fff' : SURFBG,
                    }}
                  >
                    <r.icon size={15} color={LGRAY} />
                    <span className="text-[11px] uppercase tracking-widest font-semibold flex-shrink-0 w-20" style={{ color: LGRAY }}>
                      {r.label}
                    </span>
                    <span className="text-sm font-medium capitalize" style={{ color: OS }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Realtor: trial notice */}
              {!isDirector && (
                <div className="flex items-start gap-3 p-4 rounded-xl mb-6" style={{ background: SCL, border: `1px solid rgba(212,175,55,0.3)` }}>
                  <HiCheckBadge size={18} color={P} />
                  <p className="text-[12px] leading-relaxed" style={{ color: S }}>
                    <strong>14-day free trial</strong> included — no charges until your trial ends. Cancel anytime from account settings.
                  </p>
                </div>
              )}

              {/* Director: contract notice */}
              {isDirector && (
                <div className="flex items-start gap-3 p-4 rounded-xl mb-6" style={{ background: SCL, border: `1px solid rgba(31,77,58,0.3)` }}>
                  <HiDocumentText size={18} color={S} />
                  <p className="text-[12px] leading-relaxed" style={{ color: S }}>
                    By proceeding you enter into a <strong>Regional Director Agreement</strong> with NLV Listings, including non-circumvention, 25% recurring commission terms, and territory exclusivity.{' '}
                    <Link to="/full-contracts" target="_blank" style={{ color: P, fontWeight: 600 }}>
                      Read full contract
                    </Link>
                  </p>
                </div>
              )}

              {/* Terms checkbox */}
              <div className="mb-6 px-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative flex items-center pt-0.5">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className="w-5 h-5 rounded border-2 transition-all flex items-center justify-center"
                      style={{
                        borderColor: acceptedTerms ? P : BORDER,
                        background: acceptedTerms ? P : 'transparent',
                      }}
                    >
                      {acceptedTerms && <HiCheck size={14} color="#fff" />}
                    </div>
                  </div>
                  <span className="text-[13px] leading-snug" style={{ color: OSV }}>
                    {isDirector ? (
                      <>
                        I agree to the{' '}
                        <Link to="/full-contracts"  target="_blank" className="font-semibold" style={{ color: P }}>Regional Director Agreement</Link>
                        ,{' '}
                        <Link to="/platform-rules"  target="_blank" className="font-semibold" style={{ color: P }}>Platform Rules</Link>
                        {' '}and{' '}
                        <Link to="/terms-of-service" target="_blank" className="font-semibold" style={{ color: P }}>Terms of Service</Link>.
                      </>
                    ) : (
                      <>
                        I agree to the{' '}
                        <Link to="/terms-of-service" target="_blank" className="font-semibold" style={{ color: P }}>Terms of Service</Link>
                        {' '}and{' '}
                        <Link to="/privacy-policy"   target="_blank" className="font-semibold" style={{ color: P }}>Privacy Policy</Link>.
                        {' '}I understand the{' '}
                        <Link to="/platform-rules"   target="_blank" className="font-semibold" style={{ color: P }}>Platform Rules</Link>
                        {' '}including the 180-day lead attribution policy.
                      </>
                    )}
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <HiArrowLeft size={15} /> Back
                </Button>
                <Button onClick={next} isLoading={loading} className="flex-1">
                  <HiRocketLaunch size={15} />
                  {isDirector ? 'Activate Account' : 'Start Free Trial'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm mt-6" style={{ color: OSV }}>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold no-underline transition-colors"
            style={{ color: P }}
            onMouseEnter={e => e.currentTarget.style.color = S}
            onMouseLeave={e => e.currentTarget.style.color = P}
          >
            Sign in
          </Link>
        </p>

        <div className="flex justify-center mt-5">
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
  );
}
