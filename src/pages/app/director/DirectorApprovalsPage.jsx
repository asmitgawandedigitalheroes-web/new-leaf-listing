import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import Skeleton from '../../../components/ui/Skeleton';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { notificationService } from '../../../../services/notification.service';
import MobileCard, { MobileCardRow, MobileCardActions } from '../../../components/shared/MobileCard';
import {
  HiCheck, HiXMark, HiArrowPath, HiUsers, HiClock, HiCheckBadge,
} from 'react-icons/hi2';

const P     = '#D4AF37';
const S     = '#1F4D3A';
const OS    = '#111111';
const LGRAY = '#6B7280';
const BORDER = '#E5E7EB';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DirectorApprovalsPage() {
  const { addToast } = useToast();
  const { profile } = useAuth();

  const [pendingRealtors, setPendingRealtors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState(new Set());
  const [rejectReasons, setRejectReasons] = useState({});
  const [showRejectInput, setShowRejectInput] = useState(new Set());

  const fetchPending = useCallback(async () => {
    if (!profile?.territory_id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at, assigned_director_id')
        .eq('status', 'pending')
        .eq('role', 'realtor')
        .eq('territory_id', profile.territory_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRealtors(data || []);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load approvals', desc: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [profile?.territory_id, addToast]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAction = async (userId, action) => {
    const newStatus = action === 'approve' ? 'active' : 'suspended';
    const reason = rejectReasons[userId] || '';
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
        desc: action === 'approve' ? 'The realtor account is now active.' : 'The application has been rejected.',
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
        }).catch(() => {});
      }

      await supabase.rpc('log_audit_event', {
        p_user_id:     profile?.id,
        p_action:      action === 'approve' ? 'realtor.approved' : 'realtor.rejected',
        p_entity_type: 'profile',
        p_entity_id:   userId,
        p_metadata:    { new_status: newStatus, approved_by_role: 'director', ...(reason ? { reject_reason: reason } : {}) },
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Action failed', desc: err.message });
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(userId); return s; });
    }
  };

  const toggleReject = (userId) => {
    setShowRejectInput(prev => {
      const s = new Set(prev);
      if (s.has(userId)) s.delete(userId); else s.add(userId);
      return s;
    });
  };

  return (
    <AppLayout role="director">
      <div style={{ padding: 'clamp(16px, 4vw, 32px)', minHeight: '100vh', background: '#F9FAFB' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: OS, marginBottom: 4 }}>Territory Approvals</h1>
            <p style={{ fontSize: 13, color: LGRAY }}>
              {isLoading ? 'Loading...' : `${pendingRealtors.length} realtor${pendingRealtors.length !== 1 ? 's' : ''} awaiting your approval`}
            </p>
          </div>
          <button
            onClick={fetchPending}
            title="Refresh"
            style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <HiArrowPath size={16} color={LGRAY} />
          </button>
        </div>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Pending Realtors', value: pendingRealtors.length, icon: HiUsers, color: '#D97706' },
            { label: 'Total Pending', value: pendingRealtors.length, icon: HiClock, color: '#DC2626' },
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

        {/* Pending list */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${P}22, ${S}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiUsers size={18} color={S} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: OS, margin: 0 }}>Pending Realtor Applications</h2>
              <p style={{ fontSize: 12, color: LGRAY, margin: 0 }}>{pendingRealtors.length} pending in your territory</p>
            </div>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(3)].map((_, i) => <Skeleton key={i} height="56px" />)}
            </div>
          ) : pendingRealtors.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: LGRAY }}>
              <HiCheckBadge size={36} color={S} style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: OS, marginBottom: 4 }}>All caught up!</p>
              <p style={{ fontSize: 12, color: LGRAY }}>No pending realtor applications in your territory.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {['Realtor', 'Applied', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRealtors.map(r => (
                      <React.Fragment key={r.id}>
                        <tr style={{ borderBottom: showRejectInput.has(r.id) ? 'none' : `1px solid ${BORDER}` }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${P}, ${S})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                                {(r.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: OS }}>{r.full_name || '—'}</div>
                                <div style={{ fontSize: 11, color: LGRAY }}>{r.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px', color: LGRAY, whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleAction(r.id, 'approve')} disabled={processing.has(r.id)}
                                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: processing.has(r.id) ? '#E5E7EB' : '#16A34A', color: processing.has(r.id) ? LGRAY : '#fff', fontSize: 12, fontWeight: 700, cursor: processing.has(r.id) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <HiCheck size={14} /> Approve
                              </button>
                              <button onClick={() => toggleReject(r.id)} disabled={processing.has(r.id)}
                                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #FECACA', background: showRejectInput.has(r.id) ? '#FEE2E2' : '#fff', color: '#991B1B', fontSize: 12, fontWeight: 700, cursor: processing.has(r.id) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <HiXMark size={14} /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                        {showRejectInput.has(r.id) && (
                          <tr style={{ borderBottom: `1px solid ${BORDER}`, background: '#FFF5F5' }}>
                            <td colSpan={3} style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="text" placeholder="Reason for rejection (optional)…"
                                  value={rejectReasons[r.id] || ''}
                                  onChange={e => setRejectReasons(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  style={{ flex: 1, padding: '7px 12px', border: '1px solid #FCA5A5', borderRadius: 8, fontSize: 13, color: OS, background: '#fff' }} />
                                <button onClick={() => handleAction(r.id, 'reject')} disabled={processing.has(r.id)}
                                  style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#991B1B', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <HiXMark size={14} /> Confirm Reject
                                </button>
                                <button onClick={() => toggleReject(r.id)}
                                  style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 12, cursor: 'pointer', color: LGRAY }}>
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
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: OS }}>{r.full_name || '—'}</div>
                      <div style={{ fontSize: 12, color: LGRAY }}>{r.email}</div>
                    </div>
                    <MobileCardRow label="Applied">{formatDate(r.created_at)}</MobileCardRow>
                    <MobileCardActions>
                      <button onClick={() => handleAction(r.id, 'approve')} disabled={processing.has(r.id)}
                        style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: processing.has(r.id) ? '#E5E7EB' : '#16A34A', color: processing.has(r.id) ? LGRAY : '#fff', fontSize: 12, fontWeight: 700, cursor: processing.has(r.id) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <HiCheck size={14} /> Approve
                      </button>
                      <button onClick={() => toggleReject(r.id)} disabled={processing.has(r.id)}
                        style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #FECACA', background: showRejectInput.has(r.id) ? '#FEE2E2' : '#fff', color: '#991B1B', fontSize: 12, fontWeight: 700, cursor: processing.has(r.id) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <HiXMark size={14} /> Reject
                      </button>
                    </MobileCardActions>
                    {showRejectInput.has(r.id) && (
                      <div style={{ marginTop: 8, padding: 10, background: '#FFF5F5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input type="text" placeholder="Reason for rejection (optional)…"
                          value={rejectReasons[r.id] || ''}
                          onChange={e => setRejectReasons(prev => ({ ...prev, [r.id]: e.target.value }))}
                          style={{ width: '100%', padding: '7px 12px', border: '1px solid #FCA5A5', borderRadius: 8, fontSize: 13, color: OS, background: '#fff', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleAction(r.id, 'reject')} disabled={processing.has(r.id)}
                            style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: 'none', background: '#991B1B', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <HiXMark size={14} /> Confirm Reject
                          </button>
                          <button onClick={() => toggleReject(r.id)}
                            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 12, cursor: 'pointer', color: LGRAY }}>
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
