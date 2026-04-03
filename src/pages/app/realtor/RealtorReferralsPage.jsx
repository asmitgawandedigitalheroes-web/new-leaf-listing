import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import {
  HiSparkles,
  HiLockClosed,
  HiCurrencyDollar,
  HiBuildingOffice,
  HiUser,
  HiDocumentText,
  HiArrowUpRight,
  HiCheckBadge,
  HiClock,
} from 'react-icons/hi2';

const P     = '#D4AF37';
const S     = '#1F4D3A';
const OS    = '#111111';
const OSV   = '#4B5563';
const LGRAY = '#6B7280';
const BORDER = '#E5E7EB';

// Plans that have Pro Agent+ access to the referral system
const PRO_PLANS = ['pro', 'dominator', 'sponsor'];

const defaultForm = {
  project_name: '',
  project_value: '',
  project_description: '',
  client_name: '',
};

const defaultErrors = {
  project_name: '',
  project_value: '',
  client_name: '',
};

function validateReferralForm(form) {
  const errs = { ...defaultErrors };
  if (!form.project_name.trim() || form.project_name.trim().length < 2) {
    errs.project_name = 'Please enter the project name (min 2 characters)';
  }
  if (form.project_name.trim().length > 100) {
    errs.project_name = 'Project name must be under 100 characters';
  }
  if (!form.client_name.trim() || form.client_name.trim().length < 2) {
    errs.client_name = "Please enter the client's full name";
  }
  const val = parseFloat(form.project_value);
  if (!form.project_value || isNaN(val) || val <= 0) {
    errs.project_value = 'Please enter a valid positive project value';
  }
  return errs;
}

function StatusBadge({ status }) {
  const cfg = {
    pending:  { bg: '#FEF9C3', color: '#854D0E', label: 'Pending' },
    approved: { bg: '#DCFCE7', color: '#166534', label: 'Approved' },
    paid:     { bg: '#DBEAFE', color: '#1D4ED8', label: 'Paid' },
    rejected: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
  }[status] ?? { bg: '#F3F4F6', color: '#374151', label: status };
  return (
    <span
      style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}
    >
      {cfg.label}
    </span>
  );
}

export default function RealtorReferralsPage() {
  useDocumentTitle('NLV Referrals');
  const { profile, subscription } = useAuth();
  const { addToast } = useToast();

  const [form, setForm]           = useState(defaultForm);
  const [formErrors, setFormErrors] = useState(defaultErrors);
  const [touched, setTouched]     = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading]     = useState(true);

  const plan = subscription?.plan ?? null;
  const hasAccess = PRO_PLANS.includes(plan);

  // Fetch existing referral commissions for this user
  useEffect(() => {
    if (!profile?.id || !hasAccess) { setLoading(false); return; }
    supabase
      .from('commissions')
      .select('id, amount, status, created_at, metadata')
      .eq('recipient_user_id', profile.id)
      .eq('type', 'referral')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          addToast({ type: 'error', title: 'Failed to load referrals', desc: error.message });
        } else {
          setReferrals(data || []);
        }
        setLoading(false);
      });
  }, [profile?.id, hasAccess]);

  const handleBlur = (field) => {
    setTouched(t => ({ ...t, [field]: true }));
    const errs = validateReferralForm(form);
    setFormErrors(errs);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    // Touch all fields to show all errors
    setTouched({ project_name: true, project_value: true, client_name: true });
    const errs = validateReferralForm(form);
    setFormErrors(errs);
    if (Object.values(errs).some(v => v)) return;

    const projectValue = parseFloat(form.project_value);
    setSubmitting(true);
    const commissionAmount = +(projectValue * 0.005).toFixed(2); // 0.5%

    const { data, error } = await supabase
      .from('commissions')
      .insert({
        recipient_user_id: profile.id,
        type: 'referral',
        amount: commissionAmount,
        status: 'pending',
        metadata: {
          project_name: form.project_name.trim(),
          project_value: projectValue,
          project_description: form.project_description.trim(),
          client_name: form.client_name.trim(),
        },
      })
      .select()
      .single();

    setSubmitting(false);
    if (error) {
      setSubmitError(error.message || 'Submission failed. Please try again.');
      addToast({ type: 'error', title: 'Submission failed', desc: error.message });
    } else {
      addToast({
        type: 'success',
        title: 'Referral submitted!',
        desc: `Commission of $${commissionAmount.toFixed(2)} (0.5%) is now pending review.`,
      });
      setReferrals(prev => [data, ...prev]);
      setForm(defaultForm);
      setFormErrors(defaultErrors);
      setTouched({});
      setSubmitError('');
    }
  };

  const update = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const inputClass = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 bg-white';
  const labelClass = 'block text-xs font-semibold uppercase tracking-widest mb-1.5 text-gray-500';

  // Upgrade prompt for starter / null plan users
  if (!hasAccess) {
    return (
      <AppLayout role="realtor" title="NLV Referrals">
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: `${P}14` }}
          >
            <HiLockClosed size={36} color={P} />
          </div>
          <div>
            <h2 className="text-2xl font-black mb-2" style={{ color: OS }}>Pro Agent+ Feature</h2>
            <p className="text-sm max-w-sm" style={{ color: OSV }}>
              The NLV Referral System is available to <strong>Pro, Dominator, and Sponsor</strong> plan members.
              Submit NLV product referrals and earn 0.5% commission on every deal you close.
            </p>
          </div>
          <div
            className="rounded-2xl p-6 max-w-xs text-left"
            style={{ background: `${S}08`, border: `1px solid ${S}20` }}
          >
            <p className="text-sm font-bold mb-3" style={{ color: S }}>Unlock with Pro Agent+</p>
            <ul className="flex flex-col gap-2">
              {['Submit NLV product referrals', 'Earn 0.5% on project value', 'Track all your commissions', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: OSV }}>
                  <HiCheckBadge size={16} color={P} /> {f}
                </li>
              ))}
            </ul>
          </div>
          <Link to="/realtor/billing">
            <Button size="lg">
              <HiArrowUpRight size={16} /> Upgrade Plan
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="realtor" title="NLV Referrals">
      <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div>
          <h2 className="text-xl font-black mb-1" style={{ color: OS }}>NLV Referral Program</h2>
          <p className="text-sm" style={{ color: OSV }}>
            Submit a referral for an NLV product deal. You earn <strong>0.5% commission</strong> on the total project value.
          </p>
        </div>

        {/* Submission Form */}
        <div
          className="rounded-2xl p-6"
          style={{ background: '#fff', border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-bold text-base mb-5" style={{ color: OS }}>Submit New Referral</h3>
          {submitError && (
            <div className="col-span-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-2">
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
            <div>
              <label className={labelClass}>Project Name *</label>
              <div className="relative">
                <HiBuildingOffice size={15} color={LGRAY} className="absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className={inputClass + ' pl-9' + (touched.project_name && formErrors.project_name ? ' border-red-400' : '')}
                  placeholder="e.g. Downtown Office Renovation"
                  value={form.project_name}
                  onChange={e => { update('project_name')(e); if (touched.project_name) { const errs = validateReferralForm({...form, project_name: e.target.value}); setFormErrors(errs); } }}
                  onBlur={() => handleBlur('project_name')}
                />
              </div>
              {touched.project_name && formErrors.project_name && (
                <p className="text-xs mt-1 text-red-500">{formErrors.project_name}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Project Value ($) *</label>
              <div className="relative">
                <HiCurrencyDollar size={15} color={LGRAY} className="absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  className={inputClass + ' pl-9' + (touched.project_value && formErrors.project_value ? ' border-red-400' : '')}
                  placeholder="e.g. 250000"
                  value={form.project_value}
                  onChange={e => { update('project_value')(e); if (touched.project_value) { const errs = validateReferralForm({...form, project_value: e.target.value}); setFormErrors(errs); } }}
                  onBlur={() => handleBlur('project_value')}
                />
              </div>
              {touched.project_value && formErrors.project_value ? (
                <p className="text-xs mt-1 text-red-500">{formErrors.project_value}</p>
              ) : form.project_value && parseFloat(form.project_value) > 0 && (
                <p className="text-xs mt-1" style={{ color: S }}>
                  Commission: ${(parseFloat(form.project_value) * 0.005).toFixed(2)} (0.5%)
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Client Name *</label>
              <div className="relative">
                <HiUser size={15} color={LGRAY} className="absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className={inputClass + ' pl-9' + (touched.client_name && formErrors.client_name ? ' border-red-400' : '')}
                  placeholder="Client full name or company"
                  value={form.client_name}
                  onChange={e => { update('client_name')(e); if (touched.client_name) { const errs = validateReferralForm({...form, client_name: e.target.value}); setFormErrors(errs); } }}
                  onBlur={() => handleBlur('client_name')}
                />
              </div>
              {touched.client_name && formErrors.client_name && (
                <p className="text-xs mt-1 text-red-500">{formErrors.client_name}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Project Description</label>
              <div className="relative">
                <HiDocumentText size={15} color={LGRAY} className="absolute left-3 top-3" />
                <textarea
                  rows={3}
                  className={inputClass + ' pl-9 resize-none'}
                  placeholder="Brief description of the project or deal…"
                  value={form.project_description}
                  onChange={update('project_description')}
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" isLoading={submitting} size="lg">
                <HiSparkles size={16} /> Submit Referral
              </Button>
            </div>
          </form>
        </div>

        {/* Past referrals */}
        <div>
          <h3 className="font-bold text-base mb-4" style={{ color: OS }}>Your Referral History</h3>
          {loading ? (
            <div className="text-sm text-center py-8" style={{ color: LGRAY }}>Loading…</div>
          ) : referrals.length === 0 ? (
            <div
              className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
              style={{ background: '#fff', border: `1px solid ${BORDER}` }}
            >
              <HiClock size={32} color={LGRAY} />
              <p className="font-semibold text-sm" style={{ color: OSV }}>No referrals yet</p>
              <p className="text-xs" style={{ color: LGRAY }}>Submit your first referral above to start earning.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {referrals.map(ref => (
                <div
                  key={ref.id}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl"
                  style={{ background: '#fff', border: `1px solid ${BORDER}` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${P}14` }}
                  >
                    <HiSparkles size={20} color={P} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: OS }}>
                      {ref.metadata?.project_name || 'Referral'}
                    </p>
                    <p className="text-xs" style={{ color: LGRAY }}>
                      Client: {ref.metadata?.client_name || '—'} &middot;{' '}
                      {new Date(ref.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm" style={{ color: S }}>${Number(ref.amount).toFixed(2)}</p>
                    <StatusBadge status={ref.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
