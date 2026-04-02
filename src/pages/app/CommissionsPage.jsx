import AppLayout from '../../components/layout/AppLayout';
import KPICard from '../../components/shared/KPICard';
import { SectionCard } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { useCommissions } from '../../hooks/useCommissions';
import { useAuth } from '../../context/AuthContext';
import { useState, useMemo } from 'react';

export default function CommissionsPage() {
  const { profile } = useAuth();
  const { commissions, isLoading, markPayable } = useCommissions();
  const [isRequesting, setIsRequesting] = useState(false);

  const stats = useMemo(() => {
    const paid      = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const pending   = commissions.filter(c => c.status === 'approved' || c.status === 'payable').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const thisMonth = commissions
      .filter(c => c.status === 'paid' && new Date(c.paid_at || c.created_at).getMonth() === new Date().getMonth())
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    return [
      { label: 'Total Earned YTD', value: `$${paid.toLocaleString()}`, trend: 0, trendLabel: 'confirmed payouts', icon: '💰' },
      { label: 'Pending Payout',   value: `$${pending.toLocaleString()}`, trend: 0, trendLabel: 'awaiting disbursement', icon: '⏳', accentColor: 'green' },
      { label: 'Paid This Month',  value: `$${thisMonth.toLocaleString()}`, trend: 0, trendLabel: 'current cycle', icon: '✅' },
      { label: 'Avg. Rate',        value: '3.2%', trend: 0, trendLabel: 'platform average', icon: '📊', accentColor: 'green' },
    ];
  }, [commissions]);

  return (
    <AppLayout 
      role="realtor" 
      title="Commissions" 
      user={{ 
        name: profile?.full_name || 'User', 
        role: profile?.role || 'realtor', 
        initials: (profile?.full_name || 'U').slice(0, 2).toUpperCase() 
      }}
    >
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <Skeleton width="40px" height="40px" className="mb-3" />
                <Skeleton width="100px" height="24px" className="mb-2" />
                <Skeleton width="140px" height="14px" />
              </div>
            ))
          ) : stats.map(kpi => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>

        {/* Disbursement breakdown */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SectionCard title="Commission History">
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Property/Source</th>
                      <th>Amount</th>
                      <th>Created</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      [...Array(4)].map((_, i) => (
                        <tr key={i}>
                          <td><Skeleton width="180px" height="14px" /></td>
                          <td><Skeleton width="80px" height="14px" /></td>
                          <td><Skeleton width="100px" height="12px" /></td>
                          <td><Skeleton width="60px" height="20px" /></td>
                        </tr>
                      ))
                    ) : commissions.length > 0 ? commissions.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div className="font-medium text-gray-900">
                            {c.listing?.title || c.source_payment_id || `Comm. #${c.id.slice(0, 8)}`}
                          </div>
                          <div className="text-xs text-gray-400 capitalize">{c.commission_type || 'Platform split'}</div>
                        </td>
                        <td className="font-bold text-gray-900">${Number(c.amount || 0).toLocaleString()}</td>
                        <td className="text-gray-400 text-sm">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td><Badge status={c.status} /></td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="py-8 text-center text-gray-400">No commission records found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          {/* Split breakdown card */}
          <div>
            <SectionCard title="Split Breakdown">
              <div className="px-5 py-4 flex flex-col gap-4">
                {[
                  { label: 'Agent (Me)', pct: 70, color: '#D4AF37' },
                  { label: 'Director',  pct: 15, color: '#D4AF37' },
                  { label: 'Brokerage', pct: 15, color: '#4B5563' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-700 font-medium">{s.label}</span>
                      <span className="font-bold" style={{ color: s.color }}>{s.pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                    </div>
                  </div>
                ))}

                <div className="border-t border-gray-100 pt-4 mt-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Approved & Payable</div>
                  <div className="text-2xl font-black text-gray-900">
                    ${commissions
                      .filter(c => c.status === 'approved' || c.status === 'payable')
                      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
                      .toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">ready for payout</div>
                </div>
                {(profile?.role === 'admin' || profile?.role === 'director') && (
                  <Button
                    variant="primary"
                    className="mt-4 w-full"
                    isLoading={isRequesting}
                    onClick={async () => {
                      setIsRequesting(true);
                      await markPayable();
                      setIsRequesting(false);
                    }}
                  >
                    Mark All Payable
                  </Button>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
