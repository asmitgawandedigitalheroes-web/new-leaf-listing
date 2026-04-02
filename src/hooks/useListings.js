import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../../services/notification.service';

// Tier priority for marketplace display: lower number = higher priority
const TIER_PRIORITY = { top: 1, featured: 2, standard: 3 };

/** Write to the generic audit_logs table — fire-and-forget, never throws. */
async function audit(userId, action, entityId, meta = {}) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: 'listing',
    entity_id: entityId,
    timestamp: new Date().toISOString(),
    metadata: meta,
  });
}

/** Write to listing_audit_log for per-listing history — fire-and-forget. */
async function listingAuditLog(listingId, action, performedBy, prevStatus, newStatus, meta = {}) {
  await supabase.from('listing_audit_log').insert({
    listing_id: listingId,
    action,
    previous_status: prevStatus ?? null,
    new_status: newStatus ?? null,
    performed_by: performedBy,
    metadata: meta,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Hook to manage listings with real Supabase data.
 * Handles fetching, creation, and the full status pipeline.
 *
 * Status pipeline:
 *   draft → pending (submit for approval) → active → under_contract → sold
 *                                         ↘ expired (auto or manual)
 *   pending → rejected (with reason) → draft (realtor can fix and resubmit)
 */
export function useListings(filters = {}) {
  const { user, role, profile: authProfile, subscription } = useAuth();
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('listings')
        .select(`
          *,
          realtor:profiles!listings_realtor_id_fkey(full_name, email, avatar_url),
          territory:territories(city, state)
        `)
        .order('created_at', { ascending: false });

      // RBAC Filtering
      if (role === 'realtor') {
        query = query.eq('realtor_id', user.id);
      } else if (role === 'director') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('territory_id')
          .eq('id', user.id)
          .single();

        if (profile?.territory_id) {
          query = query.eq('territory_id', profile.territory_id);
        }
        // If director has no territory_id, they see nothing (not all leads)
        else {
          setListings([]);
          setIsLoading(false);
          return;
        }
      }
      // admin: no filter applied — sees all listings

      // Additional filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.upgradeType === 'featured') {
        query = query.in('upgrade_type', ['featured', 'top']);
      }
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setListings(data || []);
    } catch (err) {
      console.error('[useListings] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, role, filters.status, filters.upgradeType, filters.search]);

  useEffect(() => {
    if (user) {
      fetchListings();
    } else {
      setIsLoading(false);
    }
  }, [fetchListings, user]);

  // ── Create ──────────────────────────────────────────────────────────────────

  const createListing = async (listingData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('listings')
        .insert({
          ...listingData,
          realtor_id: user.id,
          territory_id: listingData.territory_id || authProfile?.territory_id || null,
          status: 'draft', // Always start as draft — realtor must explicitly submit for approval
          upgrade_type: listingData.upgrade_type || 'standard',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setListings(prev => [data, ...prev]);
      audit(user.id, 'listing.created', data.id, { title: data.title }).catch(() => {});
      listingAuditLog(data.id, 'listing.created', user.id, null, 'draft').catch(() => {});
      return { data, error: null };
    } catch (err) {
      console.error('[useListings] Create error:', err);
      return { data: null, error: err };
    }
  };

  // ── Generic status update (internal use) ────────────────────────────────────

  const _updateStatus = async (id, status, extraFields = {}, auditMeta = {}) => {
    try {
      const prevListing = listings.find(l => l.id === id);
      const prevStatus = prevListing?.status ?? null;

      const payload = {
        status,
        updated_at: new Date().toISOString(),
        ...extraFields,
      };

      const { data, error: updateError } = await supabase
        .from('listings')
        .update(payload)
        .eq('id', id)
        .select();

      if (updateError) throw updateError;

      const actionMap = {
        active:           'listing.approved',
        rejected:         'listing.rejected',
        draft:            'listing.returned_to_draft',
        sold:             'listing.marked_sold',
        expired:          'listing.expired',
        pending:          'listing.submitted_for_review',
        under_contract:   'listing.under_contract',
      };
      const action = actionMap[status] || 'listing.status_changed';

      audit(user.id, action, id, { status, ...auditMeta }).catch(() => {});
      listingAuditLog(id, action, user.id, prevStatus, status, auditMeta).catch(() => {});

      // Email Notifications
      if (prevListing?.realtor_id) {
        if (status === 'active') {
          notificationService.notifyListingApproved(id, prevListing.realtor_id).catch(console.error);
        } else if (status === 'draft' && prevStatus === 'pending') {
          notificationService.notifyListingRejected(id, prevListing.realtor_id, auditMeta.reason || 'Did not meet requirements').catch(console.error);
        }
      }

      if (data && data.length > 0) {
        setListings(prev => prev.map(l => l.id === id ? data[0] : l));
        return { data: data[0], error: null };
      } else {
        setListings(prev => prev.map(l => l.id === id ? { ...l, status, ...extraFields } : l));
        await fetchListings();
        return { data: { id, status }, error: null };
      }
    } catch (err) {
      console.error('[useListings] Update status error:', err);
      return { data: null, error: err };
    }
  };

  // ── Update listing fields ────────────────────────────────────────────────────

  const updateListing = async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('listings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      setListings(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
      audit(user.id, 'listing.updated', id, { fields: Object.keys(updates) }).catch(() => {});
      return { data, error: null };
    } catch (err) {
      console.error('[useListings] Update error:', err);
      return { data: null, error: err };
    }
  };

  // ── Status pipeline functions ────────────────────────────────────────────────

  /**
   * Realtor submits a draft (or rejected) listing for admin/director review.
   * Validates that the realtor has an active subscription.
   */
  const submitForApproval = async (id) => {
    // Subscription gate: only active/trialing subscriptions can submit
    const subStatus = subscription?.status;
    if (subStatus !== 'active' && subStatus !== 'trialing') {
      return {
        data: null,
        error: new Error('An active subscription is required to submit a listing for review.'),
      };
    }

    const listing = listings.find(l => l.id === id);
    if (!listing) return { data: null, error: new Error('Listing not found.') };
    if (listing.status !== 'draft' && listing.status !== 'rejected') {
      return { data: null, error: new Error('Only draft or rejected listings can be submitted for approval.') };
    }

    return _updateStatus(id, 'pending', { rejection_reason: null });
  };

  /**
   * Admin/Director approves a pending listing.
   * Sets status → active, records approved_by and approved_at.
   */
  const approveListing = async (id) => {
    return _updateStatus(id, 'active', {
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      // Set default expiry to 90 days from now if not already set
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
  };

  /**
   * Admin/Director rejects a pending listing with an optional reason.
   * Sets status → draft so the realtor can fix and resubmit.
   */
  const rejectListing = async (id, reason = '') => {
    return _updateStatus(id, 'draft', {
      rejection_reason: reason || 'Rejected by reviewer.',
    }, { reason });
  };

  /**
   * Mark a listing as Under Contract (active → under_contract).
   * Authorized: admin, director, or the listing's realtor.
   */
  const markUnderContract = (id) => _updateStatus(id, 'under_contract');

  /**
   * Mark a listing as Sold (active or under_contract → sold).
   */
  const markSold = (id) => _updateStatus(id, 'sold');

  /**
   * Mark a listing as Expired (active → expired).
   */
  const archiveListing = (id) => _updateStatus(id, 'expired');

  /**
   * Check all listings for expired ones and update their status.
   * Call this on mount for admin/director views.
   */
  const expireOverdueListings = async () => {
    const now = new Date().toISOString();
    try {
      const { data, error: updateError } = await supabase
        .from('listings')
        .update({ status: 'expired', updated_at: now })
        .eq('status', 'active')
        .lt('expires_at', now)
        .select('id');

      if (updateError) throw updateError;

      if (data && data.length > 0) {
        console.log(`[useListings] Auto-expired ${data.length} listing(s)`);
        // Update local state
        const expiredIds = data.map(l => l.id);
        setListings(prev => prev.map(l =>
          expiredIds.includes(l.id) ? { ...l, status: 'expired' } : l
        ));
      }
      return { count: data?.length ?? 0, error: null };
    } catch (err) {
      console.error('[useListings] Expire overdue error:', err);
      return { count: 0, error: err };
    }
  };

  // ── Upgrade type pipeline ───────────────────────────────────────────────────

  const setUpgradeType = async (id, upgradeType) => {
    // Revenue protection: realtors MUST pay via Stripe before upgrading.
    // Only admin/director can set upgrade_type directly (manual override).
    if (role === 'realtor') {
      return {
        data: null,
        error: new Error('Listing upgrades require payment. Please use the Upgrade button to complete checkout.'),
      };
    }

    try {
      const { data, error: updateError } = await supabase
        .from('listings')
        .update({ upgrade_type: upgradeType, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (updateError) throw updateError;

      const upgradeActionMap = {
        featured: 'listing.featured',
        top:      'listing.promoted_top',
        standard: 'listing.unfeatured',
      };
      audit(user.id, upgradeActionMap[upgradeType] || 'listing.upgrade_changed', id, { upgrade_type: upgradeType }).catch(() => {});

      if (data && data.length > 0) {
        setListings(prev => prev.map(l => l.id === id ? data[0] : l));
        return { data: data[0], error: null };
      } else {
        setListings(prev => prev.map(l => l.id === id ? { ...l, upgrade_type: upgradeType } : l));
        await fetchListings();
        return { data: { id, upgrade_type: upgradeType }, error: null };
      }
    } catch (err) {
      console.error('[useListings] Update upgrade type error:', err);
      return { data: null, error: err };
    }
  };

  return {
    listings,
    isLoading,
    error,
    refresh: fetchListings,
    createListing,
    updateListing,
    expireOverdueListings,
    // Status pipeline
    submitForApproval,        // draft/rejected → pending (requires active subscription)
    approveListing,           // pending → active (admin/director only)
    rejectListing,            // pending → draft with reason (admin/director only)
    markUnderContract,        // active → under_contract
    markSold,                 // active/under_contract → sold
    archiveListing,           // active → expired
    setUpgradeType,           // set upgrade tier (admin/director) or initiate Stripe (realtor)
  };
}

export default useListings;              