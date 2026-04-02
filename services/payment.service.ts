import { supabase } from '../src/lib/supabase';
import { adminApi } from '../lib/api';
import {
  Payment,
  PaymentFilters,
  PaymentStatus,
  PaymentType,
  UpgradeType,
} from '../types/payment.types';
import { commissionService } from './commission.service';

export interface PaymentStats {
  total_revenue: number;
  mrr: number;
  succeeded_count: number;
  failed_count: number;
  refunded_amount: number;
  by_type: Record<PaymentType, number>;
}

export const paymentService = {
  /**
   * Fetch payments with optional filters.
   */
  getPayments: async (filters: PaymentFilters = {}) => {
    let query = supabase
      .from('payments')
      .select('*, user:profiles!user_id(full_name, email)')
      .order('created_at', { ascending: false });

    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.date_from) query = query.gte('created_at', filters.date_from);
    if (filters.date_to) query = query.lte('created_at', filters.date_to);

    return adminApi.request<Payment[]>(query as any);
  },

  /**
   * Record a new payment — Stripe webhook handler ready.
   * @param data - payment fields (stripe_payment_id can be set after webhook)
   */
  createPayment: async (
    data: Omit<Payment, 'id' | 'created_at' | 'user'>
  ) => {
    return adminApi.request<Payment>(
      supabase
        .from('payments')
        .insert(data)
        .select()
        .single() as any
    );
  },

  /**
   * Get full payment history for a specific user.
   */
  getPaymentsByUser: async (userId: string) => {
    return adminApi.request<Payment[]>(
      supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }) as any
    );
  },

  /**
   * Process a listing upgrade payment.
   * Creates a payment record, updates the listing tier, and triggers a commission.
   * @param listingId - the listing to upgrade
   * @param upgradeType - 'standard' | 'featured' | 'top'
   * @param userId - the realtor paying for the upgrade
   */
  processListingUpgrade: async (
    listingId: string,
    upgradeType: UpgradeType,
    userId: string
  ) => {
    // Fetch the authoritative price from listing_prices table (not a hardcoded constant).
    // This is an admin-only manual record path (payments_insert_admin RLS applies).
    // All real user payments flow through Stripe checkout → stripe-webhook.
    const { data: priceRow, error: priceErr } = await supabase
      .from('listing_prices')
      .select('price')
      .eq('type', upgradeType)
      .eq('is_active', true)
      .maybeSingle();

    if (priceErr || !priceRow) {
      return {
        data: null,
        error: priceErr ?? new Error(`No active price found for upgrade type: ${upgradeType}`),
      };
    }

    const amount = Number(priceRow.price);

    // 1. Create payment record
    const { data: payment, error: paymentError } = await adminApi.request<Payment>(
      supabase
        .from('payments')
        .insert({
          user_id: userId,
          type: 'listing_upgrade' as PaymentType,
          amount,
          status: 'succeeded' as PaymentStatus,
          stripe_payment_id: null,
          description: `Listing upgrade to ${upgradeType} tier`,
        })
        .select()
        .single() as any
    );

    if (paymentError || !payment) {
      return { data: null, error: paymentError || new Error('Payment creation failed') };
    }

    // 2. Update listing upgrade tier
    const { error: listingError } = await supabase
      .from('listings')
      .update({ upgrade_type: upgradeType })
      .eq('id', listingId);

    if (listingError) {
      console.error('Failed to update listing tier:', listingError);
    }

    // 3. Trigger multi-role commission calculation and recording
    const { error: commError } = await commissionService.processTransactionCommissions({
      transactionId: payment.id,
      amount,
      type: 'listing',
      realtorId: userId,
      listingId,
    });

    if (commError) {
      console.error('Failed to process commissions:', commError);
    }

    return { data: payment, error: null };
  },

  /**
   * Admin stats: total revenue, MRR, counts by status and type.
   */
  getPaymentStats: async (): Promise<PaymentStats> => {
    const { data, error } = await supabase
      .from('payments')
      .select('status, type, amount');

    if (error || !data) {
      console.error('Payment stats error:', error);
      return {
        total_revenue: 0,
        mrr: 0,
        succeeded_count: 0,
        failed_count: 0,
        refunded_amount: 0,
        by_type: { subscription: 0, listing_upgrade: 0 },
      };
    }

    const stats: PaymentStats = {
      total_revenue: 0,
      mrr: 0,
      succeeded_count: 0,
      failed_count: 0,
      refunded_amount: 0,
      by_type: { subscription: 0, listing_upgrade: 0 },
    };

    for (const row of data) {
      if (row.status === 'succeeded') {
        stats.total_revenue += row.amount;
        stats.succeeded_count++;
        if (row.type === 'subscription') stats.mrr += row.amount;
        if (row.type in stats.by_type) {
          stats.by_type[row.type as PaymentType] += row.amount;
        }
      }
      if (row.status === 'failed') stats.failed_count++;
      if (row.status === 'refunded') stats.refunded_amount += row.amount;
    }

    return stats;
  },

  /**
   * Mark a payment as refunded with an optional reason note.
   */
  refundPayment: async (paymentId: string, reason: string) => {
    return adminApi.request<Payment>(
      supabase
        .from('payments')
        .update({
          status: 'refunded' as PaymentStatus,
          description: reason,
        })
        .eq('id', paymentId)
        .select()
        .single() as any
    );
  },
};
