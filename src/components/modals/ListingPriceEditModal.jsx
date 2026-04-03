import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { HiCurrencyDollar, HiInformationCircle, HiTag } from 'react-icons/hi2';

export default function ListingPriceEditModal({ open, onClose, listingPrice, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    label: '',
    price: 0,
    billing_cycle: 'one-time',
    description: '',
    is_active: true,
    stripe_price_id: '',
  });

  useEffect(() => {
    if (listingPrice && open) {
      setFormData({
        label: listingPrice.label || '',
        price: listingPrice.price || 0,
        billing_cycle: listingPrice.billing_cycle || 'one-time',
        description: listingPrice.description || '',
        is_active: listingPrice.is_active ?? true,
        stripe_price_id: listingPrice.stripe_price_id || '',
      });
    }
  }, [listingPrice, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${listingPrice?.label || 'Listing Price'}`}
      maxWidth="500px"
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
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Label & Type Display */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Display Label
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={e => setFormData(s => ({ ...s, label: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#D4AF37]"
              required
            />
          </div>
          <div className="text-right">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Type
            </label>
            <span className="inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 rounded border border-gray-200">
              {listingPrice?.type}
            </span>
          </div>
        </div>

        {/* Price & Billing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Price ($)
            </label>
            <div className="relative">
              <HiCurrencyDollar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={e => setFormData(s => ({ ...s, price: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Billing Cycle
            </label>
            <select
              value={formData.billing_cycle}
              onChange={e => setFormData(s => ({ ...s, billing_cycle: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#D4AF37] bg-white h-[38px]"
            >
              <option value="one-time">One-time</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        {/* Stripe Configuration */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Stripe Price ID (Optional)
          </label>
          <input
            type="text"
            value={formData.stripe_price_id}
            onChange={e => setFormData(s => ({ ...s, stripe_price_id: e.target.value }))}
            placeholder="price_..."
            className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg"
          />
        </div>

        {/* Status */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-700">Active Status</div>
            <div className="text-[10px] text-gray-500">Enable or disable this upgrade in the checkout page.</div>
          </div>
          <button
            type="button"
            onClick={() => setFormData(s => ({ ...s, is_active: !s.is_active }))}
            className={`relative w-10 h-5 rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Public Description
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={e => setFormData(s => ({ ...s, description: e.target.value }))}
            placeholder="Describe what the user gets with this upgrade..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#D4AF37] resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
