import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import KPICard from '../../components/shared/KPICard';
import { SectionCard } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import LeadDrawer from '../../components/shared/LeadDrawer';
import { useAuth } from '../../context/AuthContext';
import { useListings } from '../../hooks/useListings';
import { useLeads } from '../../hooks/useLeads';
import { supabase } from '../../lib/supabase';
import { useEffect, useState, useMemo } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  HiHome,
  HiUsers,
  HiBanknotes,
  HiCheckBadge,
} from 'react-icons/hi2';

export default function RealtorDashboard() {
  useDocumentTitle('Realtor Dashboard');
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [selectedLead, setSelectedLead] = useState(null);
  const { listings: myListings, isLoading: listingsLoading, submitForApproval } = useListings();
  const { leads: myLeads, isLoading: leadsLoading } = useLeads();
  const [commissions, setCommissions] = useState([]);
  const [commissionsLoading, setCommissionsLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;
      
      // Commissions
      setCommissionsLoading(true);
      const { data: commData } = await supabase
        .from('commissions')
        .select('*, listing:listings(title, city)')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setCommissions(commData || []);
      setCommissionsLoading(false);

      // Activities
      setActivitiesLoading(true);
      const { data: actData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(5);
      setActivities(actData || []);
      setActivitiesLoading(false);
    }
    fetchDashboardData();
  }, [user?.id]);

  const kpis = useMemo(() => [
    { label: 'My Listings',   value: myListings.length.toString(),                     trend: null, trendLabel: '', icon: <HiHome className="text-blue-600" /> },
    { label: 'Active Leads',  value: myLeads.filter(l => l.status !== 'converted').length.toString(), trend: null, trendLabel: '', icon: <HiUsers className="text-purple-600" /> },
    { label: 'Commission YTD', value: `$${commissions.reduce((s, c) => s + (Number(c.amount) || 0), 0).toLocaleString()}`, trend: null, trendLabel: '', icon: <HiBanknotes className="text-green-600" /> },
    { label: 'Closed Deals',  value: myLeads.filter(l => l.status === 'converted').length.toString(), trend: null, trendLabel: '', icon: <HiCheckBadge className="text-yellow-600" /> },
  ], [myListings, myLeads, commissions]);

  return (
    <AppLayout role="realtor" title="My Dashboard">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(listingsLoading || leadsLoading) ? (
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

        {/* Listings + activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* My listings */}
          <div className="lg:col-span-2">
            <SectionCard title="My Listings" action={
              <Link to="/realtor/listings" className="inline-flex items-center justify-center px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-all font-headline no-underline" style={{ background: '#D4AF37' }}>
                + Add Listing
              </Link>
            }>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Views</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listingsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <tr key={i}>
                          <td><Skeleton width="140px" height="14px" /><Skeleton width="80px" height="10px" className="mt-1" /></td>
                          <td><Skeleton width="70px" height="14px" /></td>
                          <td><Skeleton width="60px" height="20px" /></td>
                          <td><Skeleton width="40px" height="12px" /></td>
                        </tr>
                      ))
                    ) : myListings.slice(0, 4).map(l => (
                      <tr key={l.id}>
                        <td>
                          <div className="font-medium text-gray-900 text-sm">{l.title}</div>
                          <div className="text-xs text-gray-400">{l.city}</div>
                        </td>
                        <td className="font-semibold text-gray-900">${l.price?.toLocaleString()}</td>
                        <td><Badge status={l.status} /></td>
                        <td className="text-gray-500">{l.views_count || 0}</td>
                        <td>
                          {(l.status === 'draft' || l.status === 'rejected') && (
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => submitForApproval(l.id)}
                            >
                              Submit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Recent Activity">
            <div className="px-5 py-4">
               {activitiesLoading ? (
                 <div className="flex flex-col gap-3">
                   <Skeleton width="100%" height="12px" />
                   <Skeleton width="80%" height="12px" />
                   <Skeleton width="90%" height="12px" />
                 </div>
               ) : activities.length > 0 ? (
                 <div className="space-y-4">
                   {activities.map((a, i) => (
                     <div key={i} className="flex gap-3 items-start">
                       <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#D4AF37' }} />
                       <div>
                         <p className="text-[13px] text-gray-700 leading-tight capitalize">
                           {a.action.replace(/\./g, ' ')} 
                           <span className="text-gray-400 ml-1">#{a.entity_id?.slice(-4)}</span>
                         </p>
                         <p className="text-[10px] text-gray-400 mt-1">{new Date(a.timestamp).toLocaleString()}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-xs text-gray-500 italic">No recent activity logs.</p>
               )}
            </div>
          </SectionCard>
        </div>

        {/* My leads */}
        <SectionCard title="My Leads" action={
          <Button variant="outline" size="sm" onClick={() => navigate('/realtor/leads')}>View All</Button>
        }>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Budget</th>
                  <th>Interest</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="120px" height="14px" /><Skeleton width="100px" height="10px" className="mt-1" /></td>
                      <td><Skeleton width="60px" height="20px" /></td>
                      <td><Skeleton width="80px" height="8px" /></td>
                      <td><Skeleton width="70px" height="12px" /></td>
                      <td><Skeleton width="90px" height="12px" /></td>
                      <td><Skeleton width="50px" height="32px" /></td>
                    </tr>
                  ))
                ) : myLeads.slice(0, 5).map(lead => (
                  <tr key={lead.id} className="cursor-pointer" onClick={() => setSelectedLead(lead)}>
                    <td>
                      <div className="font-medium text-gray-900">{lead.contact_name}</div>
                      <div className="text-xs text-gray-400">{lead.contact_email}</div>
                    </td>
                    <td><Badge status={lead.status} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full">
                          <div className="h-full rounded-full" style={{ width: `${lead.score}%`, background: '#D4AF37' }} />
                        </div>
                        <span className="text-xs text-gray-500">{lead.score}</span>
                      </div>
                    </td>
                    <td className="text-gray-600">${lead.budget_max?.toLocaleString() || 'N/A'}</td>
                    <td className="text-gray-500">{lead.listing?.title || lead.interest_type || 'General Inquiry'}</td>
                    <td>
                      <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setSelectedLead(lead); }}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

      </div>

      {/* Lead detail drawer */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

    </AppLayout>
  );
}
                   