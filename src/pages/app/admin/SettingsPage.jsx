import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { useToast } from '../../../context/ToastContext';
import { usePlatformSettings } from '../../../hooks/usePlatformSettings';
import {
  HiCog6Tooth,
  HiBanknotes,
  HiHome,
  HiCreditCard,
  HiLink,
  HiBell,
  HiArrowPath,
  HiCheckCircle,
  HiPhone,
  HiMapPin,
  HiGlobeAlt,
} from 'react-icons/hi2';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import { registerCustomFields } from '../../../../lib/ghl/registerCustomFields';

// ── Color constants ───────────────────────────────────────────────────────────
const P      = '#D4AF37';
const OS     = '#111111';
const OSV    = '#4B5563';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';
const SURF   = '#F9FAFB';

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, onSave, isLoading, isSaving }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 24, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, background: SURF,
      }}>
        <Icon size={18} color={P} />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: OS }}>{title}</h2>
      </div>
      <div style={{ padding: '20px 24px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton width="100%" height="40px" />
            <Skeleton width="100%" height="40px" />
          </div>
        ) : (
          <>
            {children}
            {onSave && (
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="gold" onClick={onSave} isLoading={isSaving}>
                  Save Changes
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: LGRAY, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, ...rest }) {
  return (
    <input
      value={value || ''}
      onChange={onChange}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 bg-white"
      {...rest}
    />
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full relative transition-colors ${value ? 'bg-yellow-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : ''} shadow-sm`} />
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { addToast } = useToast();
  const { settings, isLoading, updateSetting, updateBatch, refresh } = usePlatformSettings();
  const [isSaving, setIsSaving] = useState({});

  // Individual form states derived from flat settings or defaults
  const [platform, setPlatform]     = useState({});
  const [commission, setCommission] = useState({});
  const [listing, setListing]       = useState({});
  const [crm, setCrm]               = useState({});
  const [notif, setNotif]           = useState({});
  const [contact, setContact]       = useState({});
  const [social, setSocial]         = useState({});
  const [registeringFields, setRegisteringFields] = useState(false);
  const [registerResults, setRegisterResults]     = useState(null);

  useEffect(() => {
    if (!isLoading) {
      setPlatform({
        name: settings.platform_name || 'NLV Listings',
        tagline: settings.platform_tagline || 'The Premium Platform for Top Realtors',
        supportEmail: settings.support_email || 'support@nlvlistings.com',
        defaultTerritory: settings.default_territory || 'Austin, TX',
        maintenanceMode: settings.maintenance_mode === true
      });
      setCommission({
        directorRate: settings.director_commission_rate || 25,
        adminOverride: settings.admin_override_rate || 15,
        platformFee: settings.platform_fee_rate || 15,
        attributionWindow: settings.lead_attribution_days || 180,
        payoutSchedule: settings.payout_schedule || 'monthly'
      });
      setListing({
        maxImages: settings.max_images || 20,
        requireApproval: settings.require_listing_approval === true,
        autoExpireDays: settings.auto_expire_days || '90'
      });
      setCrm(settings.crm_config || { ghl: { enabled: false } });
      setNotif(settings.notif_config || { provider: 'resend', newLead: true });
      setContact(settings.contact_config || {
        phone: '', secondaryPhone: '', address: '', city: '', state: '', zip: '', businessHours: ''
      });
      setSocial(settings.social_config || {
        facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '', tiktok: ''
      });
    }
  }, [settings, isLoading]);

  const save = async (section, data, keysMap) => {
    setIsSaving(p => ({ ...p, [section]: true }));
    
    // Map internal state keys to DB keys if defined
    const batch = {};
    if (keysMap) {
      Object.entries(data).forEach(([k, v]) => {
        if (keysMap[k]) batch[keysMap[k]] = v;
        else batch[`${section.toLowerCase()}_${k}`] = v; // fallback
      });
    } else {
      // For complex objects, store as-is under a specific key
      batch[`${section.toLowerCase()}_config`] = data;
    }

    const { error } = await updateBatch(batch);
    setIsSaving(p => ({ ...p, [section]: false }));

    if (error) {
      addToast({ type: 'error', title: 'Save failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Settings saved', desc: `${section} settings updated.` });
    }
  };

  return (
    <AppLayout role="admin">
      <div style={{ padding: 'clamp(16px, 4vw, 32px)', minHeight: '100vh', background: SURF }}>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
            <p className="text-sm text-gray-500">Configure platform-wide rules, integrations, and notifications.</p>
          </div>
          <button onClick={refresh} title="Refresh" className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
            <HiArrowPath size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Section 1: Platform */}
        <SectionCard 
          title="Platform Settings" icon={HiCog6Tooth} 
          onSave={() => save('Platform', platform, {
            name: 'platform_name', tagline: 'platform_tagline', 
            supportEmail: 'support_email', defaultTerritory: 'default_territory', 
            maintenanceMode: 'maintenance_mode'
          })} 
          isLoading={isLoading} isSaving={isSaving['Platform']}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Platform Name"><TextInput value={platform.name} onChange={e => setPlatform(p=>({...p, name: e.target.value}))} /></Field>
            <Field label="Platform Tagline"><TextInput value={platform.tagline} onChange={e => setPlatform(p=>({...p, tagline: e.target.value}))} /></Field>
            <Field label="Support Email"><TextInput value={platform.supportEmail} onChange={e => setPlatform(p=>({...p, supportEmail: e.target.value}))} /></Field>
            <Field label="Default Territory"><TextInput value={platform.defaultTerritory} onChange={e => setPlatform(p=>({...p, defaultTerritory: e.target.value}))} /></Field>
          </div>
          <div className="border-t border-gray-100 mt-4 pt-2">
            <Toggle label="Maintenance Mode — disables login for non-admins" value={platform.maintenanceMode} onChange={v => setPlatform(p=>({...p, maintenanceMode: v}))} />
          </div>
        </SectionCard>

        {/* Section 2: Commission */}
        <SectionCard 
          title="Commission Rules" icon={HiBanknotes} 
          onSave={() => save('Commission', commission, {
            directorRate: 'director_commission_rate', adminOverride: 'admin_override_rate',
            platformFee: 'platform_fee_rate', attributionWindow: 'lead_attribution_days',
            payoutSchedule: 'payout_schedule'
          })} 
          isLoading={isLoading} isSaving={isSaving['Commission']}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Director Rate (%)"><TextInput type="number" value={commission.directorRate} onChange={e => setCommission(p=>({...p, directorRate: e.target.value}))} /></Field>
            <Field label="Admin Override (%)"><TextInput type="number" value={commission.adminOverride} onChange={e => setCommission(p=>({...p, adminOverride: e.target.value}))} /></Field>
            <Field label="Platform Fee (%)"><TextInput type="number" value={commission.platformFee} onChange={e => setCommission(p=>({...p, platformFee: e.target.value}))} /></Field>
            <Field label="Lead Attribution (days)"><TextInput type="number" value={commission.attributionWindow} onChange={e => setCommission(p=>({...p, attributionWindow: e.target.value}))} /></Field>
            <Field label="Payout Schedule">
              <select value={commission.payoutSchedule} onChange={e => setCommission(p=>({...p, payoutSchedule: e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                <option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="monthly">Monthly</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        {/* Section 3: Listing */}
        <SectionCard 
          title="Listing Rules" icon={HiHome}
          onSave={() => save('Listing', listing, {
            maxImages: 'max_images', requireApproval: 'require_listing_approval',
            autoExpireDays: 'auto_expire_days'
          })}
          isLoading={isLoading} isSaving={isSaving['Listing']}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Max Photos"><TextInput type="number" value={listing.maxImages} onChange={e => setListing(p=>({...p, maxImages: e.target.value}))} /></Field>
            <Field label="Auto-expire After">
              <select value={listing.autoExpireDays} onChange={e => setListing(p=>({...p, autoExpireDays: e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                <option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 pt-2 border-t border-gray-100">
            <Toggle label="Require Admin Approval" value={listing.requireApproval} onChange={v => setListing(p=>({...p, requireApproval: v}))} />
          </div>
        </SectionCard>

        {/* Section 4: Contact Information */}
        <SectionCard
          title="Contact Information" icon={HiPhone}
          onSave={() => save('contact', contact)}
          isLoading={isLoading} isSaving={isSaving['contact']}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Primary Phone">
              <TextInput
                placeholder="+1 (555) 000-0000"
                value={contact.phone}
                onChange={e => setContact(p => ({ ...p, phone: e.target.value }))}
              />
            </Field>
            <Field label="Secondary Phone">
              <TextInput
                placeholder="+1 (555) 000-0000"
                value={contact.secondaryPhone}
                onChange={e => setContact(p => ({ ...p, secondaryPhone: e.target.value }))}
              />
            </Field>
            <Field label="Street Address" hint="Displayed on the contact page and footer.">
              <TextInput
                placeholder="123 Main Street, Suite 100"
                value={contact.address}
                onChange={e => setContact(p => ({ ...p, address: e.target.value }))}
              />
            </Field>
            <Field label="Business Hours">
              <TextInput
                placeholder="Mon–Fri 9am–6pm CT"
                value={contact.businessHours}
                onChange={e => setContact(p => ({ ...p, businessHours: e.target.value }))}
              />
            </Field>
            <Field label="City">
              <TextInput
                placeholder="Las Vegas"
                value={contact.city}
                onChange={e => setContact(p => ({ ...p, city: e.target.value }))}
              />
            </Field>
            <Field label="State">
              <TextInput
                placeholder="NV"
                value={contact.state}
                onChange={e => setContact(p => ({ ...p, state: e.target.value }))}
              />
            </Field>
            <Field label="ZIP Code">
              <TextInput
                placeholder="89101"
                value={contact.zip}
                onChange={e => setContact(p => ({ ...p, zip: e.target.value }))}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Section 5: Social Media Links */}
        <SectionCard
          title="Social Media Links" icon={HiGlobeAlt}
          onSave={() => save('social', social)}
          isLoading={isLoading} isSaving={isSaving['social']}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Facebook">
              <TextInput
                placeholder="https://facebook.com/yourpage"
                value={social.facebook}
                onChange={e => setSocial(p => ({ ...p, facebook: e.target.value }))}
              />
            </Field>
            <Field label="Instagram">
              <TextInput
                placeholder="https://instagram.com/yourhandle"
                value={social.instagram}
                onChange={e => setSocial(p => ({ ...p, instagram: e.target.value }))}
              />
            </Field>
            <Field label="Twitter / X">
              <TextInput
                placeholder="https://x.com/yourhandle"
                value={social.twitter}
                onChange={e => setSocial(p => ({ ...p, twitter: e.target.value }))}
              />
            </Field>
            <Field label="LinkedIn">
              <TextInput
                placeholder="https://linkedin.com/company/yourcompany"
                value={social.linkedin}
                onChange={e => setSocial(p => ({ ...p, linkedin: e.target.value }))}
              />
            </Field>
            <Field label="YouTube">
              <TextInput
                placeholder="https://youtube.com/@yourchannel"
                value={social.youtube}
                onChange={e => setSocial(p => ({ ...p, youtube: e.target.value }))}
              />
            </Field>
            <Field label="TikTok">
              <TextInput
                placeholder="https://tiktok.com/@yourhandle"
                value={social.tiktok}
                onChange={e => setSocial(p => ({ ...p, tiktok: e.target.value }))}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Section 6: CRM — GoHighLevel only */}
        <SectionCard title="CRM Integration" icon={HiLink} onSave={() => save('CRM', crm)} isLoading={isLoading} isSaving={isSaving['CRM']}>
          <div className="mb-4 p-4 border border-gray-100 rounded-lg bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800">GoHighLevel (GHL)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Primary CRM — receives lead syncs and status updates via webhook</p>
              </div>
              <Toggle label="" value={crm.ghl?.enabled} onChange={v => setCrm(p => ({ ...p, ghl: { ...(p.ghl || {}), enabled: v } }))} />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="GHL Location ID" hint="GHL → Settings → Business Info → Location ID. Required for PIT tokens to push contacts to the correct sub-account.">
                <TextInput
                  placeholder="sro8sN54qUKbEO5UGkrx"
                  value={crm.ghl?.locationId}
                  onChange={e => setCrm(p => ({ ...p, ghl: { ...(p.ghl || {}), locationId: e.target.value } }))}
                />
              </Field>
              <Field label="GHL API Key (Private Integration Key)" hint="GHL → Settings → Integrations → API Keys → Create Key. Used to create contacts directly via GHL REST API — no workflow trigger required.">
                <TextInput
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••••"
                  value={crm.ghl?.apiKey}
                  onChange={e => setCrm(p => ({ ...p, ghl: { ...(p.ghl || {}), apiKey: e.target.value } }))}
                />
              </Field>
              <Field label="Inbound Webhook URL (optional)" hint="Only needed if you want GHL to push status changes back to NLV. Leave blank if unused.">
                <TextInput
                  placeholder="https://services.leadconnectorhq.com/hooks/..."
                  value={crm.ghl?.webhookUrl}
                  onChange={e => setCrm(p => ({ ...p, ghl: { ...(p.ghl || {}), webhookUrl: e.target.value } }))}
                />
              </Field>

              {/* Register custom fields — must be run once so nlv_lead_status etc. appear on GHL contacts */}
              <div className="mt-2 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">
                  Run this once after saving your API Key + Location ID to register the <code>nlv_lead_status</code>, <code>nlv_assigned_to</code>, and other NLV custom fields in your GHL location. Safe to re-run.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={registeringFields}
                  onClick={async () => {
                    if (!crm.ghl?.apiKey || !crm.ghl?.locationId) {
                      addToast({ type: 'error', title: 'Missing GHL config', desc: 'Save your API Key and Location ID first.' });
                      return;
                    }
                    setRegisteringFields(true);
                    setRegisterResults(null);
                    try {
                      const results = await registerCustomFields({ apiKey: crm.ghl.apiKey, locationId: crm.ghl.locationId });
                      setRegisterResults(results);
                      const created = results.filter(r => r.status === 'created').length;
                      const skipped = results.filter(r => r.status === 'skipped').length;
                      const errors  = results.filter(r => r.status === 'error').length;
                      if (errors === 0) {
                        addToast({ type: 'success', title: 'GHL Custom Fields Ready', desc: `${created} created, ${skipped} already existed.` });
                      } else {
                        addToast({ type: 'error', title: `${errors} field(s) failed`, desc: 'Check console for details.' });
                      }
                    } catch (err) {
                      addToast({ type: 'error', title: 'Registration failed', desc: err.message });
                    } finally {
                      setRegisteringFields(false);
                    }
                  }}
                >
                  {registeringFields ? 'Registering…' : 'Register GHL Custom Fields'}
                </Button>
                {registerResults && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {registerResults.map(r => (
                      <span
                        key={r.field}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: r.status === 'created' ? '#DCFCE7' : r.status === 'error' ? '#FEE2E2' : '#F3F4F6',
                          color:      r.status === 'created' ? '#166534' : r.status === 'error' ? '#991B1B' : '#6B7280',
                        }}
                      >
                        {r.field} {r.status === 'created' ? '✓' : r.status === 'error' ? '✗' : '–'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

      </div>
    </AppLayout>
  );
}
