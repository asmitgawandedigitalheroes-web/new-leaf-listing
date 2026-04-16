import { useState, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import { APP_URL } from '../../../utils/appUrl';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import { HiCheckCircle, HiClock, HiLockClosed } from 'react-icons/hi2';

const PLAN_STYLES = {
  starter:   { bg: '#F3F4F6', text: '#4B5563', price: '$9/mo' },
  pro:       { bg: 'rgba(212,175,55,0.12)', text: '#B8962E', price: '$29/mo' },
  dominator: { bg: '#EDE9FE', text: '#5B21B6', price: '$79/mo' },
  // OBS-003: Aligned to "Contact Sales" to match PricingPage (was $199/mo)
  sponsor:   { bg: '#DBEAFE', text: '#1D4ED8', price: 'Contact Sales' },
};

export default function RealtorProfilePage() {
  const { profile, subscription, updateProfile, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({ full_name: '', phone: '', company: '', city: '', state: '', license_number: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  // BUG-006: Security / password-change state
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [isSavingPw, setIsSavingPw] = useState(false);

  // Sync form with profile once loaded
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        company: profile.company || '',
        city: profile.city || '',
        state: profile.state || '',
        license_number: profile.license_number || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      addToast({ type: 'error', title: 'Name required', desc: 'Please enter your full name.' });
      return;
    }
    if (!form.phone.trim()) {
      addToast({ type: 'error', title: 'Phone required', desc: 'Please enter your phone number.' });
      return;
    }
    setIsSaving(true);
    const { error } = await updateProfile(form);
    setIsSaving(false);
    if (error) {
      addToast({ type: 'error', title: 'Save failed', desc: error.message });
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleReset = () => {
    if (profile) setForm({ 
      full_name: profile.full_name || '', 
      phone: profile.phone || '',
      company: profile.company || '',
      city: profile.city || '',
      state: profile.state || '',
      license_number: profile.license_number || '',
    });
  };

  const initials = profile?.full_name
    ? profile.full_name.trim().split(' ').filter(Boolean).length >= 2
      ? (profile.full_name.split(' ')[0][0] + profile.full_name.split(' ').at(-1)[0]).toUpperCase()
      : profile.full_name.slice(0, 2).toUpperCase()
    : 'R?';

  const planKey = subscription?.plan || null;
  const planStyle = PLAN_STYLES[planKey] || null;

  const referralCode = profile?.full_name
    ? profile.full_name.toUpperCase().replace(/\s+/g, '_').slice(0, 20)
    : (profile?.id?.slice(0, 8) || 'MY_REF');
  const referralLink = `${APP_URL}/join?ref=${referralCode}`;

  const handlePasswordChange = async () => {
    const errors = {};
    if (!pwForm.newPassword) errors.newPassword = 'New password is required.';
    else if (pwForm.newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters.';
    if (!pwForm.confirmPassword) errors.confirmPassword = 'Please confirm your new password.';
    else if (pwForm.newPassword !== pwForm.confirmPassword) errors.confirmPassword = 'Passwords do not match.';

    setPwErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    setIsSavingPw(false);

    if (error) {
      addToast({ type: 'error', title: 'Password update failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Password updated', desc: 'Your password has been changed successfully.' });
      setPwForm({ newPassword: '', confirmPassword: '' });
      setPwErrors({});
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

  return (
    <AppLayout role="realtor" title="My Profile">
      <div className="p-4 md:p-6 flex flex-col gap-6 max-w-3xl mx-auto">

        {/* Profile Photo + Basic Info */}
        <SectionCard title="Profile">
          <div className="px-6 py-5 flex flex-col gap-5">

            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative">
                {authLoading ? (
                  <Skeleton variant="circle" width="80px" height="80px" />
                ) : (
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-black">{initials}</span>
                    )}
                  </div>
                )}
              </div>
              <div>
                {authLoading ? (
                  <>
                    <Skeleton width="120px" height="20px" className="mb-2" />
                    <Skeleton width="180px" height="14px" className="mb-1" />
                    <Skeleton width="140px" height="12px" />
                  </>
                ) : (
                  <>
                    <div className="font-bold text-gray-900 text-lg">{profile?.full_name || 'Realtor'}</div>
                    <div className="text-sm text-gray-400">{profile?.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5 capitalize">
                      {profile?.role || 'Realtor'} · {profile?.status || 'active'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Form fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              {authLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i}>
                    <Skeleton width="60px" height="10px" className="mb-2" />
                    <Skeleton width="100%" height="38px" />
                  </div>
                ))
              ) : (
                <>
                  <div>
                    <label className={labelClass}>Full Name</label>
                    <input
                      value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      className={inputClass}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      value={profile?.email || ''}
                      readOnly
                      className={inputClass + ' bg-gray-50 cursor-not-allowed text-gray-400'}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '').slice(0, 20) }))}
                      className={inputClass}
                      placeholder="(555) 000-0000"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Company / Brokerage</label>
                    <input
                      value={form.company}
                      onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                      className={inputClass}
                      placeholder="e.g. Century 21"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      className={inputClass}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <input
                      value={form.state}
                      onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                      className={inputClass}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>License Number</label>
                    <input
                      value={form.license_number}
                      onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                      className={inputClass}
                      placeholder="e.g. RE-123456"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Territory</label>
                    <div className={inputClass + ' bg-gray-50 text-gray-700 flex items-center min-h-[38px]'}>
                      {profile?.territory 
                        ? `${profile.territory.city}, ${profile.territory.state}` 
                        : (profile?.city || 'Not assigned')}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Set by your Director. Contact them to change.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Account Info */}
        <SectionCard title="Account">
          <div className="px-6 py-5">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Status</span>
                <span className="font-medium capitalize">{profile?.status || 'active'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Role</span>
                <span className="font-medium capitalize">{profile?.role || 'realtor'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Member Since</span>
                <span className="font-medium">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Verified</span>
                <span className="font-medium flex items-center gap-1">
                  {profile?.verified_at
                    ? <><HiCheckCircle className="w-4 h-4 text-green-600" /> Yes</>
                    : <><HiClock className="w-4 h-4 text-yellow-500" /> Pending</>}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Subscription */}
        <SectionCard title="Subscription">
          <div className="px-6 py-5 flex flex-col gap-4">
            {planStyle ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">Current Plan</div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {subscription?.status === 'active' ? 'Active subscription' : `Status: ${subscription?.status}`}
                      {subscription?.current_period_end && (
                        <> · Renews {new Date(subscription.current_period_end).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full font-semibold text-sm capitalize"
                    style={{ background: planStyle.bg, color: planStyle.text }}>
                    {planKey} — {planStyle.price}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-3">No active subscription</p>
                <Button variant="primary" onClick={() => window.location.href = '/realtor/billing'}>
                  View Plans
                </Button>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Referral */}
        <SectionCard title="NLV Referral Program">
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg font-mono text-sm text-gray-700 border border-gray-200 truncate">
                {referralLink}
              </div>
              <Button variant={referralCopied ? 'green' : 'primary'} onClick={handleCopy}>
                {referralCopied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Earn commission when someone signs up through your referral link and activates a paid plan.
            </p>
          </div>
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security">
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <HiLockClosed className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Change Password</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>New Password</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={e => { setPwForm(f => ({ ...f, newPassword: e.target.value })); setPwErrors(ev => ({ ...ev, newPassword: '' })); }}
                  className={inputClass + (pwErrors.newPassword ? ' border-red-400' : '')}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                {pwErrors.newPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.newPassword}</p>}
              </div>
              <div>
                <label className={labelClass}>Confirm Password</label>
                <input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={e => { setPwForm(f => ({ ...f, confirmPassword: e.target.value })); setPwErrors(ev => ({ ...ev, confirmPassword: '' })); }}
                  className={inputClass + (pwErrors.confirmPassword ? ' border-red-400' : '')}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
                {pwErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.confirmPassword}</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handlePasswordChange} isLoading={isSavingPw}>
                Update Password
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Save */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={handleReset} disabled={authLoading || isSaving}>Reset</Button>
          <Button
            variant={saved ? 'green' : 'primary'}
            onClick={handleSave}
            isLoading={isSaving}
            disabled={authLoading}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

      </div>
    </AppLayout>
  );
}
