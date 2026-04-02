import { useState, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { pricingService } from '../../../../services/pricing.service';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import {
  HiCurrencyDollar,
  HiCheckCircle,
  HiXCircle,
  HiPencil,
  HiCheck,
  HiXMark,
  HiHomeModern,
} from 'react-icons/hi2';

const P      = '#D4AF37';
const DEEP   = '#1F4D3A';
const OS     = '#111111';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';
const SURF   = '#F9FAFB';

// ── Inline editable cell ──────────────────────────────────────────────────────
function EditablePrice({ value, onSave, prefix = '$' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0) { onSave(num); }
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 13, color: LGRAY }}>{prefix}</span>
        <input
          autoFocus
          type="number"
          min="0"
          step="0.01"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          style={{
            width: 80, padding: '3px 6px', border: `1px solid ${P}`,
            borderRadius: 6, fontSize: 13, outline: 'none',
          }}
        />
        <button onClick={commit} style={{ color: '#22C55E', background: 'none', border: 'none', cursor: 'pointer' }}>
          <HiCheck size={16} />
        </button>
        <button onClick={() => setEditing(false)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>
          <HiXMark size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 15, fontWeight: 700, color: OS, padding: 0,
      }}
      title="Click to edit"
    >
      {prefix}{typeof value === 'number' ? value.toFixed(2) : value}
      <HiPencil size={12} color={LGRAY} />
    </button>
  );
}

function EditableText({ value, onSave, multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => { if (draft.trim()) onSave(draft.trim()); setEditing(false); };

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {multiline ? (
          <textarea
            autoFocus
            rows={3}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            style={{ padding: '4px 8px', border: `1px solid ${P}`, borderRadius: 6, fontSize: 13, resize: 'vertical', outline: 'none', width: '100%' }}
          />
        ) : (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            style={{ padding: '3px 8px', border: `1px solid ${P}`, borderRadius: 6, fontSize: 13, outline: 'none' }}
          />
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={commit} style={{ color: '#22C55E', background: 'none', border: 'none', cursor: 'pointer' }}><HiCheck size={15} /></button>
          <button onClick={() => setEditing(false)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}><HiXMark size={15} /></button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'inline-flex', alignItems: 'flex-start', gap: 4, padding: 0 }}
      title="Click to edit"
    >
      <span style={{ fontSize: 13, color: OS }}>{value}</span>
      <HiPencil size={11} color={LGRAY} style={{ flexShrink: 0, marginTop: 2 }} />
    </button>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? '#22C55E' : '#D1D5DB',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

// ── Features editor ───────────────────────────────────────────────────────────
function FeaturesEditor({ features, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(features.join('\n'));

  const save = () => {
    const arr = draft.split('\n').map(s => s.trim()).filter(Boolean);
    onChange(arr);
    setOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {features.slice(0, 3).map((f, i) => (
          <span key={i} style={{ fontSize: 11, background: '#F3F4F6', color: LGRAY, borderRadius: 4, padding: '2px 6px' }}>
            {f}
          </span>
        ))}
        {features.length > 3 && (
          <span style={{ fontSize: 11, color: LGRAY }}>+{features.length - 3} more</span>
        )}
      </div>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ fontSize: 11, color: P, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Edit features
        </button>
      ) : (
        <div style={{ marginTop: 4 }}>
          <textarea
            autoFocus
            rows={6}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="One feature per line"
            style={{ width: '100%', padding: '6px 8px', border: `1px solid ${P}`, borderRadius: 6, fontSize: 12, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button onClick={save} style={{ fontSize: 12, color: '#fff', background: '#22C55E', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer' }}>Save</button>
            <button onClick={() => setOpen(false)} style={{ fontSize: 12, color: LGRAY, background: '#F3F4F6', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminPricingPage() {
  const { addToast } = useToast();
  const { profile } = useAuth();
  const actorId = profile?.id ?? 'system';

  const [plans, setPlans] = useState([]);
  const [listingPrices, setListingPrices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [p, l] = await Promise.all([
        pricingService.getPricingPlans(),
        pricingService.getListingPrices(),
      ]);
      setPlans(p);
      setListingPrices(l);
      setIsLoading(false);
    }
    load();
  }, []);

  // ── Plan field save ──────────────────────────────────────────────────────
  const savePlanField = async (plan, field, value) => {
    const key = `plan-${plan.id}-${field}`;
    setSaving(s => ({ ...s, [key]: true }));
    const { error } = await pricingService.updatePricingPlan(plan.id, { [field]: value }, actorId);
    setSaving(s => ({ ...s, [key]: false }));
    if (error) {
      addToast({ type: 'error', title: 'Save failed', desc: error });
    } else {
      setPlans(ps => ps.map(p => p.id === plan.id ? { ...p, [field]: value } : p));
      addToast({ type: 'success', title: 'Saved', desc: `${plan.name} ${field.replace(/_/g, ' ')} updated.` });
    }
  };

  // ── Listing price field save ──────────────────────────────────────────────
  const saveListingField = async (lp, field, value) => {
    const key = `lp-${lp.id}-${field}`;
    setSaving(s => ({ ...s, [key]: true }));
    const { error } = await pricingService.updateListingPrice(lp.id, { [field]: value }, actorId);
    setSaving(s => ({ ...s, [key]: false }));
    if (error) {
      addToast({ type: 'error', title: 'Save failed', desc: error });
    } else {
      setListingPrices(ps => ps.map(p => p.id === lp.id ? { ...p, [field]: value } : p));
      addToast({ type: 'success', title: 'Saved', desc: `${lp.label} ${field.replace(/_/g, ' ')} updated.` });
    }
  };

  const PLAN_ACCENTS = {
    starter:  { bg: '#FFFBEB', border: '#FDE68A', badge: '#B8962E' },
    pro:      { bg: '#E8F3EE', border: '#BBF7D0', badge: '#15803D' },
    dominator:{ bg: '#EDE9FE', border: '#DDD6FE', badge: '#7C3AED' },
    sponsor:  { bg: '#F0F9FF', border: '#BAE6FD', badge: '#0369A1' },
  };

  return (
    <AppLayout role="admin" title="Pricing Management">
      <div style={{ padding: '28px 32px', minHeight: '100vh', background: SURF }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: OS, marginBottom: 4 }}>Pricing Management</h1>
          <p style={{ fontSize: 13, color: LGRAY }}>
            Edit subscription plan prices, features, and listing upgrade costs. Changes are saved immediately.
          </p>
        </div>

        {/* ── Subscription Plans ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <HiCurrencyDollar size={18} color={P} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: OS }}>Subscription Plans</h2>
          </div>

          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
                  <Skeleton width="120px" height="16px" className="mb-3" />
                  <Skeleton width="80px" height="28px" className="mb-2" />
                  <Skeleton width="100%" height="12px" className="mb-1" />
                  <Skeleton width="80%" height="12px" />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {plans.map(plan => {
                const accent = PLAN_ACCENTS[plan.slug] || PLAN_ACCENTS.starter;
                return (
                  <div
                    key={plan.id}
                    style={{
                      background: '#fff',
                      border: `1px solid ${plan.is_active ? accent.border : BORDER}`,
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      opacity: plan.is_active ? 1 : 0.65,
                    }}
                  >
                    {/* Card header */}
                    <div style={{ padding: '14px 18px', background: plan.is_active ? accent.bg : '#F9FAFB', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <EditableText
                          value={plan.name}
                          onSave={v => savePlanField(plan, 'name', v)}
                        />
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent.badge, display: 'block', marginTop: 2 }}>
                          {plan.slug}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: LGRAY }}>{plan.is_active ? 'Active' : 'Inactive'}</span>
                        <Toggle
                          value={plan.is_active}
                          onChange={v => savePlanField(plan, 'is_active', v)}
                          disabled={!!saving[`plan-${plan.id}-is_active`]}
                        />
                      </div>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '16px 18px' }}>
                      {/* Prices */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Monthly</div>
                          {plan.slug === 'sponsor' ? (
                            <span style={{ fontSize: 13, color: LGRAY, fontStyle: 'italic' }}>Custom</span>
                          ) : (
                            <EditablePrice
                              value={plan.monthly_price}
                              onSave={v => savePlanField(plan, 'monthly_price', v)}
                            />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Annual</div>
                          {plan.slug === 'sponsor' ? (
                            <span style={{ fontSize: 13, color: LGRAY, fontStyle: 'italic' }}>Custom</span>
                          ) : (
                            <EditablePrice
                              value={plan.annual_price}
                              onSave={v => savePlanField(plan, 'annual_price', v)}
                            />
                          )}
                        </div>
                      </div>

                      {/* Features */}
                      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                          Features ({plan.features.length})
                        </div>
                        <FeaturesEditor
                          features={plan.features}
                          onChange={v => savePlanField(plan, 'features', v)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Listing Upgrade Prices ─────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <HiHomeModern size={18} color={P} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: OS }}>Listing Upgrade Prices</h2>
          </div>

          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {isLoading ? (
              <div style={{ padding: 20 }}>
                {[1,2,3].map(i => <Skeleton key={i} width="100%" height="52px" className="mb-3" />)}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}`, background: SURF }}>
                    {['Type', 'Label', 'Price', 'Billing', 'Description', 'Active'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listingPrices.map((lp, i) => (
                    <tr
                      key={lp.id}
                      style={{
                        borderBottom: i < listingPrices.length - 1 ? `1px solid ${BORDER}` : 'none',
                        background: i % 2 === 0 ? '#fff' : SURF,
                        opacity: lp.is_active ? 1 : 0.6,
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                          padding: '3px 8px', borderRadius: 4,
                          background: lp.type === 'top' ? '#EDE9FE' : lp.type === 'featured' ? 'rgba(212,175,55,0.12)' : '#F3F4F6',
                          color: lp.type === 'top' ? '#7C3AED' : lp.type === 'featured' ? '#B8962E' : '#4B5563',
                        }}>
                          {lp.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <EditableText value={lp.label} onSave={v => saveListingField(lp, 'label', v)} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <EditablePrice value={lp.price} onSave={v => saveListingField(lp, 'price', v)} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: LGRAY }}>
                        {lp.billing_cycle === 'monthly' ? '/mo' : 'One-time'}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 240 }}>
                        <EditableText
                          value={lp.description ?? ''}
                          onSave={v => saveListingField(lp, 'description', v)}
                          multiline
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Toggle
                          value={lp.is_active}
                          onChange={v => saveListingField(lp, 'is_active', v)}
                          disabled={!!saving[`lp-${lp.id}-is_active`]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Info footer */}
        <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(212,175,55,0.08)', border: `1px solid rgba(212,175,55,0.25)`, borderRadius: 8 }}>
          <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
            <strong>Note:</strong> Price changes are saved immediately to the database. Stripe price IDs must be updated separately in the Stripe dashboard and configured via environment variables or the CRM Settings section.
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
