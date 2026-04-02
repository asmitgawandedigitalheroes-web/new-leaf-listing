import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import BarChart from '../../../components/shared/BarChart';
import Skeleton from '../../../components/ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  HiChartBar,
  HiArrowTrendingUp,
  HiUsers,
  HiHomeModern,
  HiChatBubbleLeftRight,
  HiBanknotes,
} from 'react-icons/hi2';

function KPI({ label, value, icon: Icon, color = '#D4AF37', isLoading }) {
  return (
    <div className="bg-white rounded-2xl p-5 flex items-center gap-4"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + '18' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <div className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{label}</div>
        {isLoading
          ? <Skeleton width="60px" height="24px" className="mt-1" />
          : <div className="text-2xl font-black text-gray-900 mt-0.5">{value}</div>}
      </div>
    </div>
  );
}

export default function DirectorReportsPage() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRealtors: 0,
    activeListings: 0,
    totalLeads: 0,
    convertedLeads: 0,
    totalCommissions: 0,
  });
  const [realtorRows, setRealtorRows] = useState([]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const territoryId = profile?.territory_id || null;

        // Build filters based on director's territory
        const [realtorsRes, listingsRes, leadsRes, commissionsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, status')
            .eq('role', 'realtor')
            .then(res => {
              if (territoryId) {
                return supabase
                  .from('profiles')
                  .select('id, full_name, status')
                  .eq('role', 'realtor')
                  .eq('territory_id', territoryId);
              }
              return res;
            }),
          supabase
            .from('listings')
            .select('id, status, realtor_id')
            .eq('status', 'active'),
          supabase
            .from('leads')
            .select('id, status, assigned_realtor_id')
            .then(res => {
              if (territoryId) {
                return supabase
                  .from('leads')
                  .select('id, status, assigned_realtor_id')
                  .eq('territory_id', territoryId);
              }
              return res;
            }),
          supabase
            .from('commissions')
            .select('id, amount, status')
            .in('status', ['paid', 'approved']),
        ]);

        const realtors = realtorsRes.data || [];
        const realtorIds = new Set(realtors.map(r => r.id));

        const allLeads = leadsRes.data || [];
        const myLeads = territoryId
          ? allLeads
          : allLeads.filter(l => realtorIds.has(l.assigned_realtor_id));

        const allListings = listingsRes.data || [];
        const myListings = allListings.filter(l => realtorIds.has(l.realtor_id));

        const allCommissions = commissionsRes.data || [];
        const myCommissions = allCommissions.filter(c => {
          // commissions linked via realtor — approximate with available data
          return true;
        });

        const convertedLeads = myLeads.filter(l => l.status === 'converted').length;
        const totalCommissionAmt = myCommissions.reduce((s, c) => s + (Number(c.amount) || 0), 0);

        setStats({
          totalRealtors: realtors.filter(r => r.status === 'active').length,
          activeListings: myListings.length,
          totalLeads: myLeads.length,
          convertedLeads,
          totalCommissions: totalCommissionAmt,
        });

        // Per-realtor breakdown
        const rows = realtors
          .filter(r => r.status === 'active')
          .map(r => {
            const rLeads     = myLeads.filter(l => l.assigned_realtor_id === r.id);
            const rConverted = rLeads.filter(l => l.status === 'converted').length;
            const rListings  = myListings.filter(l => l.realtor_id === r.id).length;
            const rate       = rLeads.length ? Math.round((rConverted / rLeads.length) * 100) : 0;
            return { id: r.id, name: r.full_name || 'Unknown', leads: rLeads.length, converted: rConverted, listings: rListings, rate };
          })
          .sort((a, b) => b.leads - a.leads);

        setRealtorRows(rows);
      } catch (err) {
        console.error('[DirectorReportsPage] load error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (profile) load();
  }, [profile?.id, profile?.territory_id]);

  const chartData = useMemo(() =>
    realtorRows.slice(0, 6).map(r => ({
      label: (r.name || '').split(' ')[0],
      value: r.leads,
    })),
    [realtorRows]
  );

  const conversionRate = stats.totalLeads
    ? Math.round((stats.convertedLeads / stats.totalLeads) * 100)
    : 0;

  return (
    <AppLayout role="director" title="Reports">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">Territory Reports</h2>
          <p className="text-sm text-gray-400 mt-0.5">Performance overview for your territory</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          <KPI label="Active Realtors"   value={stats.totalRealtors}   icon={HiUsers}                color="#1F4D3A" isLoading={isLoading} />
          <KPI label="Active Listings"   value={stats.activeListings}  icon={HiHomeModern}           color="#D4AF37" isLoading={isLoading} />
          <KPI label="Total Leads"       value={stats.totalLeads}      icon={HiChatBubbleLeftRight}  color="#3B82F6" isLoading={isLoading} />
          <KPI label="Converted"         value={stats.convertedLeads}  icon={HiArrowTrendingUp}      color="#10B981" isLoading={isLoading} />
          <KPI label="Conversion Rate"   value={`${conversionRate}%`}  icon={HiChartBar}             color="#8B5CF6" isLoading={isLoading} />
        </div>

        {/* Leads by Realtor chart */}
        {chartData.length > 0 && (
          <SectionCard title="Leads by Realtor (Top 6)">
            <div className="px-5 py-5">
              <BarChart data={chartData} />
            </div>
          </SectionCard>
        )}

        {/* Realtor breakdown table */}
        <SectionCard title={`Realtor Performance (${realtorRows.length})`}>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Realtor</th>
                  <th>Leads</th>
                  <th>Converted</th>
                  <th>Active Listings</th>
                  <th>Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="140px" height="12px" /></td>
                      <td><Skeleton width="40px" height="12px" /></td>
                      <td><Skeleton width="40px" height="12px" /></td>
                      <td><Skeleton width="40px" height="12px" /></td>
                      <td><Skeleton width="50px" height="20px" /></td>
                    </tr>
                  ))
                ) : realtorRows.length > 0 ? realtorRows.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium text-gray-900">{r.name}</td>
                    <td className="text-gray-700">{r.leads}</td>
                    <td className="text-gray-700">{r.converted}</td>
                    <td className="text-gray-700">{r.listings}</td>
                    <td>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: r.rate >= 50 ? '#E8F3EE' : r.rate >= 25 ? 'rgba(212,175,55,0.12)' : '#FEE2E2',
                          color:      r.rate >= 50 ? '#1F4D3A' : r.rate >= 25 ? '#B8962E' : '#991B1B',
                        }}>
                        {r.rate}%
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No realtor data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

      </div>
    </AppLayout>
  );
}
