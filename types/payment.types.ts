export type PaymentType = 'subscription' | 'listing_upgrade';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type UpgradeType = 'standard' | 'featured' | 'top';

export const UPGRADE_PRICES: Record<UpgradeType, number> = {
  standard: 9,
  featured: 29,
  top: 79,
};

export interface Payment {
  id: string;
  user_id: string;
  type: PaymentType;
  amount: number;
  status: PaymentStatus;
  stripe_payment_id: string | null;
  description: string | null;
  created_at: string;
  user?: { full_name: string; email: string; };
}

export interface PaymentFilters {
  user_id?: string;
  type?: PaymentType;
  status?: PaymentStatus;
  date_from?: string;
  date_to?: string;
}
