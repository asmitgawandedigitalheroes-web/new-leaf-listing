import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../context/ToastContext';
import { APP_URL } from '../../../utils/appUrl';
import { useAuth } from '../../../context/AuthContext';
// Note: Using local sendInviteEmailImpl function instead of external import
import {
  HiUserPlus,
  HiLink,
  HiClipboardDocumentList,
  HiCheck,
  HiArrowPath,
  HiMap,
  HiEnvelope,
  HiIdentification,
  HiUserGroup,
  HiCheckBadge,
  HiXMark,
  HiPaperAirplane,
} from 'react-icons/hi2';

const P      = '#D4AF37';
const S      = '#1F4D3A';
const SCL    = '#E8F3EE';
const OS     = '#111111';
const OSV    = '#4B5563';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';

// ── 64-char secure random token ────────────────────────────────────────────
function generateInviteToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Email sending via send-email edge function ──────────────────────────────
function buildInviteEmailHtml({ fullName, role, inviteUrl, isDetailedInvite }) {
  const roleLabel = role === 'director' ? 'Regional Director' : 'Realtor';
  const greeting  = fullName ? `Hi ${fullName},` : 'Hi there,';
  const action    = isDetailedInvite
    ? 'Click the button below to set your password and activate your account immediately — no approval needed.'
    : 'Click the button below to create your account. Your role and territory are already pre-assigned — just fill in your details.';

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#1F4D3A;padding:28px 32px;text-align:center;">
          <span style="color:#D4AF37;font-size:22px;font-weight:900;letter-spacing:-0.5px;">NLV Listings</span>
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:15px;color:#111;">${greeting}</p>
          <p style="margin:0 0 20px;font-size:14px;color:#4B5563;line-height:1.6;">
            You've been invited to join <strong>NLV Listings</strong> as a <strong>${roleLabel}</strong>.
          </p>
          <p style="margin:0 0 28px;font-size:14px;color:#4B5563;line-height:1.6;">${action}</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td align="center" style="background:#D4AF37;border-radius:10px;">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;color:#111;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
                ${isDetailedInvite ? 'Set Password & Activate Account' : 'Create Your Account'}
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;">Or copy this link:</p>
          <p style="margin:0 0 28px;font-size:11px;color:#6B7280;word-break:break-all;background:#F3F4F6;padding:10px 14px;border-radius:8px;">${inviteUrl}</p>
          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
            This link expires in <strong>7 days</strong> and can only be used once.<br/>
            Questions? Email <a href="mailto:support@nlvlistings.com" style="color:#1F4D3A;">support@nlvlistings.com</a>
          </p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:18px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">© NLV Listings — Premium Real Estate Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendInviteEmailImpl({ to, fullName, role, inviteUrl, isDetailedInvite }) {
  const roleLabel = role === 'director' ? 'Regional Director' : 'Realtor';
  const subject   = isDetailedInvite
    ? `You've been invited to join NLV Listings as a ${roleLabel}`
    : `Your invite to join NLV Listings as a ${roleLabel}`;

  const html = buildInviteEmailHtml({ fullName, role, inviteUrl, isDetailedInvite });

  // Refresh session to ensure the access token is valid before calling the edge function
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    console.warn('[sendInviteEmail] Session refresh failed, proceeding with current token:', refreshError.message);
  }

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, html },
  });

  if (error) {
    console.error('[sendInviteEmail] Edge Function error:', error);
    return { sent: false, error: error.message };
  }
  if (data?.error) return { sent: false, error: data.error };
  return { sent: true, error: null };
}

// ── Shared: territory select + role select helpers ──────────────────────────
function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: OSV, display: 'block', marginBottom: 6 }}>
      {children}
    </label>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{msg}</p>;
}

function CopyBox({ url, copied, onCopy, note }) {
  if (!url) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <FieldLabel>Generated Link</FieldLabel>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        border: `1px solid ${BORDER}`, borderRadius: 8,
        background: '#F9FAFB', padding: '10px 12px',
      }}>
        <span style={{ fontSize: 12, color: OSV, flex: 1, wordBreak: 'break-all', lineHeight: 1.6 }}>
          {url}
        </span>
        <button
          onClick={onCopy}
          style={{
            flexShrink: 0, padding: '6px 12px', borderRadius: 6, border: 'none',
            background: copied ? S : P, color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
          }}
        >
          {copied ? <><HiCheck size={13} /> Copied</> : <>Copy</>}
        </button>
      </div>
      {note && <p style={{ fontSize: 11, color: LGRAY, marginTop: 6, lineHeight: 1.5 }}>{note}</p>}
    </div>
  );
}

function HowItWorks({ steps, footer }) {
  return (
    <div style={{ background: SCL, borderRadius: 16, padding: 28, border: `1px solid rgba(31,77,58,0.15)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${S}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HiClipboardDocumentList size={20} color={S} />
        </div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: S, margin: 0 }}>How It Works</h2>
      </div>
      {steps.map(({ step, title, desc }) => (
        <div key={step} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', background: S,
            color: '#fff', fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {step}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: S, margin: '0 0 2px' }}>{title}</p>
            <p style={{ fontSize: 12, color: '#2D5A4A', margin: 0, lineHeight: 1.5 }}>{desc}</p>
          </div>
        </div>
      ))}
      {footer && (
        <div style={{ marginTop: 8, padding: '10px 14px', background: `${P}18`, borderRadius: 8, border: `1px solid ${P}44` }}>
          <p style={{ fontSize: 11, color: '#7A5F00', margin: 0, lineHeight: 1.5 }}>{footer}</p>
        </div>
      )}
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:  { bg: '#FEF9EC', color: '#92400E', label: 'Pending' },
    accepted: { bg: '#D1FAE5', color: '#065F46', label: 'Accepted' },
    expired:  { bg: '#F3F4F6', color: '#6B7280', label: 'Expired' },
    revoked:  { bg: '#FEE2E2', color: '#991B1B', label: 'Revoked' },
  };
  const s = map[status] || map.expired;
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Detailed Invite Tab (Flow 1) ─────────────────────────────────────────────
function DetailedInviteTab({ territories, currentUserId, onNewInvite }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({ full_name: '', email: '', role: 'realtor', territory_id: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  // Email state — saved before form reset so we can still send after
  const [pendingEmail, setPendingEmail]     = useState({ to: '', name: '', role: '' });
  const [emailSending, setEmailSending]     = useState(false);
  const [emailSent,    setEmailSent]        = useState(false);

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setGeneratedUrl('');
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim())                          errs.full_name    = 'Full name is required.';
    if (!form.email.trim())                              errs.email        = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    if (!form.role)                                      errs.role         = 'Role is required.';
    if (!form.territory_id)                              errs.territory_id = 'Territory is required.';
    return errs;
  };

  const handleGenerate = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    const token     = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('user_invitations').insert({
      token,
      email:        form.email.trim().toLowerCase(),
      full_name:    form.full_name.trim(),
      role:         form.role,
      territory_id: form.territory_id,
      invited_by:   currentUserId,
      expires_at:   expiresAt,
      status:       'pending',
    });

    setLoading(false);

    if (error) {
      addToast({ type: 'error', title: 'Failed to create invite', desc: error.message });
      return;
    }

    const url = `${APP_URL}/accept-invite?token=${token}`;
    // Save email/name BEFORE resetting form so we can send email after
    setPendingEmail({ to: form.email.trim().toLowerCase(), name: form.full_name.trim(), role: form.role });
    setEmailSent(false);
    setGeneratedUrl(url);
    setCopied(false);
    setForm({ full_name: '', email: '', role: 'realtor', territory_id: '' });
    onNewInvite();
    addToast({ type: 'success', title: 'Invite created', desc: 'Copy the link or send it by email.' });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      addToast({ type: 'success', title: 'Copied!', desc: 'Invite link copied to clipboard.' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      addToast({ type: 'error', title: 'Copy failed', desc: 'Please copy the link manually.' });
    }
  };

  const handleSendEmail = async () => {
    setEmailSending(true);
    const { sent, error } = await sendInviteEmailImpl({
      to:               pendingEmail.to,
      fullName:         pendingEmail.name,
      role:             pendingEmail.role,
      inviteUrl:        generatedUrl,
      isDetailedInvite: true,
    });
    setEmailSending(false);
    if (sent) {
      setEmailSent(true);
      addToast({ type: 'success', title: 'Email sent!', desc: `Invite sent to ${pendingEmail.to}` });
    } else {
      addToast({ type: 'error', title: 'Email failed', desc: error || 'Could not send email. Check SMTP settings.' });
    }
  };

  const inputStyle = (err) => ({
    width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
    border: `1.5px solid ${err ? '#EF4444' : BORDER}`, borderRadius: 8,
    fontSize: 14, color: OS, outline: 'none', background: '#fff', boxSizing: 'border-box',
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ maxWidth: 900 }}>

      {/* Form card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${P}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HiUserPlus size={20} color={P} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: OS, margin: 0 }}>Detailed Invite</h2>
            <p style={{ fontSize: 12, color: LGRAY, margin: 0 }}>Fill in user details — they only set a password</p>
          </div>
        </div>

        {/* Full Name */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Full Name</FieldLabel>
          <div style={{ position: 'relative' }}>
            <HiIdentification size={15} color={errors.full_name ? '#EF4444' : LGRAY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Jane Smith"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              style={inputStyle(errors.full_name)}
            />
          </div>
          <FieldError msg={errors.full_name} />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Email Address</FieldLabel>
          <div style={{ position: 'relative' }}>
            <HiEnvelope size={15} color={errors.email ? '#EF4444' : LGRAY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              style={inputStyle(errors.email)}
            />
          </div>
          <FieldError msg={errors.email} />
        </div>

        {/* Role */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Role</FieldLabel>
          <div style={{ position: 'relative' }}>
            <HiUserGroup size={15} color={errors.role ? '#EF4444' : LGRAY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              style={{ ...inputStyle(errors.role), appearance: 'none', cursor: 'pointer' }}
            >
              <option value="realtor">Realtor</option>
              <option value="director">Regional Director</option>
            </select>
          </div>
          <FieldError msg={errors.role} />
        </div>

        {/* Territory */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel>Assign Territory</FieldLabel>
          <div style={{ position: 'relative' }}>
            <HiMap size={15} color={errors.territory_id ? '#EF4444' : LGRAY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select
              value={form.territory_id}
              onChange={e => set('territory_id', e.target.value)}
              style={{ ...inputStyle(errors.territory_id), appearance: 'none', cursor: 'pointer', color: form.territory_id ? OS : LGRAY }}
            >
              <option value="">Select a territory…</option>
              {territories.map(t => (
                <option key={t.id} value={t.id}>
                  {t.city ? `${t.city}, ${t.state}` : t.state} — {t.country}
                </option>
              ))}
            </select>
          </div>
          <FieldError msg={errors.territory_id} />
        </div>

        <Button fullWidth onClick={handleGenerate} isLoading={loading}>
          <HiArrowPath size={15} />
          Generate Invite Link
        </Button>

        <CopyBox
          url={generatedUrl}
          copied={copied}
          onCopy={handleCopy}
          note="Link expires in 7 days. The user only needs to set a password — all other details are pre-filled."
        />

        {/* Send email button — shown after link is generated */}
        {generatedUrl && (
          <div style={{ marginTop: 12 }}>
            {emailSent ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 8,
                background: '#D1FAE5', border: '1px solid #6EE7B7',
              }}>
                <HiCheck size={15} color="#065F46" />
                <span style={{ fontSize: 13, color: '#065F46', fontWeight: 600 }}>
                  Email sent to {pendingEmail.to}
                </span>
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  style={{ marginLeft: 'auto', fontSize: 11, color: '#065F46', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Resend
                </button>
              </div>
            ) : (
              <Button
                fullWidth
                variant="green"
                isLoading={emailSending}
                onClick={handleSendEmail}
              >
                <HiPaperAirplane size={15} />
                Send Invite Email to {pendingEmail.to}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* How it works */}
      <HowItWorks
        steps={[
          { step: '1', title: 'Fill User Details', desc: "Enter the new user's name, email, role, and territory." },
          { step: '2', title: 'Generate Secure Link', desc: 'A one-time token is stored in the database and the invite URL is ready.' },
          { step: '3', title: 'Share the Link', desc: 'Copy the URL and send it to the user via email or messaging.' },
          { step: '4', title: 'User Sets Password', desc: 'The user clicks the link, sees their details pre-filled, and only needs to enter a password.' },
          { step: '5', title: 'Instant Activation', desc: 'Their account is immediately active — no approval wait, they go straight to their dashboard.' },
        ]}
        footer={<><strong>Auto-approved:</strong> Users invited this way bypass the standard approval queue.</>}
      />

    </div>
  );
}

// ── Quick Link Tab (Flow 2) ──────────────────────────────────────────────────
function QuickLinkTab({ territories, currentUserId, onNewInvite }) {
  const { addToast } = useToast();
  const [form, setForm]             = useState({ role: 'realtor', territory_id: '', recipient_email: '' });
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied]         = useState(false);
  const [savedRole, setSavedRole]   = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent,    setEmailSent]    = useState(false);

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (key !== 'recipient_email') setGeneratedUrl('');
  };

  const handleGenerate = async () => {
    const errs = {};
    if (!form.role)           errs.role         = 'Role is required.';
    if (!form.territory_id)   errs.territory_id = 'Territory is required.';
    if (form.recipient_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipient_email.trim())) {
      errs.recipient_email = 'Enter a valid email address.';
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    const token     = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('user_invitations').insert({
      token,
      email:        form.recipient_email.trim().toLowerCase() || null,
      full_name:    null,
      role:         form.role,
      territory_id: form.territory_id,
      invited_by:   currentUserId,
      expires_at:   expiresAt,
      status:       'pending',
    });

    setLoading(false);

    if (error) {
      addToast({ type: 'error', title: 'Failed to generate link', desc: error.message });
      return;
    }

    const url = `${APP_URL}/signup?invite_token=${token}`;
    setSavedRole(form.role);
    setEmailSent(false);
    setGeneratedUrl(url);
    setCopied(false);
    setForm(prev => ({ role: 'realtor', territory_id: '', recipient_email: prev.recipient_email }));
    onNewInvite();
    addToast({ type: 'success', title: 'Link generated', desc: 'Ready to copy and share.' });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      addToast({ type: 'success', title: 'Copied!', desc: 'Invite link copied to clipboard.' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      addToast({ type: 'error', title: 'Copy failed', desc: 'Please copy the link manually.' });
    }
  };

  const handleSendEmail = async () => {
    const emailTo = form.recipient_email.trim();
    if (!emailTo) return;
    setEmailSending(true);
    const { sent, error } = await sendInviteEmailImpl({
      to:               emailTo,
      fullName:         null,
      role:             savedRole,
      inviteUrl:        generatedUrl,
      isDetailedInvite: false,
    });
    setEmailSending(false);
    if (sent) {
      setEmailSent(true);
      addToast({ type: 'success', title: 'Email sent!', desc: `Invite sent to ${emailTo}` });
    } else {
      addToast({ type: 'error', title: 'Email failed', desc: error || 'Could not send email. Check SMTP settings.' });
    }
  };

  const inputStyle = (err) => ({
    width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
    border: `1.5px solid ${err ? '#EF4444' : BORDER}`, borderRadius: 8,
    fontSize: 14, color: OS, outline: 'none', background: '#fff',
    appearance: 'none', cursor: 'pointer', boxSizing: 'border-box',
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ maxWidth: 900 }}>

      {/* Form card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${P}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HiLink size={20} color={P} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: OS, margin: 0 }}>Quick Link Invite</h2>
            <p style={{ fontSize: 12, color: LGRAY, margin: 0 }}>User fills their own details on sign-up</p>
          </div>
        </div>

        {/* Role */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Role</FieldLabel>
          <div style={{ position: 'relative' }}>
            <HiUserGroup size={15} color={LGRAY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select value={form.role} onChange={e => set('role', e.target.value)} style={inputStyle(errors.role)}>
              <option value="realtor">Realtor</option>
              <option value="director">Regional Director</option>
            </select>
          </div>
          <FieldError msg={errors.role} />
        </div>

        {/* Territory */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel>Assign Territory</FieldLabel>
          <div style={{ position: 'relative' }}>
            <HiMap size={15} color={errors.territory_id ? '#EF4444' : LGRAY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select
              value={form.territory_id}
              onChange={e => set('territory_id', e.target.value)}
              style={{ ...inputStyle(errors.territory_id), color: form.territory_id ? OS : LGRAY }}
            >
              <option value="">Select a territory…</option>
              {territories.map(t => (
                <option key={t.id} value={t.id}>
                  {t.city ? `${t.city}, ${t.state}` : t.state} — {t.country}
                </option>
              ))}
            </select>
          </div>
          <FieldError msg={errors.territory_id} />
        </div>

        {/* Optional recipient email */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel>Recipient Email <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — to send directly)</span></FieldLabel>
          <div style={{ position: 'relative' }}>
            <HiEnvelope size={15} color={errors.recipient_email ? '#EF4444' : LGRAY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="email"
              placeholder="recipient@example.com"
              value={form.recipient_email}
              onChange={e => set('recipient_email', e.target.value)}
              style={{
                width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                border: `1.5px solid ${errors.recipient_email ? '#EF4444' : BORDER}`, borderRadius: 8,
                fontSize: 14, color: OS, outline: 'none', background: '#fff', boxSizing: 'border-box',
              }}
            />
          </div>
          <FieldError msg={errors.recipient_email} />
        </div>

        <Button fullWidth onClick={handleGenerate} isLoading={loading}>
          <HiArrowPath size={15} />
          Generate Quick Link
        </Button>

        <CopyBox
          url={generatedUrl}
          copied={copied}
          onCopy={handleCopy}
          note={form.recipient_email.trim() ? "Link ready — click 'Send Email' below or copy it manually." : "Send this link to the user. They'll fill in all their own details and be instantly activated."}
        />

        {/* Send email button — shown when email provided and link generated */}
        {generatedUrl && form.recipient_email.trim() && (
          <div style={{ marginTop: 12 }}>
            {emailSent ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 8,
                background: '#D1FAE5', border: '1px solid #6EE7B7',
              }}>
                <HiCheck size={15} color="#065F46" />
                <span style={{ fontSize: 13, color: '#065F46', fontWeight: 600 }}>
                  Email sent to {form.recipient_email.trim()}
                </span>
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  style={{ marginLeft: 'auto', fontSize: 11, color: '#065F46', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Resend
                </button>
              </div>
            ) : (
              <Button
                fullWidth
                variant="green"
                isLoading={emailSending}
                onClick={handleSendEmail}
              >
                <HiPaperAirplane size={15} />
                Send Invite Email to {form.recipient_email.trim()}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* How it works */}
      <HowItWorks
        steps={[
          { step: '1', title: 'Select Role & Territory', desc: "Choose what role this invite is for and which territory they'll operate in." },
          { step: '2', title: 'Generate Secure Link', desc: 'A one-time 256-bit token is created and stored safely in the database.' },
          { step: '3', title: 'Share the Link', desc: 'Send it to anyone you want to onboard — via email, Slack, etc.' },
          { step: '4', title: 'User Signs Up', desc: 'They complete the standard sign-up form. Role and territory are pre-assigned.' },
          { step: '5', title: 'Instant Activation', desc: 'Account is immediately active — they skip the approval queue entirely.' },
        ]}
        footer={<><strong>Note:</strong> The link can be used only once and expires in 7 days. You can revoke it any time below.</>}
      />

    </div>
  );
}

// ── Recent Invitations table ────────────────────────────────────────────────
function RecentInvitations({ invitations, onRevoke }) {
  if (invitations.length === 0) return null;

  return (
    <div style={{ marginTop: 36 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: OS, marginBottom: 14 }}>Recent Invitations</h3>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: `1px solid ${BORDER}` }}>
              {['Name / Email', 'Role', 'Territory', 'Status', 'Expires', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: OSV, textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv, idx) => {
              const isExpired = inv.status === 'pending' && new Date(inv.expires_at) < new Date();
              const displayStatus = isExpired ? 'expired' : inv.status;
              const expiryDate = new Date(inv.expires_at).toLocaleDateString();
              const territory = inv.territory ? (inv.territory.city ? `${inv.territory.city}, ${inv.territory.state}` : inv.territory.state) : '—';
              return (
                <tr key={inv.id} style={{ borderBottom: idx < invitations.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: OS }}>{inv.full_name || '—'}</div>
                    <div style={{ fontSize: 11, color: LGRAY }}>{inv.email || 'Quick link'}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: OSV, textTransform: 'capitalize' }}>
                    {inv.role === 'director' ? 'Director' : 'Realtor'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: OSV }}>{territory}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={displayStatus} />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: LGRAY }}>
                    {displayStatus === 'accepted' ? '—' : expiryDate}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {displayStatus === 'pending' && (
                      <button
                        onClick={() => onRevoke(inv.id)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, border: `1px solid #FCA5A5`,
                          background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <HiXMark size={12} />
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AddUserPage() {
  const { addToast }   = useToast();
  const { user }       = useAuth();

  const [activeTab,    setActiveTab]    = useState('detailed');
  const [territories,  setTerritories]  = useState([]);
  const [invitations,  setInvitations]  = useState([]);

  useEffect(() => {
    supabase
      .from('territories')
      .select('id, state, city, country')
      .order('state', { ascending: true })
      .then(({ data }) => setTerritories(data || []));
  }, []);

  const fetchInvitations = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_invitations')
      .select('id, email, full_name, role, status, expires_at, created_at, territory:territories(city, state)')
      .eq('invited_by', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setInvitations(data || []);
  }, [user?.id]);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  const handleRevoke = async (id) => {
    const { error } = await supabase
      .from('user_invitations')
      .update({ status: 'revoked' })
      .eq('id', id)
      .eq('status', 'pending');
    if (!error) {
      addToast({ type: 'success', title: 'Invite revoked', desc: 'The link can no longer be used.' });
      fetchInvitations();
    } else {
      addToast({ type: 'error', title: 'Revoke failed', desc: error.message });
    }
  };

  const tabs = [
    { key: 'detailed', label: 'Detailed Invite',   icon: HiUserPlus },
    { key: 'quick',    label: 'Quick Link Invite',  icon: HiLink },
  ];

  return (
    <AppLayout role="admin">
      <div style={{ padding: 'clamp(16px, 4vw, 32px)', minHeight: '100vh', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: OS, marginBottom: 4 }}>Add User</h1>
          <p style={{ fontSize: 13, color: LGRAY }}>
            Invite realtors and directors with pre-filled details or a shareable link. Admin-invited users are auto-approved.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#F3F4F6', borderRadius: 10, padding: 4 }} className="w-full sm:w-fit">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 sm:flex-none"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: activeTab === key ? '#fff' : 'transparent',
                color: activeTab === key ? OS : LGRAY,
                boxShadow: activeTab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={16} color={activeTab === key ? P : LGRAY} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'detailed' ? (
          <DetailedInviteTab
            territories={territories}
            currentUserId={user?.id}
            onNewInvite={fetchInvitations}
          />
        ) : (
          <QuickLinkTab
            territories={territories}
            currentUserId={user?.id}
            onNewInvite={fetchInvitations}
          />
        )}

        {/* Recent invitations (shared across tabs) */}
        <RecentInvitations invitations={invitations} onRevoke={handleRevoke} />

        </div>
      </div>
    </AppLayout>
  );
}
