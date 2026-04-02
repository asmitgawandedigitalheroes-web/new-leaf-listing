import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  HiRocketLaunch 
} from 'react-icons/hi2';
import NLVLogo from '../../components/ui/NLVLogo';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

// NLV Brand Colors
const P   = '#D4AF37';
const PH  = '#B8962E';
const S   = '#1F4D3A';
const SCL = '#E8F3EE';
const OS  = '#111111';
const OSV = '#4B5563';
const LGRAY = '#6B7280';
const BORDER = '#E5E7EB';
const SURFBG = '#F9FAFB';

// Removed legacy Ico function

const STEPS = [
  { label: 'Account',     icon: HiUser },
  { label: 'Select Plan', icon: HiSparkles },
  { label: 'Confirm',     icon: HiCheckCircle },
];

function InputField({ label, type = 'text', placeholder, value, onChange, icon, required = true }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: OSV }}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <icon.component size={15} color={focused ? P : OSV} />
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
            e.currentTarget.style.borderColor = BORDER;
            e.currentTarget.style.boxShadow = '';
          }}
          className="w-full py-2.5 text-sm rounded-lg focus:outline-none"
          style={{
            paddingLeft: icon ? '36px' : '12px',
            paddingRight: '12px',
            border: `1px solid ${BORDER}`,
            background: '#fff',
            color: OS,
          }}
        />
      </div>
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const auth = useAuth();
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState({ name: '', email: '', password: '', company: '', role: 'realtor', plan: 'pro' });
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pricingPlans, setPricingPlans] = useState([]);

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

  const update = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  const next = async (e) => {
    e?.preventDefault();
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      if (!acceptedTerms) {
        addToast({ type: 'error', title: 'Action required', desc: 'Please agree to the Terms and Privacy Policy to continue.' });
        return;
      }
      setLoading(true);
      // BUG-008: role is NOT passed to signup — AuthContext enforces 'realtor'.
      const { error } = await auth.signup({
        email: form.email,
        password: form.password,
        full_name: form.name,
        company: form.company,
      });
      setLoading(false);
      if (error) {
        addToast({ type: 'error', title: 'Signup failed', desc: error.message });
        return;
      }
      addToast({ type: 'success', title: 'Account created!', desc: 'Welcome to New Leaf Listings.' });
      const role = auth.role;
      if (role === 'admin')         navigate('/admin/dashboard');
      else if (role === 'director') navigate('/director/dashboard');
      else                          navigate('/realtor/dashboard');
    }
  };

  const paidPlans = pricingPlans;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 md:px-6 py-8 md:py-12" style={{ background: SURFBG }}>
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <NLVLogo mode="light" size="md" />
        </div>

        {/* ── Step indicators ── */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: i < step ? S : i === step ? P : '#E8F3EE',
                    color: i <= step ? '#fff' : LGRAY,
                    boxShadow: i === step ? `0 0 0 3px rgba(212,175,55,0.2)` : 'none',
                  }}
                >
                  {i < step ? <HiCheck size={14} color="#fff" /> : <span>{i + 1}</span>}
                </div>
                <span
                  className="text-[12px] font-medium hidden sm:block"
                  style={{ color: i === step ? OS : i < step ? OSV : LGRAY }}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-10 h-px mx-3 flex-shrink-0"
                  style={{ background: i < step ? P : BORDER }}
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
          {/* Step 0 — Account details */}
          {step === 0 && (
            <form onSubmit={next} className="p-5 md:p-8">
              <h2 className="font-headline text-xl font-black mb-1" style={{ color: OS }}>Create your account</h2>
              <p className="text-sm mb-6" style={{ color: OSV }}>Start your 14-day free trial. No credit card required.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <InputField label="Full Name"          placeholder="John Smith"           value={form.name}     onChange={update('name')}    icon={{ component: HiIdentification }} />
                <InputField label="Company / Brokerage" placeholder="Acme Realty"         value={form.company}  onChange={update('company')} icon={{ component: HiBuildingOffice }} />
                <InputField label="Email Address"      type="email" placeholder="john@brokerage.com" value={form.email} onChange={update('email')} icon={{ component: HiEnvelope }} />
                <InputField label="Password"           type="password" placeholder="Min. 8 characters" value={form.password} onChange={update('password')} icon={{ component: HiLockClosed }} />
              </div>

              {/* Role */}
              <div className="mb-6">
                <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: OSV }}>
                  Your Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'realtor',  label: 'Realtor',           icon: HiHomeModern },
                  ].map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, role: r.value }))}
                      className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                      style={{
                        border: form.role === r.value ? `1.5px solid ${P}` : `1px solid ${BORDER}`,
                        background: form.role === r.value ? SCL : '#fff',
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: form.role === r.value ? SCL : SURFBG }}
                      >
                        <r.icon size={16} color={form.role === r.value ? P : OSV} />
                      </div>
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: form.role === r.value ? S : OS }}
                      >
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
              >
                Continue <HiArrowRight size={16} />
              </Button>
            </form>
          )}

          {/* Step 1 — Select Plan */}
          {step === 1 && (
            <div className="p-5 md:p-8">
              <h2 className="font-headline text-xl font-black mb-1" style={{ color: OS }}>Choose a plan</h2>
              <p className="text-sm mb-6" style={{ color: OSV }}>You can change this anytime. 14-day free trial included.</p>

              <div className="flex flex-col gap-3 mb-6">
                {paidPlans.map(plan => (
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
                    {/* Radio */}
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
                        <span className="font-bold text-sm" style={{ color: '#D4AF37' }}>
                          {plan.price}<span className="text-[11px] font-normal" style={{ color: LGRAY }}>/mo</span>
                        </span>
                      </div>
                      <p className="text-[12px]" style={{ color: OSV }}>{plan.description}</p>
                    </div>

                    {plan.highlighted && (
                      <div
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: SCL, color: S }}
                      >
                        Popular
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="flex-1"
                >
                  <HiArrowLeft size={15} /> Back
                </Button>
                <Button
                  onClick={next}
                  className="flex-1"
                >
                  Continue <HiArrowRight size={15} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Confirm */}
          {step === 2 && (
            <div className="p-5 md:p-8">
              <h2 className="font-headline text-xl font-black mb-1" style={{ color: OS }}>Review & Confirm</h2>
              <p className="text-sm mb-6" style={{ color: OSV }}>Your 14-day free trial starts today. Cancel anytime.</p>

              <div
                className="rounded-xl mb-6 overflow-hidden"
                style={{ border: `1px solid ${BORDER}` }}
              >
                {[
                  { icon: HiIdentification,   label: 'Name',    value: form.name },
                  { icon: HiEnvelope,         label: 'Email',   value: form.email },
                  { icon: HiBuildingOffice,   label: 'Company', value: form.company },
                  { icon: HiHomeModern,       label: 'Role',    value: form.role },
                  { icon: HiSparkles,         label: 'Plan',    value: form.plan },
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
                    <span
                      className="text-[11px] uppercase tracking-widest font-semibold flex-shrink-0 w-20"
                      style={{ color: LGRAY }}
                    >
                      {r.label}
                    </span>
                    <span className="text-sm font-medium capitalize" style={{ color: OS }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Trial notice */}
              <div
                className="flex items-start gap-3 p-4 rounded-xl mb-6"
                style={{ background: SCL, border: `1px solid rgba(212,175,55,0.3)` }}
              >
                <HiCheckBadge size={18} color={P} />
                <p className="text-[12px] leading-relaxed" style={{ color: S }}>
                  <strong>14-day free trial</strong> included — no charges until your trial ends. Cancel anytime from account settings.
                </p>
              </div>

              {/* Terms Checkbox */}
              <div className="mb-6 px-1">
                <label className="flex items-start gap-3 cursor-pointer group">
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
                        background: acceptedTerms ? P : 'transparent'
                      }}
                    >
                      {acceptedTerms && <HiCheck size={14} color="#fff" />}
                    </div>
                  </div>
                  <span className="text-[13px] leading-snug" style={{ color: OSV }}>
                    I agree to the{' '}
                    <Link to="/terms-of-service" target="_blank" className="font-semibold transition-colors" style={{ color: P }} onMouseEnter={e => e.currentTarget.style.color = S} onMouseLeave={e => e.currentTarget.style.color = P}>Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy-policy" target="_blank" className="font-semibold transition-colors" style={{ color: P }} onMouseEnter={e => e.currentTarget.style.color = S} onMouseLeave={e => e.currentTarget.style.color = P}>Privacy Policy</Link>.
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <HiArrowLeft size={15} /> Back
                </Button>
                <Button
                  onClick={next}
                  isLoading={loading}
                  className="flex-1"
                >
                  <HiRocketLaunch size={15} />
                  Start Free Trial
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
