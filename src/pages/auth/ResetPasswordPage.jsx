import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLockClosed, HiEye, HiEyeSlash, HiCheckCircle, HiArrowLeft } from 'react-icons/hi2';
import NLVLogo from '../../components/ui/NLVLogo';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';

const P   = '#D4AF37';
const S   = '#1F4D3A';
const OS  = '#111111';
const OSV = '#4B5563';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [ready, setReady]             = useState(false);

  // Listen for the PASSWORD_RECOVERY event emitted by Supabase when the user
  // arrives via the reset-password email link.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      addToast({ type: 'warning', title: 'Password too short', desc: 'Password must be at least 8 characters.' });
      return;
    }
    if (password !== confirm) {
      addToast({ type: 'error', title: 'Passwords do not match', desc: 'Please make sure both passwords are identical.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      addToast({ type: 'error', title: 'Reset failed', desc: error.message });
    } else {
      setDone(true);
      addToast({ type: 'success', title: 'Password updated', desc: 'Your new password has been saved. Please sign in.' });
      setTimeout(() => navigate('/login'), 2500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#F9FAFB' }}>
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-10">
          <NLVLogo mode="light" size="md" />
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: '#fff', boxShadow: '0 4px 24px rgba(26,32,44,0.07)', border: '1px solid #E5E7EB' }}
        >
          {done ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <HiCheckCircle size={52} color="#22C55E" />
              <h2 className="font-headline text-xl font-black" style={{ color: OS }}>Password updated!</h2>
              <p className="text-sm" style={{ color: OSV }}>Redirecting you to sign in…</p>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <HiLockClosed size={40} color={P} />
              <h2 className="font-headline text-xl font-black" style={{ color: OS }}>Waiting for reset link</h2>
              <p className="text-sm" style={{ color: OSV }}>
                Please open this page from the link in your reset email.
                If you arrived here directly, go back and request a new reset link.
              </p>
              <Button variant="outline" onClick={() => navigate('/login')}>
                <HiArrowLeft size={15} /> Back to Sign In
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="font-headline text-2xl font-black mb-1.5" style={{ color: OS }}>Set new password</h1>
                <p className="text-sm" style={{ color: OSV }}>Choose a strong password for your account.</p>
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
                      onFocus={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.12)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = ''; }}
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
                      onFocus={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.12)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = ''; }}
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
                  Update Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
