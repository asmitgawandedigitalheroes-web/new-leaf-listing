import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HiClock, HiEnvelope, HiArrowRightOnRectangle, HiCheckCircle, HiCreditCard, HiArrowPath } from 'react-icons/hi2';
import NLVLogo from '../../components/ui/NLVLogo';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const P     = '#D4AF37';
const S     = '#1F4D3A';
const SCL   = '#E8F3EE';
const OS    = '#111111';
const OSV   = '#4B5563';
const LGRAY = '#6B7280';
const BORDER = '#E5E7EB';

export default function PendingApprovalPage() {
  const navigate = useNavigate();
  const { profile, role, user, logout } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError]     = useState('');

  const pendingPlan = localStorage.getItem('nlv_pending_plan') || 'pro';
  const isRealtorPending = role === 'realtor' && profile?.status === 'pending';

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planKey: pendingPlan,
          userId: user?.id,
          userEmail: user?.email || profile?.email,
          invitedFlow: true,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || 'No checkout URL returned');
      localStorage.removeItem('nlv_pending_plan');
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err.message);
      setCheckoutLoading(false);
    }
  };

  // Realtime listener: redirect to dashboard when admin approves
  useEffect(() => {
    if (!profile?.id) return;

    // If already active (e.g., admin approved before page loaded), redirect now
    if (profile?.status === 'active') {
      navigate('/realtor/dashboard', { replace: true });
      return;
    }

    const channel = supabase
      .channel(`profile-status-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.new?.status === 'active') {
            navigate('/realtor/dashboard', { replace: true });
          } else if (payload.new?.status === 'suspended') {
            navigate('/onboarding/suspended', { replace: true });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.status, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#F9FAFB' }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <NLVLogo mode="light" size="md" />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: '#fff', border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(26,32,44,0.07)' }}
        >
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: isRealtorPending ? `${P}18` : `${P}18` }}
          >
            {isRealtorPending ? <HiCreditCard size={32} color={P} /> : <HiClock size={32} color={P} />}
          </div>

          <h1 className="text-2xl font-black mb-2" style={{ color: OS }}>
            {isRealtorPending ? 'One Last Step' : 'Application Under Review'}
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: OSV }}>
            {isRealtorPending
              ? 'Your account is ready. Subscribe to a plan to activate full platform access.'
              : 'Your account has been created and is pending approval from our team. You\'ll be notified and automatically redirected once approved.'
            }
          </p>

          {/* Profile summary */}
          {profile && (
            <div
              className="rounded-xl overflow-hidden mb-6 text-left"
              style={{ border: `1px solid ${BORDER}` }}
            >
              {[
                { label: 'Name',      value: profile.full_name || '—' },
                { label: 'Email',     value: profile.email },
                { label: 'Company',   value: profile.company || '—' },
                { label: 'Location',  value: [profile.city, profile.state, profile.country].filter(Boolean).join(', ') || '—' },
                { label: 'Status',    value: 'Pending Approval' },
              ].map(({ label, value }, i) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: i < 4 ? `1px solid ${BORDER}` : 'none' }}
                >
                  <span className="text-[10px] uppercase tracking-widest font-semibold w-16 flex-shrink-0" style={{ color: LGRAY }}>{label}</span>
                  <span className="text-sm font-medium" style={{ color: label === 'Status' ? '#D97706' : OS }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* What happens next */}
          <div
            className="rounded-xl p-4 mb-6 text-left"
            style={{ background: SCL, border: `1px solid rgba(31,77,58,0.15)` }}
          >
            <p className="text-[11px] font-black uppercase tracking-wider mb-3" style={{ color: S }}>
              {isRealtorPending ? 'How it works' : 'What happens next'}
            </p>
            <div className="flex flex-col gap-2">
              {(isRealtorPending ? [
                'Click "Subscribe & Activate" to complete payment via Stripe',
                'Your account activates immediately after payment',
                'Access your full dashboard, listings, and leads',
              ] : [
                'Our team reviews your application (typically within 1 business day)',
                'You receive an email notification when approved',
                'This page will automatically redirect you to your dashboard',
              ]).map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <HiCheckCircle size={14} color={S} style={{ marginTop: 2, flexShrink: 0 }} />
                  <p className="text-[12px] leading-relaxed" style={{ color: '#2D5A4A' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Subscribe CTA for pending realtors */}
          {isRealtorPending && (
            <div className="mb-4">
              <button
                onClick={handleSubscribe}
                disabled={checkoutLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all"
                style={{ background: checkoutLoading ? '#F9FAFB' : P, color: checkoutLoading ? LGRAY : '#fff', border: 'none', cursor: checkoutLoading ? 'wait' : 'pointer' }}
              >
                {checkoutLoading
                  ? <><HiArrowPath size={16} style={{ animation: 'spin 1s linear infinite' }} /> Redirecting to payment…</>
                  : <><HiCreditCard size={16} /> Subscribe & Activate</>
                }
              </button>
              {checkoutError && (
                <p className="text-[11px] text-red-500 mt-2 text-center">{checkoutError}</p>
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <a
              href="mailto:support@nlvlistings.com"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
              style={{ background: SCL, color: S, border: `1px solid rgba(31,77,58,0.2)` }}
            >
              <HiEnvelope size={15} />
              Contact Support
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
              style={{ color: LGRAY, background: 'transparent' }}
            >
              <HiArrowRightOnRectangle size={15} />
              Sign out
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: LGRAY }}>
          Questions?{' '}
          <Link to="/contact" style={{ color: P, fontWeight: 600 }}>Contact us</Link>
        </p>
      </div>
    </div>
  );
}
