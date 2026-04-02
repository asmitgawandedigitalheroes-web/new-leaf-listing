import { useState, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import BarChart from '../../../components/shared/BarChart';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { useUsers } from '../../../hooks/useUsers';
import { useToast } from '../../../context/ToastContext';

const PLAN_STYLES = {
  starter:   { bg: '#F3F4F6', text: '#4B5563' },
  pro:       { bg: 'rgba(212,175,55,0.12)', text: '#B8962E' },
  dominator: { bg: '#EDE9FE', text: '#5B21B6' },
  sponsor:   { bg: '#DBEAFE', text: '#1D4ED8' },
};

export default function DirectorRealtorsPage() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const { users, isLoading, updateUser } = useUsers();
  const [viewStatsId, setViewStatsId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Director sees realtors in their territory (or all if no territory_id set)
  const realtors = useMemo(
    () => users.filter(u => u.role === 'realtor' && (!profile?.territory_id || u.territory_id === profile.territory_id)),
    [users, profile?.territory_id]
  );

  const pendingRealtors = realtors.filter(r => r.status === 'pending');
  const activeRealtors  = realtors.filter(r => r.status !== 'pending');

  const chartData = useMemo(() =>
    activeRealtors
      .filter(r => r.status === 'active')
      .slice(0, 5)
      .map(r => ({
        label: (r.full_name || '').split(' ')[0],
        value: 0, // listing counts not available here without extra query
      })),
    [activeRealtors]
  );

  const statsRealtor = viewStatsId ? realtors.find(r => r.id === viewStatsId) : null;

  const handleStatus = async (id, status) => {
    setActionLoading(id + status);
    const { error } = await updateUser(id, { status });
    setActionLoading(null);
    if (error) addToast({ type: 'error', title: 'Update failed', desc: error.message });
    else addToast({ type: 'success', title: `Realtor ${status}` });
  };

  const territory = profile?.territory || 'My Territory';

  return (
    <AppLayout role="director" title="My Realtors">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Territory</div>
            <h2 className="text-xl font-bold text-gray-900">My Realtors</h2>
            <p className="text-sm text-gray-400 mt-0.5">{territory}</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white rounded-xl px-4 py-2.5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="text-lg font-black text-gray-900">{realtors.filter(r => r.status === 'active').length}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Active</div>
            </div>
            <div className="bg-white rounded-xl px-4 py-2.5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="text-lg font-black text-yellow-600">{pendingRealtors.length}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Pending</div>
            </div>
            <div className="bg-white rounded-xl px-4 py-2.5 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="text-lg font-black text-gray-900">{realtors.length}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Total</div>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        {isLoading ? (
          <SectionCard title="Pending Approval">
            <div className="data-table">
              <table><thead><tr><th>Realtor</th><th>Plan</th><th>Actions</th></tr></thead>
              <tbody>
                {[...Array(2)].map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton width="160px" height="14px" /></td>
                    <td><Skeleton width="60px" height="20px" /></td>
                    <td><Skeleton width="140px" height="28px" /></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </SectionCard>
        ) : pendingRealtors.length > 0 && (
          <SectionCard title="Pending Approval" action={
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#B8962E' }}>
              {pendingRealtors.length} pending
            </span>
          }>
            <div className="data-table">
              <table>
                <thead><tr><th>Realtor</th><th>Plan</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {pendingRealtors.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar initials={r.initials || '??'} size="sm" color="gold" />
                          <div>
                            <div className="font-medium text-gray-900">{r.full_name}</div>
                            <div className="text-xs text-gray-400">{r.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {r.plan ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                            style={{ background: PLAN_STYLES[r.plan]?.bg || '#F3F4F6', color: PLAN_STYLES[r.plan]?.text || '#4B5563' }}>
                            {r.plan}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="text-gray-400 text-sm">{r.joined}</td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="green" size="sm"
                            isLoading={actionLoading === r.id + 'active'}
                            onClick={() => handleStatus(r.id, 'active')}>Approve</Button>
                          <Button variant="danger" size="sm"
                            isLoading={actionLoading === r.id + 'suspended'}
                            onClick={() => handleStatus(r.id, 'suspended')}>Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* Realtors Table */}
        <SectionCard title={`Realtors (${activeRealtors.length})`}>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Realtor</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td><div className="flex items-center gap-3"><Skeleton variant="circle" width="32px" height="32px" /><Skeleton width="120px" height="12px" /></div></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                      <td><Skeleton width="140px" height="28px" /></td>
                    </tr>
                  ))
                ) : activeRealtors.length > 0 ? activeRealtors.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar initials={r.initials || '??'} size="sm" color={r.status === 'active' ? 'green' : 'gold'} />
                        <div>
                          <div className="font-medium text-gray-900">{r.full_name}</div>
                          <div className="text-xs text-gray-400">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {r.plan ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                          style={{ background: PLAN_STYLES[r.plan]?.bg || '#F3F4F6', color: PLAN_STYLES[r.plan]?.text || '#4B5563' }}>
                          {r.plan}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td><Badge status={r.status || 'active'} /></td>
                    <td className="text-gray-400 text-sm">{r.joined}</td>
                    <td>
                      <div className="flex gap-1.5 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => setViewStatsId(viewStatsId === r.id ? null : r.id)}>
                          {viewStatsId === r.id ? 'Hide' : 'Stats'}
                        </Button>
                        {r.status === 'active' ? (
                          <Button variant="ghost" size="sm"
                            isLoading={actionLoading === r.id + 'suspended'}
                            style={{ color: '#DC2626' }}
                            onClick={() => handleStatus(r.id, 'suspended')}>Suspend</Button>
                        ) : r.status === 'suspended' ? (
                          <Button variant="green" size="sm"
                            isLoading={actionLoading === r.id + 'active'}
                            onClick={() => handleStatus(r.id, 'active')}>Reactivate</Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No realtors in your territory yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Inline stats expansion */}
          {statsRealtor && (
            <div className="mx-6 mb-5 p-5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="font-semibold text-gray-800 mb-3">Profile: {statsRealtor.full_name}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Plan', value: statsRealtor.plan || '—' },
                  { label: 'Status', value: statsRealtor.status || 'active' },
                  { label: 'Territory', value: statsRealtor.territory || '—' },
                  { label: 'Joined', value: statsRealtor.joined || '—' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-lg p-3">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</div>
                    <div className="text-sm font-bold text-gray-900 mt-1 capitalize">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

      </div>
    </AppLayout>
  );
}
