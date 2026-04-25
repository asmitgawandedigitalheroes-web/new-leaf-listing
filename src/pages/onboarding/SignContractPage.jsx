import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { supabase } from '../../lib/supabase';
import { auditService } from '../../../services/audit.service';
import { notificationService } from '../../../services/notification.service';
import { sendContractSignedEmail } from '../../utils/email';
import NLVLogo from '../../components/ui/NLVLogo';
import Button from '../../components/ui/Button';
import {
  HiDocumentText,
  HiPencilSquare,
  HiExclamationTriangle,
  HiArrowRight,
} from 'react-icons/hi2';

const GOLD  = '#D4AF37';
const DEEP  = '#1F4D3A';
const BORDER = '#E5E7EB';
const OS    = '#111111';
const OSV   = '#4B5563';
const LGRAY = '#6B7280';

const DEFAULT_SECTIONS = [
  { num: '1',  title: 'PURPOSE',                        body: `This Agreement establishes the Territory Partner's participation within the NLVListings platform and broader New Leaf Vision ecosystem.\n\nThe Territory Partner is granted the opportunity to operate within a defined geographic area ("Territory") and participate in platform-generated opportunities, subject to the terms of this Agreement.` },
  { num: '2',  title: 'TERRITORY RIGHTS',               body: `The Company may grant the Territory Partner priority or exclusive rights within a defined geographic region.\n\nSuch rights may include:\n• Priority or exclusive access to platform-generated leads\n• Market positioning within the Territory\n• First access to certain listings, buyers, or opportunities\n• Participation in localized growth of the platform\n\nThe scope, boundaries, and exclusivity of the Territory shall be defined separately and may evolve over time.` },
  { num: '3',  title: 'PLATFORM PARTICIPATION',         body: `The Territory Partner may:\n• Access and utilize the NLVListings platform\n• Participate in platform-generated leads\n• List, market, and promote properties\n• Engage with buyers and sellers within the ecosystem\n\nParticipation is subject to compliance with platform rules and policies.` },
  { num: '4',  title: 'PLATFORM LEADS AND TRANSACTIONS',body: `Any lead generated through the platform shall be considered a "Platform Lead." Any transaction involving a Platform Lead shall be considered a "Platform Transaction," regardless of where the transaction is completed.` },
  { num: '5',  title: 'LEAD ATTRIBUTION',               body: `Platform records shall serve as the primary reference for attribution. Attribution remains valid for a defined period as outlined in platform policies. The Company retains final discretion in determining attribution.` },
  { num: '6',  title: 'NON-CIRCUMVENTION',              body: `The Territory Partner agrees not to bypass the platform to avoid fees or obligations, redirect Platform Leads outside the ecosystem, or complete transactions privately with Platform Leads. Any attempt to circumvent the platform may result in enforcement actions.` },
  { num: '7',  title: 'NEW LEAF VISION ECOSYSTEM',      body: `The Territory Partner acknowledges that NLVListings is part of a broader ecosystem. The Territory Partner may introduce clients to New Leaf Vision opportunities and participate in project-related transactions when available.` },
  { num: '8',  title: 'DEVELOPMENT AND PROJECT ACCESS', body: `The Company may provide Territory Partners with access to pre-construction or pre-sale opportunities. Access is not guaranteed and may depend on level of activity, compliance with platform standards, and market availability.` },
  { num: '9',  title: 'BRAND AND REPRESENTATION',       body: `The Territory Partner may not represent themselves as an employee or agent of the Company. All branding must comply with Company guidelines.` },
  { num: '10', title: 'PLATFORM SYSTEMS AND COMMUNICATION', body: `The Territory Partner agrees to utilize the Company's CRM systems, lead management tools, and communication platforms where required to ensure proper tracking and ecosystem integrity.` },
  { num: '11', title: 'MEDIA AND CONTENT',              body: `The Territory Partner retains ownership of submitted content. The Company is granted a non-exclusive license to use such content for platform display, marketing, and promotional purposes.` },
  { num: '12', title: 'TERM AND TERMINATION',           body: `This Agreement remains in effect until terminated by either party. The Company reserves the right to modify Territory access, revoke exclusivity, or suspend participation in cases of breach, misuse, or failure to maintain activity standards.` },
  { num: '13', title: 'NO GUARANTEE',                   body: `The Company does not guarantee lead volume, transaction outcomes, or financial results. Participation is based on opportunity, not assurance.` },
  { num: '14', title: 'PLATFORM ROLE',                  body: `NLVListings is a technology platform only. The Company is not a real estate broker and does not represent buyers or sellers. The Territory Partner is solely responsible for compliance with applicable laws and licensing requirements.` },
  { num: '15', title: 'GOVERNING LAW',                  body: `This Agreement shall be governed by the laws of the State of Delaware.` },
];

export default function SignContractPage() {
  const navigate             = useNavigate();
  const { profile, isLoading: authLoading } = useAuth();
  const { addToast }         = useToast();
  const { settings }         = usePlatformSettings();

  const sections   = settings.contract_template || DEFAULT_SECTIONS;
  const adminEmail = settings.support_email || 'support@nlvlistings.com';

  const [entityName, setEntityName] = useState('');
  const [accepted,   setAccepted]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Pre-fill entity name once profile loads
  useEffect(() => {
    if (profile?.full_name) setEntityName(profile.full_name);
  }, [profile?.full_name]);

  // If already signed (e.g. browser back), skip straight to dashboard
  useEffect(() => {
    if (!authLoading && profile?.territory_contract_signed_at) {
      navigate('/director/dashboard', { replace: true });
    }
  }, [authLoading, profile?.territory_contract_signed_at, navigate]);

  const handleSign = async (e) => {
    e.preventDefault();
    if (!entityName.trim()) { setError('Please enter your legal name or entity name.'); return; }
    if (!accepted)          { setError('You must read and accept the agreement to proceed.'); return; }
    setError('');
    setSaving(true);

    const signedAt = new Date().toISOString();
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({
        territory_contract_signed_at:   signedAt,
        territory_contract_entity_name: entityName.trim(),
      })
      .eq('id', profile.id);

    if (dbErr) {
      setSaving(false);
      setError('Failed to save. Please try again.');
      return;
    }

    // Fire-and-forget side effects
    auditService.log(profile.id, 'contract.signed', 'contract', profile.id, {
      entity_name: entityName.trim(),
      signed_at: signedAt,
    }).catch(() => {});

    sendContractSignedEmail({
      directorEmail: profile.email,
      directorName:  profile.full_name || entityName.trim(),
      entityName:    entityName.trim(),
      adminEmail,
    }).catch(() => {});

    notificationService.notifyAdminsContractSigned({
      id:        profile.id,
      full_name: profile.full_name,
      email:     profile.email,
      entityName: entityName.trim(),
    }).catch(() => {});

    addToast({
      type: 'success',
      title: 'Agreement signed',
      desc: `Welcome to NLV Listings. A confirmation has been sent to ${profile.email}.`,
    });

    // Navigate to dashboard — ProtectedRoute will now pass the contract gate
    navigate('/director/dashboard', { replace: true });
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: LGRAY }}>Loading your agreement…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <NLVLogo size="sm" />
        </div>

        {/* Progress indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
          {['Account Created', 'Sign Agreement', 'Access Dashboard'].map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: i === 0 ? DEEP : i === 1 ? GOLD : BORDER,
                  color: i < 2 ? '#fff' : LGRAY,
                }}>
                  {i === 0 ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, fontWeight: i === 1 ? 700 : 500, color: i === 1 ? OS : LGRAY, display: 'none' }}
                  className="sm-show">{label}</span>
              </div>
              {i < 2 && <div style={{ width: 40, height: 1, background: i === 0 ? DEEP : BORDER, margin: '0 8px' }} />}
            </div>
          ))}
        </div>

        {/* Header card */}
        <div style={{
          background: DEEP, borderRadius: '16px 16px 0 0',
          padding: '24px 28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HiDocumentText size={22} color={GOLD} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD, margin: 0 }}>
                Step 2 of 3 — Required
              </p>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>
                Territory Partner Agreement
              </h1>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 10, lineHeight: 1.5 }}>
            Read the full agreement below, then sign with your legal name to unlock your director dashboard.
          </p>
        </div>

        {/* Contract body */}
        <div style={{
          background: '#fff', border: `1px solid ${BORDER}`, borderTop: 'none',
          padding: '28px 28px 0',
        }}>
          {/* Document title */}
          <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: GOLD, margin: '0 0 6px' }}>
              New Leaf Vision Inc.
            </p>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: OS, margin: '0 0 6px' }}>
              NLVLISTINGS TERRITORY PARTNER AGREEMENT
            </h2>
            <p style={{ fontSize: 12, color: LGRAY, margin: '0 0 10px' }}>Effective Date: {today}</p>
            <p style={{ fontSize: 12, color: OSV, lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
              This Agreement is entered into between <strong>New Leaf Vision Inc.</strong>, a Delaware corporation ("Company") and{' '}
              <strong>{entityName || '[Partner Name / Entity]'}</strong> ("Territory Partner").
            </p>
          </div>

          {/* Sections */}
          <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 8, marginBottom: 20 }}>
            {sections.map(sec => (
              <div key={sec.num} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: DEEP, color: '#fff',
                    fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{sec.num}</span>
                  <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: OS, margin: 0 }}>
                    {sec.title}
                  </h3>
                </div>
                <p style={{ fontSize: 12, color: OSV, lineHeight: 1.7, margin: 0, paddingLeft: 30, whiteSpace: 'pre-line' }}>
                  {sec.body}
                </p>
              </div>
            ))}

            {/* Signature block */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: OS, marginBottom: 12 }}>
                {sections.length + 1}. SIGNATURES
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '12px 16px', borderRadius: 8, background: '#F9FAFB', border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: LGRAY, margin: '0 0 4px' }}>Company</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: OS, margin: 0 }}>New Leaf Vision Inc.</p>
                  <p style={{ fontSize: 11, color: LGRAY, margin: '2px 0 0' }}>Authorized Representative</p>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: 8, background: '#F9FAFB', border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: LGRAY, margin: '0 0 4px' }}>Territory Partner</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: OS, margin: 0 }}>{entityName || '—'}</p>
                  <p style={{ fontSize: 11, color: LGRAY, margin: '2px 0 0' }}>Electronic signature · {today}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signature form */}
        <form
          onSubmit={handleSign}
          style={{
            background: '#fff', border: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER}`,
            borderRadius: '0 0 16px 16px',
            padding: '20px 28px 28px',
          }}
        >
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>

            {/* Entity name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: OSV, display: 'block', marginBottom: 6 }}>
                Your Legal Name or Entity Name *
              </label>
              <input
                type="text"
                value={entityName}
                onChange={e => { setEntityName(e.target.value); setError(''); }}
                placeholder="e.g. John Smith or Smith Realty LLC"
                style={{
                  width: '100%', padding: '10px 12px', fontSize: 14,
                  border: `1.5px solid ${error && !entityName.trim() ? '#EF4444' : BORDER}`,
                  borderRadius: 8, outline: 'none', color: OS, background: '#fff',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = ''; }}
              />
            </div>

            {/* Acceptance checkbox */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
              <div
                onClick={() => { setAccepted(v => !v); setError(''); }}
                style={{
                  width: 18, height: 18, borderRadius: 4, border: `2px solid ${accepted ? GOLD : BORDER}`,
                  background: accepted ? GOLD : 'transparent', flexShrink: 0, marginTop: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {accepted && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, color: OSV, lineHeight: 1.5 }}>
                I have read and fully understand the NLVListings Territory Partner Agreement. I agree to be bound by its terms and conditions on behalf of myself and/or my entity.
              </span>
            </label>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#DC2626',
                background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8,
                padding: '10px 12px', marginBottom: 16,
              }}>
                <HiExclamationTriangle size={15} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" fullWidth size="lg" isLoading={saving}>
              <HiPencilSquare size={16} />
              Sign &amp; Go to Dashboard
              <HiArrowRight size={16} />
            </Button>

            <p style={{ fontSize: 11, color: LGRAY, textAlign: 'center', marginTop: 12 }}>
              By signing, you confirm this is your legal name or entity. This constitutes a legally binding electronic signature.
            </p>
          </div>
        </form>

      </div>
    </div>
  );
}
