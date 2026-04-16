import { useState, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { pricingService } from '../../../../services/pricing.service';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import PlanEditModal from '../../../components/modals/PlanEditModal';
import ListingPriceEditModal from '../../../components/modals/ListingPriceEditModal';
import {
  HiCurrencyDollar,
  HiCheckCircle,
  HiXCircle,
  HiPencil,
  HiHomeModern,
  HiChevronRight,
  HiCog6Tooth
} from 'react-icons/hi2';

const P      = '#D4AF37';
const DEEP   = '#1F4D3A';
const OS     = '#111111';
const OSV    = '#6B7280';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';
const SURF   = '#F9FAFB';


// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminPricingPage() {
  const { addToast } = useToast();
  const { profile } = useAuth();
  const actorId = profile?.id ?? 'system';

  const [plans, setPlans] = useState([]);
  const [listingPrices, setListingPrices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingListingPrice, setEditingListingPrice] = useState(null);

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

  const handleUpdatePlan = async (updates) => {
    if (!editingPlan) return;
    setIsSubmitting(true);
    const { data, error } = await pricingService.updatePricingPlan(editingPlan.id, updates, actorId);
    setIsSubmitting(false);

    if (error) {
      addToast({ type: 'error', title: 'Update failed', desc: error });
    } else {
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, ...updates } : p));
      setEditingPlan(null);
      addToast({ type: 'success', title: 'Plan Updated', desc: 'Subscription plan changes have been saved.' });
    }
  };

  const handleUpdateListingPrice = async (updates) => {
    if (!editingListingPrice) return;
    setIsSubmitting(true);
    const { data, error } = await pricingService.updateListingPrice(editingListingPrice.id, updates, actorId);
    setIsSubmitting(false);

    if (error) {
      addToast({ type: 'error', title: 'Update failed', desc: error });
    } else {
      setListingPrices(prev => prev.map(p => p.id === editingListingPrice.id ? { ...p, ...updates } : p));
      setEditingListingPrice(null);
      addToast({ type: 'success', title: 'Pricing Updated', desc: 'Listing upgrade price has been updated.' });
    }
  };

  // Slug → display label (DB slugs are immutable; names come from the DB)
  const PLAN_ACCENTS = {
    starter:  { bg: '#E8F3EE', border: '#BBF7D0', badge: '#1F4D3A', label: 'Intro'         },
    pro:      { bg: '#FFFBEB', border: '#FDE68A', badge: '#B8962E', label: 'Pro Agent'     },
    dominator:{ bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.35)', badge: '#B8962E', label: 'Dominator'    },
    sponsor:  { bg: '#1A202C', border: 'rgba(212,175,55,0.3)', badge: '#D4AF37', label: 'Market Owner' },
  };

  return (
    <AppLayout role="admin" title="Pricing Management">
      <div style={{ padding: 'clamp(16px, 4vw, 32px)', minHeight: '100vh', background: SURF }}>

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
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: OS, margin: 0 }}>{plan.name}</h3>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent.badge, display: 'block', marginTop: 2 }}>
                          {plan.slug}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ 
                          fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
                          background: plan.is_active ? '#22C55E' : '#D1D5DB', color: '#fff' 
                        }}>
                          {plan.is_active ? 'Active' : 'Hidden'}
                        </span>
                        <button 
                          onClick={() => setEditingPlan(plan)}
                          style={{ padding: 6, borderRadius: 6, border: `1px solid ${BORDER}`, background: '#fff', color: OSV, cursor: 'pointer' }}
                        >
                          <HiCog6Tooth size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '16px 18px' }}>
                      {/* Prices */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Monthly</div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: OS }}>
                            {plan.slug === 'sponsor' ? 'Custom' : `$${plan.monthly_price}`}
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Annual</div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: OS }}>
                            {plan.slug === 'sponsor' ? 'Custom' : `$${plan.annual_price}`}
                          </span>
                        </div>
                      </div>

                      {/* Features preview */}
                      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                          Features ({plan.features.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {plan.features.slice(0, 3).map((f, i) => (
                            <span key={i} style={{ fontSize: 10, background: '#F3F4F6', color: LGRAY, borderRadius: 4, padding: '2px 6px' }}>
                              {f}
                            </span>
                          ))}
                          {plan.features.length > 3 && (
                            <span style={{ fontSize: 10, color: LGRAY }}>+{plan.features.length - 3}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 16 }}>
                        <Button variant="outline" size="sm" fullWidth onClick={() => setEditingPlan(plan)}>
                          Edit Details
                        </Button>
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
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
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
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: OS }}>
                          {lp.label}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: OS }}>
                          ${lp.price}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: LGRAY }}>
                          {lp.billing_cycle === 'monthly' ? 'Monthly' : 'One-time'}
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: 300 }}>
                          <div style={{ fontSize: 12, color: LGRAY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lp.description || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: lp.is_active ? '#22C55E' : DEEP, opacity: 0.8 }}>
                              {lp.is_active ? 'ACTIVE' : 'OFF'}
                            </span>
                            <button 
                              onClick={() => setEditingListingPrice(lp)}
                              style={{ padding: 6, borderRadius: 6, background: '#fff', border: `1px solid ${BORDER}`, color: OSV, cursor: 'pointer' }}
                            >
                              <HiCog6Tooth size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>

        {/* Info footer */}
        <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(212,175,55,0.08)', border: `1px solid rgba(212,175,55,0.25)`, borderRadius: 8 }}>
          <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
            <strong>Note:</strong> Price changes are saved immediately to the database. Stripe price IDs must be updated separately in the Stripe dashboard and configured via the Edit modal if they change.
          </p>
        </div>

        {/* Modals */}
        <PlanEditModal
          open={!!editingPlan}
          onClose={() => setEditingPlan(null)}
          plan={editingPlan}
          isLoading={isSubmitting}
          onSave={handleUpdatePlan}
        />

        <ListingPriceEditModal
          open={!!editingListingPrice}
          onClose={() => setEditingListingPrice(null)}
          listingPrice={editingListingPrice}
          isLoading={isSubmitting}
          onSave={handleUpdateListingPrice}
        />

      </div>
    </AppLayout>
  );
}
