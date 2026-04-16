import { useState, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../context/ToastContext';
import { APP_URL } from '../../../utils/appUrl';
import {
  HiUserGroup,
  HiMap,
  HiClipboardDocumentList,
  HiCheck,
  HiArrowPath,
} from 'react-icons/hi2';

const P      = '#D4AF37';
const S      = '#1F4D3A';
const SCL    = '#E8F3EE';
const OS     = '#111111';
const OSV    = '#4B5563';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';

export default function InviteDirectorPage() {
  const { addToast } = useToast();
  const [territories, setTerritories] = useState([]);
  const [selectedTerritory, setSelectedTerritory] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from('territories')
      .select('id, state, city, country')
      .order('state', { ascending: true })
      .then(({ data }) => setTerritories(data || []));
  }, []);

  const generateLink = () => {
    if (!selectedTerritory) {
      addToast({ type: 'error', title: 'Territory required', desc: 'Please select a territory for this director.' });
      return;
    }
    const url  = `${APP_URL}/signup?role=director&territory_id=${selectedTerritory}`;
    setInviteUrl(url);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      addToast({ type: 'success', title: 'Copied!', desc: 'Invite link copied to clipboard.' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      addToast({ type: 'error', title: 'Copy failed', desc: 'Please copy the link manually.' });
    }
  };

  return (
    <AppLayout role="admin">
      <div style={{ padding: 'clamp(16px, 4vw, 32px)', minHeight: '100vh', background: '#F9FAFB' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: OS, marginBottom: 4 }}>Invite Regional Director</h1>
          <p style={{ fontSize: 13, color: LGRAY }}>
            Generate an invite link to onboard a new Regional Director to a territory.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>

          {/* Left: Generate link form */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${P}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiUserGroup size={20} color={P} />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: OS, margin: 0 }}>Generate Invite Link</h2>
                <p style={{ fontSize: 12, color: LGRAY, margin: 0 }}>Select a territory, then share the link</p>
              </div>
            </div>

            {/* Territory selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: OSV, display: 'block', marginBottom: 6 }}>
                Assign Territory
              </label>
              <div style={{ position: 'relative' }}>
                <HiMap size={15} color={LGRAY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <select
                  value={selectedTerritory}
                  onChange={e => { setSelectedTerritory(e.target.value); setInviteUrl(''); }}
                  style={{
                    width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                    border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 14,
                    color: selectedTerritory ? OS : LGRAY, appearance: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="">Select a territory…</option>
                  {territories.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.city ? `${t.city}, ${t.state}` : t.state} — {t.country}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button fullWidth onClick={generateLink}>
              <HiArrowPath size={15} />
              Generate Invite Link
            </Button>

            {/* Generated URL */}
            {inviteUrl && (
              <div style={{ marginTop: 20 }}>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: OSV, display: 'block', marginBottom: 6 }}>
                  Invite Link
                </label>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    border: `1px solid ${BORDER}`, borderRadius: 8,
                    background: '#F9FAFB', padding: '8px 12px',
                  }}
                >
                  <span style={{ fontSize: 12, color: OSV, flex: 1, wordBreak: 'break-all', lineHeight: 1.4 }}>
                    {inviteUrl}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      flexShrink: 0, padding: '6px 12px', borderRadius: 6, border: 'none',
                      background: copied ? S : P, color: '#fff',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {copied ? <><HiCheck size={13} /> Copied</> : <>Copy</>}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: LGRAY, marginTop: 6 }}>
                  Share this link with the director via email or messaging. The link expires when used.
                </p>
              </div>
            )}
          </div>

          {/* Right: How it works */}
          <div style={{ background: SCL, borderRadius: 16, padding: 28, border: `1px solid rgba(31,77,58,0.15)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${S}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiClipboardDocumentList size={20} color={S} />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: S, margin: 0 }}>How Director Invites Work</h2>
            </div>

            {[
              { step: '1', title: 'Select Territory', desc: 'Choose which territory this director will manage.' },
              { step: '2', title: 'Generate & Share Link', desc: 'Copy the unique invite URL and send it to the director via email.' },
              { step: '3', title: 'Director Signs Up', desc: 'They visit the link, fill in their details, and accept the Director Agreement (Layer 3 contract).' },
              { step: '4', title: 'Instant Activation', desc: 'Director accounts are auto-approved — they land directly on their dashboard with full territory access.' },
              { step: '5', title: 'Onboard Realtors', desc: 'The director can now generate realtor invite links for their own territory.' },
            ].map(({ step, title, desc }) => (
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

            <div style={{ marginTop: 8, padding: '10px 14px', background: `${P}18`, borderRadius: 8, border: `1px solid ${P}44` }}>
              <p style={{ fontSize: 11, color: '#7A5F00', margin: 0, lineHeight: 1.5 }}>
                <strong>Commission note:</strong> Directors earn 25% recurring commission on all subscriptions from realtors in their territory (PRD §11.1).
              </p>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
