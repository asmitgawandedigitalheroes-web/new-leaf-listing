import AppLayout from '../../components/layout/AppLayout';
import KPICard from '../../components/shared/KPICard';
import ActivityFeed from '../../components/shared/ActivityFeed';
import BarChart from '../../components/shared/BarChart';
import { SectionCard } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useListings } from '../../hooks/useListings';
import { useToast } from '../../context/ToastContext';
import { useAdminStats } from '../../hooks/useAdminStats';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  HiHome,
  HiUsers,
  HiBanknotes,
  HiCheckBadge,
  HiArrowPath,
  HiArrowDownTray,
  HiCreditCard,
} from 'react-icons/hi2';

export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, profile } = useAuth();
  
  // 1. Data Hooks
  const { stats, isLoading: isStatsLoading, refresh: refreshStats } = useAdminStats();
  const { logs: auditLogs, isLoading: isLogsLoading, refresh: refreshLogs } = useAuditLogs();
  
  // Pending approvals list
  const [pendingFilters] = useState({ status: 'pending' });
  const { listings: pendingListings, isLoading: isPendingLoading, refresh: refreshPending, approveListing, rejectListing } = useListings(pendingFilters);

  // 2. Local State for Top Realtors
  const [realtors, setRealtors] = useState([]);
  const [isRealtorsLoading, setIsRealtorsLoading] = useState(true);

  useEffect(() => {
    async function fetchRealtors() {
      setIsRealtorsLoading(true);
      try {
        // Fetch realtors + active listing counts in two queries (avoids N+1)
        const [{ data: profiles }, { data: listingRows }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, role, status')
            .eq('role', 'realtor')
            .limit(20),
          supabase
            .from('listings')
            .select('realtor_id')
            .eq('status', 'active'),
        ]);

        // Build per-realtor count map
        const countMap = {};
        (listingRows || []).forEach(l => {
          countMap[l.realtor_id] = (countMap[l.realtor_id] || 0) + 1;
        });

        // Sort by listing count descending, take top 3
        const sorted = (profiles || [])
          .map(r => ({ ...r, listingCount: countMap[r.id] || 0 }))
          .sort((a, b) => b.listingCount - a.listingCount)
          .slice(0, 3);

        setRealtors(sorted);
      } finally {
        setIsRealtorsLoading(false);
      }
    }
    fetchRealtors();
  }, []);

  const refreshAll = () => {
    refreshStats();
    refreshLogs();
    refreshPending();
  };

  // 3. Transformation for Activity Feed
  const ACTION_LABELS = {
    'listing.created':         'New listing submitted',
    'listing.approved':        'Listing approved',
    'listing.rejected':        'Listing rejected',
    'listing.featured':        'Listing featured',
    'listing.unfeatured':      'Listing unfeatured',
    'listing.promoted_top':    'Listing promoted to top',
    'listing.sold':            'Listing marked as sold',
    'listing.archived':        'Listing archived',
    'lead.status_changed':     'Lead status updated',
    'lead.reassigned':         'Lead reassigned',
    'lead.contact_requested':  'Lead contact requested',
    'commission.approved':     'Commission approved',
    'commission.paid':         'Commission paid out',
    'commission.rejected':     'Commission rejected',
    'user.active':             'User activated',
    'user.suspended':          'User suspended',
    'user.role_changed':       'User role changed',
    'user.territory_assigned': 'Territory assigned to user',
    'user.deleted':            'User deleted',
    'pricing_plan.updated':    'Pricing plan updated',
    'update':                  'Record updated',
  };

  const activityItems = useMemo(() => {
    return auditLogs.slice(0, 6).map(log => {
      let type = 'listing';
      const ent = (log.entity_type || '').toLowerCase();
      const act = (log.action || '').toLowerCase();

      if (ent === 'profile') type = 'signup';
      else if (ent === 'commission') type = 'commission';
      else if (ent === 'subscription') type = 'payment';
      else if (act.includes('approve')) type = 'approval';

      const label = ACTION_LABELS[log.action] || ACTION_LABELS[act] ||
        log.action.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      return {
        type,
        text: log.userName && log.userName !== 'System'
          ? `${log.userName} — ${label}`
          : label,
        time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    });
  }, [auditLogs]);

  // 4. Data for KPIs
  const kpis = [
    {
      label: 'Total Listings',
      value: stats.totalListings.toString(),
      icon: <HiHome className="text-blue-600" />
    },
    {
      label: 'Active Leads',
      value: stats.activeLeads.toString(),
      icon: <HiUsers className="text-purple-600" />
    },
    {
      label: 'Monthly Revenue',
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: <HiBanknotes className="text-green-600" />
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals.toString(),
      icon: <HiCheckBadge className="text-yellow-600" />
    },
    {
      label: 'Commission Liability',
      value: `$${(stats.commissionLiability || 0).toLocaleString()}`,
      icon: <HiBanknotes className="text-amber-500" />,
      trendLabel: 'approved + payable, outstanding',
    },
    {
      label: 'Payouts This Month',
      value: `$${(stats.payoutsThisMonth || 0).toLocaleString()}`,
      icon: <HiArrowDownTray className="text-emerald-600" />,
      trendLabel: 'processed this month',
    },
  ];

  const handleAction = async (id, type) => {
    const result = type === 'approve' ? await approveListing(id) : await rejectListing(id);
    if (result?.error) {
      addToast({ type: 'error', title: 'Action failed', desc: result.error.message });
    } else {
      addToast({ type: 'success', title: `Listing ${type}d`, desc: 'The listing status has been updated.' });
      refreshStats();
      refreshPending();
    }
  };

  return (
    <AppLayout role="admin" title="Admin Dashboard">
      <div className="p-4 md:p-6 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
            <p className="text-sm text-gray-500">Welcome back, {profile?.full_name || user?.email?.split('@')[0]}. Here's what's happening today.</p>
          </div>
          <button 
            onClick={refreshAll} 
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            title="Refresh dashboard"
          >
            <HiArrowPath size={16} className="text-gray-500" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
          {isStatsLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <Skeleton width="100px" height="12px" className="mb-2" />
                <Skeleton width="60px" height="24px" className="mb-1" />
                <Skeleton width="120px" height="10px" />
              </div>
            ))
          ) : (
            kpis.map(k => <KPICard key={k.label} {...k} />)
          )}
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/admin/commissions-admin')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <HiBanknotes size={15} className="text-amber-500" /> Commissions
          </button>
          <button onClick={() => navigate('/admin/payouts')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <HiArrowDownTray size={15} className="text-emerald-600" /> Payouts
          </button>
          <button onClick={() => navigate('/admin/subscriptions')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <HiCreditCard size={15} className="text-blue-500" /> Subscriptions
          </button>
        </div>

        {/* Charts & Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SectionCard title="Growth Over Time">
              <div className="w-full px-2 pb-2">
                <BarChart data={stats.historicalChart} height={240} />
              </div>
            </SectionCard>
          </div>
          <div className="xl:col-span-1">
            <SectionCard title="Recent Activity" action={<button onClick={() => navigate('/admin/audit-log')} className="text-sm text-[#D4AF37] font-bold hover:opacity-80 transition-opacity">View All</button>}>
              {isLogsLoading ? (
                <div className="flex flex-col gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton variant="circle" width="32px" height="32px" />
                      <div className="flex-1"><Skeleton width="100%" height="12px" /><Skeleton width="40%" height="8px" className="mt-1" /></div>
                    </div>
                  ))}
                </div>
              ) : (
                <ActivityFeed items={activityItems} />
              )}
            </SectionCard>
          </div>
        </div>

        {/* Pending Approvals & Top Realtors */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SectionCard title="Pending Approvals" action={<button onClick={() => navigate('/admin/listings')} className="text-xs text-yellow-600 font-semibold hover:underline">Manage All</button>}>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Listing Item</th>
                      <th>Realtor</th>
                      <th>Territory</th>
                      <th>Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isPendingLoading ? (
                      [...Array(3)].map((_, i) => (
                        <tr key={i}>
                          <td><Skeleton width="140px" height="14px" /></td>
                          <td><Skeleton width="100px" height="14px" /></td>
                          <td><Skeleton width="80px" height="14px" /></td>
                          <td><Skeleton width="40px" height="14px" /></td>
                          <td><Skeleton width="120px" height="24px" /></td>
                        </tr>
                      ))
                    ) : pendingListings.length > 0 ? (
                      pendingListings.map(l => (
                        <tr key={l.id}>
                          <td className="font-medium text-gray-900">{l.title}</td>
                          <td className="text-gray-600 text-sm">{l.realtor?.full_name || 'System'}</td>
                          <td className="text-gray-500 text-sm">{l.territory?.city || 'Unassigned'}</td>
                          <td><Badge status="draft" label="92" /></td>
                          <td className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleAction(l.id, 'approve')}>Approve</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleAction(l.id, 'reject')}>Reject</Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-400">No pending approvals</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
          
          <div className="xl:col-span-1">
            <SectionCard title="Top Realtors">
              <div className="flex flex-col gap-4">
                {isRealtorsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-5 p-5 rounded-2xl border border-gray-50">
                      <Skeleton variant="circle" width="40px" height="40px" />
                      <div className="flex-1"><Skeleton width="60%" height="16px" /><Skeleton width="30%" height="10px" className="mt-2" /></div>
                    </div>
                  ))
                ) : realtors.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:shadow-gray-200/40 transition-all duration-300 group">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-full border-2 border-gray-100 flex items-center justify-center text-sm font-bold text-gray-700 bg-gray-50/30 group-hover:bg-white transition-colors">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900 leading-tight tracking-tight">{r.full_name}</div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          {r.status || 'Active'} Realtor
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-[#D4AF37] tracking-tight">
                        {r.listingCount} Listing{r.listingCount !== 1 ? 's' : ''}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Active</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
