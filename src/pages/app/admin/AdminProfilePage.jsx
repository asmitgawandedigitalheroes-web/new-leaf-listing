import { useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import {
  HiUserCircle,
  HiEnvelope,
  HiShieldCheck,
  HiExclamationTriangle,
} from 'react-icons/hi2';

const P      = '#D4AF37';
const S      = '#1F4D3A';
const OS     = '#111111';
const OSV    = '#4B5563';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: LGRAY, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 bg-white disabled:bg-gray-50 disabled:text-gray-400"
    />
  );
}

// Confirmation dialog before email change
function EmailConfirmModal({ open, newEmail, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HiExclamationTriangle size={22} color="#D97706" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: OS }}>Confirm Email Change</h3>
        </div>
        <p style={{ fontSize: 13, color: OSV, lineHeight: 1.6, marginBottom: 8 }}>
          You are about to change your email to:
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: OS, background: '#F9FAFB', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
          {newEmail}
        </p>
        <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 20, lineHeight: 1.5 }}>
          ⚠ You will be logged out after this change. A confirmation link will be sent to the new address.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: OSV, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding: '8px 20px', borderRadius: 8, background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Confirm & Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProfilePage() {
  useDocumentTitle('Admin Profile');
  const { profile, user, updateProfile, logout } = useAuth();
  const { addToast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.display_name || profile?.full_name || '');
  const [email, setEmail]             = useState(profile?.email || user?.email || '');
  const [savingName, setSavingName]   = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      addToast({ type: 'error', title: 'Name required', desc: 'Display name cannot be empty.' });
      return;
    }
    setSavingName(true);
    const { error } = await updateProfile({
      display_name: displayName.trim(),
      full_name:    displayName.trim(),
    });
    setSavingName(false);
    addToast(error
      ? { type: 'error', title: 'Save failed', desc: error.message }
      : { type: 'success', title: 'Name updated', desc: 'Your display name has been saved.' });
  };

  const handleEmailChangeRequest = () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^@]+@[^@]+\.[^@]+$/.test(trimmed)) {
      addToast({ type: 'error', title: 'Invalid email', desc: 'Please enter a valid email address.' });
      return;
    }
    if (trimmed === (user?.email || '')) {
      addToast({ type: 'info', title: 'No change', desc: 'The email address is the same as current.' });
      return;
    }
    setShowEmailConfirm(true);
  };

  const handleConfirmEmailChange = async () => {
    setShowEmailConfirm(false);
    // Update Supabase Auth email — sends confirmation to the new address
    const { error: authErr } = await supabase.auth.updateUser({ email: email.trim() });
    if (authErr) {
      addToast({ type: 'error', title: 'Email update failed', desc: authErr.message });
      return;
    }
    // Also update profiles table
    await supabase.from('profiles').update({ email: email.trim() }).eq('id', user.id);
    addToast({ type: 'success', title: 'Confirmation sent', desc: 'Check the new email address for a confirmation link. You will be logged out now.' });
    setTimeout(() => logout(), 2500);
  };

  return (
    <AppLayout role="admin" title="Admin Profile">
      <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: OS, marginBottom: 4 }}>Admin Profile</h1>
          <p style={{ fontSize: 13, color: LGRAY }}>Update your display name and email address.</p>
        </div>

        {/* Current identity summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${P}, ${S})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
            {(profile?.full_name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: OS }}>{profile?.display_name || profile?.full_name || 'Admin'}</div>
            <div style={{ fontSize: 13, color: LGRAY }}>{user?.email || profile?.email}</div>
            <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700, background: '#EDE9FE', color: '#5B21B6', borderRadius: 20, padding: '2px 10px' }}>
              {profile?.is_super_admin ? 'Super Admin' : 'Admin'}
            </span>
          </div>
        </div>

        {/* Display name card */}
        <SectionCard title="Display Name">
          <div style={{ padding: '20px 24px' }}>
            <Field label="Display Name" hint="Shown throughout the platform and in the sidebar.">
              <TextInput
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. John Smith"
              />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="gold" onClick={handleSaveName} isLoading={savingName}>
                Save Name
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Email card */}
        <SectionCard title="Email Address">
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FCD34D', marginBottom: 18 }}>
              <HiExclamationTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                Changing your email will log you out. You must confirm the new address via email before you can log back in.
              </p>
            </div>
            <Field label="New Email Address">
              <TextInput
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={handleEmailChangeRequest}>
                <HiEnvelope size={15} style={{ marginRight: 6 }} />
                Update Email
              </Button>
            </div>
          </div>
        </SectionCard>

      </div>

      <EmailConfirmModal
        open={showEmailConfirm}
        newEmail={email.trim()}
        onConfirm={handleConfirmEmailChange}
        onCancel={() => setShowEmailConfirm(false)}
      />
    </AppLayout>
  );
}
