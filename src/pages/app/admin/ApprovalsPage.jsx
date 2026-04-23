import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { notificationService } from '../../../../services/notification.service';
import { createRealtorSubAccount } from '../../../../lib/ghl/createSubAccount';
import MobileCard, { MobileCardRow, MobileCardActions } from '../../../components/shared/MobileCard';
import {
  HiCheck,
  HiXMark,
  HiArrowPath,
  HiUsers,
  HiHomeModern,
  HiClock,
  HiCheckBadge,
  HiUserGroup,
  HiArrowRight,
} from 'react-icons/hi2';

// FIX: CRIT-002 — Created Approvals Queue page (was missing, /admin/approvals redirected to homepage)

const P     = '#D4AF37';
const S     = '#1F4D3A';
const OS    = '#111111';
const OSV   = '#4B5563';
const LGRAY = '#6B7280';
const BORDER = '#E5E7EB';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SectionHeader({ icon: Icon, title, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `linear-gradient(135deg, ${P}22, ${S}22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={S} />
      </div>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: OS, margin: 0 }}>{title}</h2>
        <p style={{ fontSize: 12, color: LGRAY, margin: 0 }}>{count} pending</p>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const { addToast } = useToast();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [pendingRealtors, setPendingRealtors] = useState([]);
  const [pendingListings, setPendingListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState(new Set());
  // rejection reason state: { [userId]: string }
  const [rejectReasons, setRejectReasons] = useState({});
  const [showRejectInput, setShowRejectInput] = useState(new Set());
  // listing rejection reason state
  const [listingRejectReasons, setListingRejectReasons] = useState({});
  const [showListingRejectInput, setShowListingRejectInput] = useState(new Set());

  const fetchApprovals = useCallback(async () => {
    setIsLoading(true);
    try {
      const [realtorsRes, listingsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, role, created_at, assigned_director_id, territory:territories!profiles_territory_id_fkey(city, state)')
          .eq('status', 'pending')
          .in('role', ['realtor', 'director'])
          .order('created_at', { ascending: false }),
        supabase
          .from('listings')
          .select('id, title, address, city, state, status, created_at, realtor_id, realtor:profiles!listings_realtor_id_fkey(full_name, email)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      if (realtorsRes.error) throw realtorsRes.error;
      if (listingsRes.error) throw listingsRes.error;

      setPendingRealtors(realtorsRes.data || []);
      setPendingListings(listingsRes.data || []);
    } catch (err) {
      console.error('[ApprovalsPage] fetch error:', err);
      addToast({ type: 'error', title: 'Failed to load approvals', desc: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  // ── Approve / reject a realtor ────────────────────────────────────────────────
  const handleRealtorAction = async (userId, action) => {
    const newStatus = action === 'approve' ? 'active' : 'suspended';
    const reason    = rejectReasons[userId] || '';
    setProcessing(prev => new Set(prev).add(userId));
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setPendingRealtors(prev => prev.filter(r => r.id !== userId));
      setShowRejectInput(prev => { const s = new Set(prev); s.delete(userId); return s; });
      addToast({
        type: action === 'approve' ? 'success' : 'error',
        title: action === 'approve' ? 'Realtor Approved' : 'Realtor Rejected',
        desc: action === 'approve'
          ? 'The realtor account is now active.'
          : 'The realtor application has been rejected.',
      });

      if (action === 'approve') {
        notificationService.notifyRealtorApproved(userId).then(emailSent => {
          if (!emailSent) {
            addToast({
              type: 'warning',
              title: 'Approval email not sent',
              desc: 'The realtor was approved but their confirmation email could not be delivered. Check your SMTP settings in the Supabase Dashboard.',
            });
          }
        }).catch(err => {
          console.error('[ApprovalsPage] Realtor approval notification failed:', err);
        });

        // Create GHL sub-account for the approved realtor (fire-and-forget)
        const { data: realtorProfile } = await supabase
          .from('profiles')
          .select('id, full_name, email, territories(name)')
          .eq('id', userId)
          .single();

        if (realtorProfile) {
          const territoryName = realtorProfile.territories?.name ?? 'General';
          createRealtorSubAccount(
            realtorProfile.id,
            realtorProfile.full_name ?? 'Realtor',
            realtorProfile.email,
            territoryName
          ).catch(err =>
            console.warn('[ApprovalsPage] GHL sub-account creation failed (non-fatal):', err)
          );
        }
      }

      // Audit log
      await supabase.rpc('log_audit_event', {
        p_user_id:     currentUser?.id,
        p_action:      action === 'approve' ? 'realtor.approved' : 'realtor.rejected',
        p_entity_type: 'profile',
        p_entity_id:   userId,
        p_metadata:    { new_status: newStatus, ...(reason ? { reject_reason: reason } : {}) },
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Action failed', desc: err.message });
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(userId); return s; });
    }
  };

  const toggleRejectInput = (userId) => {
    setShowRejectInput(prev => {
      const s = new Set(prev);
      if (s.has(userId)) { s.delete(userId); } else { s.add(userId); }
      return s;
    });
  };

  const toggleListingRejectInput = (listingId) => {
    setShowListingRejectInput(prev => {
      const s = new Set(prev);
      if (s.has(listingId)) { s.delete(listingId); } else { s.add(listingId); }
      return s;
    });
  };

  // ── Approve / reject a listing ────────────────────────────────────────────────
  const handleListingAction = async (listingId, action) => {
    const newStatus = action === 'approve' ? 'active' : 'draft';
    const reason    = listingRejectReasons[listingId] || 'Did not meet requirements.';
    setProcessing(prev => new Set(prev).add(listingId));
    try {
      const updateFields = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(action === 'reject' ? { rejection_reason: reason } : { rejection_reason: null }),
      };

      const { error } = await supabase
        .from('listings')
        .update(updateFields)
        .eq('id', listingId);

      if (error) throw error;

      setPendingListings(prev => prev.filter(l => l.id !== listingId));
      setShowListingRejectInput(prev => { const s = new Set(prev); s.delete(listingId); return s; });
      addToast({
        type: action === 'approve' ? 'success' : 'error',
        title: action === 'approve' ? 'Listing Approved' : 'Listing Rejected',
        desc: action === 'approve'
          ? 'The listing is now live and active.'
          : 'The listing has been returned to draft.',
      });

      await supabase.rpc('log_audit_event', {
        p_user_id:     currentUser?.id,
        p_action:      action === 'approve' ? 'listing.approved' : 'listing.returned_to_draft',
        p_entity_type: 'listing',
        p_entity_id:   listingId,
        p_metadata:    { new_status: newStatus, ...(action === 'reject' ? { rejection_reason: reason } : {}) },
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Action failed', desc: err.message });
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(listingId); return s; });
    }
  };

  const totalPending = pendingRealtors.length + pendingListings.length;

  return (
    <AppLayout role="admin">
      <div style={{ padding: 'clamp(16px, 4vw, 32px)', minHeight: '100vh', background: '#F9FAFB' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: OS, marginBottom: 4 }}>Approvals Queue</h1>
            <p style={{ fontSize: 13, color: LGRAY }}>
              {isLoading ? 'Loading...' : `${totalPending} item${totalPending !== 1 ? 's' : ''} awaiting review`}
            </p>
          </div>
          <button
            onClick={fetchApprovals}
            title="Refresh"
            style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <HiArrowPath size={16} color={LGRAY} />
          </button>
        </div>

        {/* KPI Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Pending Realtors', value: pendingRealtors.length, icon: HiUsers, color: '#D97706' },
            { label: 'Pending Listings', value: pendingListings.length, icon: HiHomeModern, color: '#6366F1' },
            { label: 'Total Pending', value: totalPending, icon: HiClock, color: '#DC2626' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: OS }}>{isLoading ? '—' : value}</div>
                <div style={{ fontSize: 11, color: LGRAY, marginTop: 1 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Realtor Applications */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader icon={HiUsers} title="Pending Realtor Applications" count={pendingRealtors.length} />

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(3)].map((_, i) => <Skeleton key={i} height="56px" />)}
            </div>
          ) : pendingRealtors.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: LGRAY }}>
              <HiCheckBadge size={36} color={S} style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: OS, marginBottom: 4 }}>All realtor applications reviewed</p>
              <p style={{ fontSize: 12, color: LGRAY, marginBottom: 20 }}>
                New applications appear here when a realtor signs up and awaits approval.
              </p>
              <button
                onClick={() => navigate('/admin/users?filter=pending')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', borderRadius: 10, border: `1.5px solid ${S}`,
                  background: '#fff', color: S, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = S; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = S; }}
              >
                <HiUsers size={16} /> Manage All Realtors <HiArrowRight size={14} />
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {['Realtor', 'Territory', 'Source', 'Applied', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRealtors.map(r => (
                      <React.Fragment key={r.id}>
                        <tr style={{ borderBottom: showRejectInput.has(r.id) ? 'none' : `1px solid ${BORDER}` }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                background: `linear-gradient(135deg, ${P}, ${S})`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: 12, fontWeight: 700,
                              }}>
                                {(r.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: OS, fontSize: 13 }}>{r.full_name || '—'}</div>
                                <div style={{ fontSize: 11, color: LGRAY }}>{r.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px', color: LGRAY }}>
                            {r.territory ? `${r.territory.city}, ${r.territory.state}` : 'Unassigned'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {r.assigned_director_id ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: '#E8F3EE', color: S, fontSize: 11, fontWeight: 700 }}>
                                <HiUserGroup size={11} /> Invited
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: LGRAY }}>Self-signup</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: LGRAY, whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => handleRealtorAction(r.id, 'approve')}
                                disabled={processing.has(r.id)}
                                style={{
                                  padding: '7px 16px', borderRadius: 8, border: 'none',
                                  background: processing.has(r.id) ? '#E5E7EB' : '#16A34A',
                                  color: processing.has(r.id) ? LGRAY : '#fff',
                                  fontSize: 12, fontWeight: 700,
                                  cursor: processing.has(r.id) ? 'not-allowed' : 'pointer',
                                  opacity: processing.has(r.id) ? 0.7 : 1,
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  boxShadow: processing.has(r.id) ? 'none' : '0 2px 6px rgba(22,163,74,0.3)',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { if (!processing.has(r.id)) e.currentTarget.style.background = '#15803D'; }}
                                onMouseLeave={e => { if (!processing.has(r.id)) e.currentTarget.style.background = '#16A34A'; }}
                              >
                                <HiCheck size={14} /> Approve
                              </button>
                              <button
                                onClick={() => toggleRejectInput(r.id)}
                                disabled={processing.has(r.id)}
                                style={{
                                  padding: '7px 14px', borderRadius: 8, border: `1px solid #FECACA`,
                                  background: showRejectInput.has(r.id) ? '#FEE2E2' : '#fff', color: '#991B1B',
                                  fontSize: 12, fontWeight: 700, cursor: processing.has(r.id) ? 'not-allowed' : 'pointer',
                                  opacity: processing.has(r.id) ? 0.6 : 1,
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  transition: 'all 0.15s',
                                }}
                              >
                                <HiXMark size={14} /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Reject reason input row */}
                        {showRejectInput.has(r.id) && (
                          <tr style={{ borderBottom: `1px solid ${BORDER}`, background: '#FFF5F5' }}>
                            <td colSpan={6} style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  type="text"
                                  placeholder="Reason for rejection (optional)…"
                                  value={rejectReasons[r.id] || ''}
                                  onChange={e => setRejectReasons(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  style={{ flex: 1, padding: '7px 12px', border: `1px solid #FCA5A5`, borderRadius: 8, fontSize: 13, color: OS, background: '#fff' }}
                                />
                                <button
                                  onClick={() => handleRealtorAction(r.id, 'reject')}
                                  disabled={processing.has(r.id)}
                                  style={{
                                    padding: '7px 16px', borderRadius: 8, border: 'none',
                                    background: '#991B1B', color: '#fff',
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                  }}
                                >
                                  <HiXMark size={14} /> Confirm Reject
                                </button>
                                <button
                                  onClick={() => toggleRejectInput(r.id)}
                                  style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 12, cursor: 'pointer', color: LGRAY }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden flex flex-col gap-3">
                {pendingRealtors.map(r => (
                  <MobileCard key={r.id}>
                    {/* Title row */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: OS }}>{r.full_name || '—'}</div>
                      <div style={{ fontSize: 12, color: LGRAY }}>{r.email}</div>
                    </div>
                    <MobileCardRow label="Territory">
                      {r.territory ? `${r.territory.city}, ${r.territory.state}` : 'Unassigned'}
                    </MobileCardRow>
                    <MobileCardRow label="Applied">{formatDate(r.created_at)}</MobileCardRow>
                    <MobileCardActions>
                      <button
                        onClick={() => handleRealtorAction(r.id, 'approve')}
                        disabled={processing.has(r.id)}
                        style={{
                          padding: '7px 16px', borderRadius: 8, border: 'none',
                          background: processing.has(r.id) ? '#E5E7EB' : '#16A34A',
                          color: processing.has(r.id) ? LGRAY : '#fff',
                          fontSize: 12, fontWeight: 700,
                          cursor: processing.has(r.id) ? 'not-allowed' : 'pointer',
                          opacity: processing.has(r.id) ? 0.7 : 1,
                          display: 'flex', alignItems: 'center', gap: 5,
                          boxShadow: processing.has(r.id) ? 'none' : '0 2px 6px rgba(22,163,74,0.3)',
                        }}
                      >
                        <HiCheck size={14} /> Approve
                      </button>
                      <button
                        onClick={() => toggleRejectInput(r.id)}
                        disabled={processing.has(r.id)}
                        style={{
                          padding: '7px 14px', borderRadius: 8, border: `1px solid #FECACA`,
                          background: showRejectInput.has(r.id) ? '#FEE2E2' : '#fff', color: '#991B1B',
                          fontSize: 12, fontWeight: 700, cursor: processing.has(r.id) ? 'not-allowed' : 'pointer',
                          opacity: processing.has(r.id) ? 0.6 : 1,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <HiXMark size={14} /> Reject
                      </button>
                    </MobileCardActions>
                    {/* Reject reason input — inline in card */}
                    {showRejectInput.has(r.id) && (
                      <div style={{ marginTop: 8, padding: '10px', background: '#FFF5F5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          type="text"
                          placeholder="Reason for rejection (optional)…"
                          value={rejectReasons[r.id] || ''}
                          onChange={e => setRejectReasons(prev => ({ ...prev, [r.id]: e.target.value }))}
                          style={{ width: '100%', padding: '7px 12px', border: `1px solid #FCA5A5`, borderRadius: 8, fontSize: 13, color: OS, background: '#fff', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleRealtorAction(r.id, 'reject')}
                            disabled={processing.has(r.id)}
                            style={{
                              flex: 1, padding: '7px 12px', borderRadius: 8, border: 'none',
                              background: '#991B1B', color: '#fff',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            }}
                          >
                            <HiXMark size={14} /> Confirm Reject
                          </button>
                          <button
                            onClick={() => toggleRejectInput(r.id)}
                            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 12, cursor: 'pointer', color: LGRAY }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </MobileCard>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pending Listings */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader icon={HiHomeModern} title="Pending Listing Approvals" count={pendingListings.length} />

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(3)].map((_, i) => <Skeleton key={i} height="56px" />)}
            </div>
          ) : pendingListings.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: LGRAY }}>
              <HiCheckBadge size={32} color={`${S}`} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 500 }}>No pending listing approvals</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {['Listing Title', 'Location', 'Submitted By', 'Date', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingListings.map(l => (
                      <React.Fragment key={l.id}>
                        <tr style={{ borderBottom: showListingRejectInput.has(l.id) ? 'none' : `1px solid ${BORDER}` }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: OS }}>{l.title || '—'}</td>
                          <td style={{ padding: '12px', color: OSV }}>
                            {[l.city, l.state].filter(Boolean).join(', ') || l.address || '—'}
                          </td>
                          <td style={{ padding: '12px', color: LGRAY }}>{l.realtor?.full_name || '—'}</td>
                          <td style={{ padding: '12px', color: LGRAY, whiteSpace: 'nowrap' }}>{formatDate(l.created_at)}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => handleListingAction(l.id, 'approve')}
                                disabled={processing.has(l.id)}
                                style={{
                                  padding: '6px 14px', borderRadius: 8, border: 'none',
                                  background: '#DCFCE7', color: '#166534',
                                  fontSize: 12, fontWeight: 700, cursor: processing.has(l.id) ? 'not-allowed' : 'pointer',
                                  opacity: processing.has(l.id) ? 0.6 : 1,
                                  display: 'flex', alignItems: 'center', gap: 4,
                                }}
                              >
                                <HiCheck size={14} /> Approve
                              </button>
                              <button
                                onClick={() => toggleListingRejectInput(l.id)}
                                disabled={processing.has(l.id)}
                                style={{
                                  padding: '6px 14px', borderRadius: 8, border: 'none',
                                  background: showListingRejectInput.has(l.id) ? '#FCA5A5' : '#FEE2E2', color: '#991B1B',
                                  fontSize: 12, fontWeight: 700, cursor: processing.has(l.id) ? 'not-allowed' : 'pointer',
                                  opacity: processing.has(l.id) ? 0.6 : 1,
                                  display: 'flex', alignItems: 'center', gap: 4,
                                }}
                              >
                                <HiXMark size={14} /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                        {showListingRejectInput.has(l.id) && (
                          <tr style={{ borderBottom: `1px solid ${BORDER}`, background: '#FFF5F5' }}>
                            <td colSpan={5} style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  type="text"
                                  placeholder="Reason for rejection (optional)…"
                                  value={listingRejectReasons[l.id] || ''}
                                  onChange={e => setListingRejectReasons(prev => ({ ...prev, [l.id]: e.target.value }))}
                                  style={{ flex: 1, padding: '7px 12px', border: `1px solid #FCA5A5`, borderRadius: 8, fontSize: 13, color: OS, background: '#fff' }}
                                />
                                <button
                                  onClick={() => handleListingAction(l.id, 'reject')}
                                  disabled={processing.has(l.id)}
                                  style={{
                                    padding: '7px 16px', borderRadius: 8, border: 'none',
                                    background: '#991B1B', color: '#fff',
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                  }}
                                >
                                  <HiXMark size={14} /> Confirm Reject
                                </button>
                                <button
                                  onClick={() => toggleListingRejectInput(l.id)}
                                  style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 12, cursor: 'pointer', color: LGRAY }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden flex flex-col gap-3">
                {pendingListings.map(l => (
                  <MobileCard key={l.id}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: OS }}>{l.title || '—'}</div>
                    </div>
                    <MobileCardRow label="Location">
                      {[l.city, l.state].filter(Boolean).join(', ') || l.address || '—'}
                    </MobileCardRow>
                    <MobileCardRow label="Submitted By">{l.realtor?.full_name || '—'}</MobileCardRow>
                    <MobileCardRow label="Date">{formatDate(l.created_at)}</MobileCardRow>
                    <MobileCardActions>
                      <button
                        onClick={() => handleListingAction(l.id, 'approve')}
                        disabled={processing.has(l.id)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: 'none',
                          background: '#DCFCE7', color: '#166534',
                          fontSize: 12, fontWeight: 700, cursor: processing.has(l.id) ? 'not-allowed' : 'pointer',
                          opacity: processing.has(l.id) ? 0.6 : 1,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <HiCheck size={14} /> Approve
                      </button>
                      <button
                        onClick={() => toggleListingRejectInput(l.id)}
                        disabled={processing.has(l.id)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: 'none',
                          background: showListingRejectInput.has(l.id) ? '#FCA5A5' : '#FEE2E2', color: '#991B1B',
                          fontSize: 12, fontWeight: 700, cursor: processing.has(l.id) ? 'not-allowed' : 'pointer',
                          opacity: processing.has(l.id) ? 0.6 : 1,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <HiXMark size={14} /> Reject
                      </button>
                    </MobileCardActions>
                    {showListingRejectInput.has(l.id) && (
                      <div style={{ marginTop: 8, padding: '10px', background: '#FFF5F5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          type="text"
                          placeholder="Reason for rejection (optional)…"
                          value={listingRejectReasons[l.id] || ''}
                          onChange={e => setListingRejectReasons(prev => ({ ...prev, [l.id]: e.target.value }))}
                          style={{ width: '100%', padding: '7px 12px', border: `1px solid #FCA5A5`, borderRadius: 8, fontSize: 13, color: OS, background: '#fff', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleListingAction(l.id, 'reject')}
                            disabled={processing.has(l.id)}
                            style={{
                              flex: 1, padding: '7px 12px', borderRadius: 8, border: 'none',
                              background: '#991B1B', color: '#fff',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            }}
                          >
                            <HiXMark size={14} /> Confirm Reject
                          </button>
                          <button
                            onClick={() => toggleListingRejectInput(l.id)}
                            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 12, cursor: 'pointer', color: LGRAY }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </MobileCard>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
