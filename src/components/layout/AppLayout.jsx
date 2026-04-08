import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../context/AuthContext';
import { HiExclamationTriangle, HiCreditCard, HiLockClosed } from 'react-icons/hi2';

const TRIAL_DAYS = 14;

function isTrialExpiredOrPastDue(subscription) {
  if (!subscription) return false;
  if (subscription.status === 'past_due') return true;
  if (subscription.status === 'trialing') {
    const endTs = subscription.next_billing_date
      ? new Date(subscription.next_billing_date).getTime()
      : new Date(subscription.created_at).getTime() + TRIAL_DAYS * 86400000;
    return Date.now() > endTs;
  }
  return false;
}

function PanelLockedOverlay({ isPastDue, onPay }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(17, 24, 39, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '40px 36px',
        maxWidth: 440, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
          background: 'rgba(220,38,38,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <HiLockClosed size={28} color="#DC2626" />
        </div>

        {/* Badge */}
        <span style={{
          display: 'inline-block', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '4px 12px', borderRadius: 99,
          background: 'rgba(220,38,38,0.08)', color: '#DC2626',
          marginBottom: 14,
        }}>
          {isPastDue ? 'Payment Overdue' : 'Free Trial Ended'}
        </span>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 10 }}>
          {isPastDue ? 'Your account is paused' : 'Your free trial has ended'}
        </h2>

        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 28 }}>
          {isPastDue
            ? 'We were unable to process your payment. Please update your payment method to restore full access to your panel.'
            : 'Your 14-day free trial is over. Activate a plan to continue posting listings, managing leads, and growing your business.'}
        </p>

        {/* Feature list */}
        <div style={{
          background: '#F9FAFB', borderRadius: 12, padding: '14px 18px',
          marginBottom: 24, textAlign: 'left',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Restore access to:
          </p>
          {['Post & manage listings', 'Receive and manage leads', 'Track commissions', 'Access realtor dashboard'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4AF37', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onPay}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 12,
            background: '#DC2626', color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(220,38,38,0.35)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#B91C1C'}
          onMouseLeave={e => e.currentTarget.style.background = '#DC2626'}
        >
          <HiCreditCard size={16} />
          {isPastDue ? 'Update Payment Method' : 'Activate Your Plan'}
        </button>

        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 14 }}>
          Need help? Contact <a href="mailto:support@nlvlistings.com" style={{ color: '#D4AF37' }}>support@nlvlistings.com</a>
        </p>
      </div>
    </div>
  );
}

export default function AppLayout({ role, title, user: userProp, children }) {
  const { profile, role: authRole, subscription } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Build display user — props take precedence, fall back to AuthContext
  const resolvedRole = role || authRole || 'realtor';
  const resolvedUser = userProp || (profile ? {
    name: profile.full_name || profile.email || 'User',
    role: profile.role || resolvedRole,
    initials: (() => {
        const name = profile.full_name || 'U';
        const parts = name.trim().split(' ').filter(Boolean);
        return parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase();
      })(),
  } : undefined);

  // DEV-only: allow ?__trial=expired|pastdue to test the lock screen
  const devParam = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get('__trial')
    : null;
  const devSub = devParam === 'expired' ? { status: 'trialing', created_at: new Date(Date.now() - 20 * 86400000).toISOString() }
               : devParam === 'pastdue' ? { status: 'past_due',  created_at: new Date(Date.now() - 30 * 86400000).toISOString() }
               : null;

  const effectiveSub = devSub ?? subscription;
  const locked = resolvedRole === 'realtor' && isTrialExpiredOrPastDue(effectiveSub);
  const isPastDue = effectiveSub?.status === 'past_due';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F9FAFB' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40
        transition-transform duration-300
        md:translate-x-0 md:flex md:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar role={resolvedRole} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Topbar
          title={title}
          user={resolvedUser}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {children}
        </main>
      </div>

      {/* Full-page lock overlay — shown when realtor trial expired or payment overdue */}
      {locked && (
        <PanelLockedOverlay
          isPastDue={isPastDue}
          onPay={() => navigate('/realtor/billing')}
        />
      )}
    </div>
  );
}
