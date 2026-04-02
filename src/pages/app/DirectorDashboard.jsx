import { useMemo, useEffect, useState } from 'react';
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
import { useLeads } from '../../hooks/useLeads';
import { useUsers } from '../../hooks/useUsers';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { maskEmail, maskName } from '../../utils/masking';
import {
  HiHome,
  HiInboxArrowDown,
  HiUser,
  HiChartBar,
} from 'react-icons/hi2';

export default function DirectorDashboard() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const { leads, isLoading: leadsLoading, reassignLead } = useLeads();
  const { users, isLoading: usersLoading } = useUsers();

  const [listingsCount, setListingsCount] = useState(0);
  const [availableRealtors, setAvailableRealtors] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Fetch data for this territory
  useEffect(() => {
    async function fetchTerritoryData() {
      if (!profile?.territory_id) return;

      // 1. Listings count
      const { count } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('territory_id', profile.territory_id);
      setListingsCount(count || 0);

      // 2. Available realtors in this territory
      const { data: realtorData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'realtor')
        .eq('status', 'active')
        .eq('territory_id', profile.territory_id)
        .order('full_name');
      setAvailableRealtors(realtorData || []);

      // 3. Recent activity for this territory
      setActivitiesLoading(true);
      const { data: actData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'lead') // Mostly interested in lead movements for directors
        .order('timestamp', { ascending: false })
        .limit(6);
      
      const mapped = (actData || []).map(a => ({
        type: a.action.includes('lead') ? 'lead' : a.action.includes('listing') ? 'listing' : 'signup',
        text: `${a.action.replace(/\./g, ' ')} #${a.entity_id?.slice(-4)}`,
        time: new Date(a.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      }));
      setActivities(mapped);
      setActivitiesLoading(false);
    }
    fetchTerritoryData();
  }, [profile?.territory_id]);

  const realtors = useMemo(
    () => users.filter(u => u.role === 'realtor' && (!profile?.territory_id || u.territory_id === profile.territory_id)),
    [users, profile?.territory_id]
  );

  const unassigned = useMemo(
    () => leads.filter(l => !l.assigned_realtor_id).slice(0, 5),
    [leads]
  );

  // Weekly lead volume chart (last 6 weeks)
  const chartData = useMemo(() => {
    const weeks = [];
    for (let i = 5; i >= 0; i--) {
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const count = leads.filter(l => {
        const d = new Date(l.created_at);
        return d >= start && d <= end;
      }).length;
      weeks.push({ label: `W${6 - i}`, value: count });
    }
    return weeks;
  }, [leads]);

  const kpis = [
    { label: 'Region Listings',  value: listingsCount.toString(), trend: null, trendLabel: '', icon: <HiHome className="text-blue-600" /> },
    { label: 'Unassigned Leads', value: unassigned.length.toString(), trend: null, trendLabel: '', icon: <HiInboxArrowDown className="text-green-600" /> },
    { label: 'Active Realtors',  value: realtors.filter(r => r.status === 'active').length.toString(), trend: null, trendLabel: '', icon: <HiUser className="text-purple-600" /> },
    { label: 'Total Leads',      value: leads.length.toString(), trend: null, trendLabel: '', icon: <HiChartBar className="text-yellow-600" /> },
  ];

  const handleAssign = async (leadId, realtorId) => {
    if (!realtorId) return;
    const { error } = await reassignLead(leadId, realtorId);
    if (error) addToast({ type: 'error', title: 'Assign failed', desc: error.message });
    else addToast({ type: 'success', title: 'Lead assigned', desc: 'Lead routed to realtor.' });
  };

  const isLoading = leadsLoading || usersLoading;

  return (
    <AppLayout role="director" title="Director Dashboard">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Director Overview</h1>
          <p className="text-sm text-gray-500">Welcome back, {profile?.full_name || 'Director'}.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <Skeleton width="40px" height="40px" className="mb-3" />
                <Skeleton width="80px" height="24px" className="mb-2" />
                <Skeleton width="120px" height="14px" />
              </div>
            ))
          ) : kpis.map(kpi => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>

        {/* Chart + activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SectionCard title="Weekly Lead Volume">
              <div className="px-5 pb-5 pt-4">
                <BarChart data={chartData} color="green" height={140} />
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Recent Activity">
            <div className="pb-2">
              {activitiesLoading ? (
                 <div className="px-5 py-4 space-y-4">
                   {[...Array(3)].map((_, i) => (
                     <div key={i} className="flex gap-4 items-center">
                       <Skeleton width="40px" height="40px" variant="circle" />
                       <div className="flex-1"><Skeleton width="140px" height="12px" /><Skeleton width="80px" height="10px" className="mt-1" /></div>
                     </div>
                   ))}
                 </div>
              ) : (
                <ActivityFeed items={activities} />
              )}
            </div>
          </SectionCard>
        </div>

        {/* Unassigned leads */}
        <SectionCard title="Unassigned Leads" action={
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(212,175,55,0.12)', color: '#B8962E' }}>
            {unassigned.length} unassigned
          </span>
        }>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Score</th>
                  <th>Source</th>
                  <th>Budget</th>
                  <th>Assign To</th>
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="140px" height="12px" /></td>
                      <td><Skeleton width="60px" height="8px" /></td>
                      <td><Skeleton width="70px" height="12px" /></td>
                      <td><Skeleton width="60px" height="12px" /></td>
                      <td><Skeleton width="120px" height="32px" /></td>
                    </tr>
                  ))
                ) : unassigned.length > 0 ? unassigned.map(lead => (
                  <tr key={lead.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar initials={(maskName(lead.contact_name) || '??').slice(0, 2).toUpperCase()} size="sm" color="green" />
                        <div>
                          <div className="font-medium text-gray-900">{maskName(lead.contact_name)}</div>
                          <div className="text-xs text-gray-400">{maskEmail(lead.contact_email)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${lead.score || 50}%`, background: '#D4AF37' }} />
                        </div>
                        <span className="text-xs text-gray-500">{lead.score || 50}</span>
                      </div>
                    </td>
                    <td className="text-gray-500 capitalize">{lead.source || '—'}</td>
                    <td className="font-medium text-gray-900">{lead.budget_max ? `$${lead.budget_max.toLocaleString()}` : '—'}</td>
                    <td>
                      <select
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white"
                        style={{ color: '#4B5563' }}
                        defaultValue=""
                        onChange={e => e.target.value && handleAssign(lead.id, e.target.value)}
                      >
                        <option value="" disabled>Select realtor…</option>
                        {availableRealtors.map(r => (
                          <option key={r.id} value={r.id}>{r.full_name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">No unassigned leads</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Team table */}
        <SectionCard title="My Team">
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Realtor</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Skeleton width="36px" height="36px" variant="circle" />
                          <div><Skeleton width="120px" height="12px" /><Skeleton width="80px" height="10px" className="mt-1" /></div>
                        </div>
                      </td>
                      <td><Skeleton width="70px" height="20px" /></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="80px" height="12px" /></td>
                    </tr>
                  ))
                ) : realtors.length > 0 ? realtors.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar initials={(r.full_name || '??').slice(0, 2).toUpperCase()} size="sm" color="blue" />
                        <div>
                          <div className="font-medium text-gray-900">{r.full_name}</div>
                          <div className="text-xs text-gray-400">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge status={r.subscription_tier || 'standard'} /></td>
                    <td><Badge status={r.status || 'active'} /></td>
                    <td className="text-gray-500">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400">
                      No realtors in your territory
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

      </div>
    </AppLayout>
  );
}
