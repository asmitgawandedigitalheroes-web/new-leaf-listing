import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { HiCheck, HiXMark, HiPencil, HiCurrencyDollar, HiInformationCircle } from 'react-icons/hi2';

const P = '#D4AF37';
const OS = '#111111';
const OSV = '#6B7280';
const BORDER = '#E5E7EB';

export default function PlanEditModal({ open, onClose, plan, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    monthly_price: 0,
    annual_price: 0,
    features: [],
    is_active: true,
    stripe_monthly_price_id: '',
    stripe_annual_price_id: '',
  });

  useEffect(() => {
    if (plan && open) {
      setFormData({
        name: plan.name || '',
        monthly_price: plan.monthly_price || 0,
        annual_price: plan.annual_price || 0,
        features: plan.features || [],
        is_active: plan.is_active ?? true,
        stripe_monthly_price_id: plan.stripe_monthly_price_id || '',
        stripe_annual_price_id: plan.stripe_annual_price_id || '',
      });
      setFeatureDraft((plan.features || []).join('\n'));
    }
  }, [plan, open]);

  const [featureDraft, setFeatureDraft] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedFeatures = featureDraft
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    
    onSave({
      ...formData,
      features: updatedFeatures,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${plan?.name || 'Plan'}`}
      maxWidth="600px"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Plan Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(s => ({ ...s, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10"
              required
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Status
            </label>
            <div className="flex items-center gap-3 py-2">
              <button
                type="button"
                onClick={() => setFormData(s => ({ ...s, is_active: !s.is_active }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-xs font-medium text-gray-700">
                {formData.is_active ? 'Active on public pricing' : 'Hidden from public'}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Monthly Price ($)
            </label>
            <div className="relative">
              <HiCurrencyDollar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_price}
                onChange={e => setFormData(s => ({ ...s, monthly_price: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Annual Price ($)
            </label>
            <div className="relative">
              <HiCurrencyDollar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.annual_price}
                onChange={e => setFormData(s => ({ ...s, annual_price: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>
          </div>
        </div>

        {/* Stripe Configuration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#92400E]">
            <HiInformationCircle size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Stripe Configuration</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Monthly Price ID</label>
              <input
                type="text"
                value={formData.stripe_monthly_price_id}
                onChange={e => setFormData(s => ({ ...s, stripe_monthly_price_id: e.target.value }))}
                placeholder="price_..."
                className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Annual Price ID</label>
              <input
                type="text"
                value={formData.stripe_annual_price_id}
                onChange={e => setFormData(s => ({ ...s, stripe_annual_price_id: e.target.value }))}
                placeholder="price_..."
                className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg bg-white"
              />
            </div>
          </div>
        </div>

        {/* Features list */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Features (One per line)
          </label>
          <textarea
            rows={6}
            value={featureDraft}
            onChange={e => setFeatureDraft(e.target.value)}
            placeholder="e.g. Unlimited listings"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#D4AF37] min-h-[120px] resize-vertical"
          />
          <p className="mt-1.5 text-[10px] text-gray-400 italic">
            Tip: These are displayed as bullet points on the public pricing page.
          </p>
        </div>
      </form>
    </Modal>
  );
}
