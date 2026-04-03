import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import { 
  HiLockClosed, 
  HiEye, 
  HiEyeSlash, 
  HiArrowLeft,
  HiCheckCircle
} from 'react-icons/hi2';

const P      = '#D4AF37';
const OS     = '#111111';
const OSV    = '#6B7280';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  
  // Detect if this is an invitation link (sent via admin-create-user)
  const isInvite = searchParams.get('type') === 'invite' || window.location.hash.includes('type=invite');
  // Detect admin-created invite: user must subscribe before accessing dashboard
  const isAdminInvite = isInvite && (searchParams.get('source') === 'admin' || window.location.hash.includes('source=admin'));

  useEffect(() => {
    // Supabase sends a recovery or invite link that contains an access_token in the hash.
    // The supabase-js client automatically picks this up, but we want to make sure 
    // the user is actually in a "reset password" session.
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    // Fallback check: if hash has access_token, we're likely ready
    if (window.location.hash.includes('access_token')) {
      setReady(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      addToast({ type: 'error', title: 'Mismatch', desc: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      addToast({ type: 'error', title: 'Update failed', desc: error.message });
      setLoading(false);
    } else {
      if (isInvite && data?.user) {
        if (isAdminInvite) {
          // Admin invite: keep status="pending" — the Stripe webhook activates the
          // account after the user completes checkout (including 14-day trial start).
          // Do NOT set verified_at here; the webhook stamps it after subscription.
          // Nothing to update — profile was created with status="pending" already.
        } else {
          // Director/self invite: activate immediately (no payment required).
          await supabase
            .from('profiles')
            .update({ status: 'active', verified_at: new Date().toISOString() })
            .eq('id', data.user.id);
        }
      }

      setSuccess(true);
      addToast({
        type: 'success',
        title: isAdminInvite ? 'Password created!' : isInvite ? 'Account Activated' : 'Password Updated',
        desc: isAdminInvite
          ? 'Now choose a subscription plan to activate your account. Your 14-day free trial starts immediately.'
          : 'Your security credentials have been updated.',
      });

      // Auto redirect
      setTimeout(() => {
        if (isAdminInvite) {
          // Send to public pricing page so user can subscribe
          navigate('/pricing?invited=true');
        } else {
          const role = data?.user?.user_metadata?.role || 'realtor';
          navigate(`/app/${role}`);
        }
      }, 2500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
            <span className="text-2xl font-black italic tracking-tighter text-[#D4AF37]">NLV</span>
          </div>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E5E7EB] rounded-2xl mx-4 sm:mx-0">
          
          {success ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <HiCheckCircle size={52} color="#22C55E" />
              <h2 className="font-headline text-xl font-black" style={{ color: OS }}>
                {isAdminInvite ? 'Password created!' : 'Password updated!'}
              </h2>
              <p className="text-sm" style={{ color: OSV }}>
                {isAdminInvite
                  ? 'Redirecting you to choose your subscription plan…'
                  : 'Redirecting you to your dashboard…'}
              </p>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <HiLockClosed size={40} color={P} />
              <h2 className="font-headline text-xl font-black" style={{ color: OS }}>Waiting for session</h2>
              <p className="text-sm" style={{ color: OSV }}>
                Please open this page from the link in your invitation or reset email.
              </p>
              <Button variant="outline" onClick={() => navigate('/login')}>
                <HiArrowLeft size={15} /> Back to Sign In
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="font-headline text-2xl font-black mb-1.5" style={{ color: OS }}>
                  {isAdminInvite ? 'Welcome to NLV Listings' : isInvite ? 'Create your password' : 'Set new password'}
                </h1>
                <p className="text-sm" style={{ color: OSV }}>
                  {isAdminInvite
                    ? 'Step 1 of 2 — Create a password, then choose your subscription plan.'
                    : 'Choose a strong password for your account.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* New Password */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: OSV }}>
                    New Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <HiLockClosed size={16} color={OSV} />
                    </span>
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg focus:outline-none"
                      style={{ border: '1px solid #E5E7EB', background: '#fff', color: OS }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPw(v => !v)}
                    >
                      {showPw ? <HiEyeSlash size={16} color={OSV} /> : <HiEye size={16} color={OSV} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: OSV }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <HiLockClosed size={16} color={OSV} />
                    </span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg focus:outline-none"
                      style={{ border: '1px solid #E5E7EB', background: '#fff', color: OS }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setShowConfirm(v => !v)}
                    >
                      {showConfirm ? <HiEyeSlash size={16} color={OSV} /> : <HiEye size={16} color={OSV} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" isLoading={loading} fullWidth size="lg" className="mt-1">
                  {isInvite ? 'Activate Account' : 'Update Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
