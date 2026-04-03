import { useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  HiDocumentText,
  HiShieldCheck,
  HiArrowTopRightOnSquare,
  HiArrowDownTray,
  HiCheckCircle,
  HiCalendar,
  HiScale,
  HiLockClosed,
} from 'react-icons/hi2';

const DOCS = [
  {
    id: 'territory',
    icon: HiDocumentText,
    title: 'Territory Agreement',
    desc: 'Your signed agreement granting exclusive rights over your assigned territory.',
    status: 'signed',
    date: 'On file',
    color: '#1F4D3A',
    bg: '#E8F3EE',
    link: '/full-contracts',
    downloadable: true,
  },
  {
    id: 'platform',
    icon: HiShieldCheck,
    title: 'Platform Rules',
    desc: 'Operational guidelines, lead handling policies, and code of conduct for all participants.',
    status: 'active',
    date: 'Always current',
    color: '#3B82F6',
    bg: '#EFF6FF',
    link: '/platform-rules',
    downloadable: false,
  },
  {
    id: 'commissions',
    icon: HiScale,
    title: 'Commission Structure',
    desc: 'Your 25% recurring override commission terms and payout schedule agreement.',
    status: 'signed',
    date: 'On file',
    color: '#D4AF37',
    bg: 'rgba(212,175,55,0.10)',
    link: '/full-contracts',
    downloadable: true,
  },
  {
    id: 'privacy',
    icon: HiLockClosed,
    title: 'Data & Privacy Policy',
    desc: 'How NLV Listings handles lead data, GDPR compliance, and your obligations.',
    status: 'active',
    date: 'Always current',
    color: '#6B7280',
    bg: '#F9FAFB',
    link: '/privacy-policy',
    downloadable: false,
  },
];

export default function DirectorContractsPage() {
  const { profile } = useAuth();
  const [downloadedIds, setDownloadedIds] = useState(new Set());

  const markDownloaded = (id) => {
    setDownloadedIds(prev => new Set([...prev, id]));
  };

  return (
    <AppLayout role="director" title="Legal & Contracts">
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Director Panel</div>
            <h2 className="text-xl font-bold text-gray-900">Legal & Contracts</h2>
            <p className="text-sm text-gray-400 mt-0.5">Your signed agreements and platform policies</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#E8F3EE' }}>
            <HiCheckCircle className="w-4 h-4" style={{ color: '#1F4D3A' }} />
            <span className="text-sm font-semibold" style={{ color: '#1F4D3A' }}>All agreements on file</span>
          </div>
        </div>

        {/* Director Summary Card */}
        <div className="rounded-2xl p-5 md:p-6"
          style={{
            background: '#1A202C',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            borderLeft: '3px solid #D4AF37',
          }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Territory Director Agreement</div>
              <div className="text-white font-bold text-lg mb-1">{profile?.full_name || 'Regional Director'}</div>
              <div className="text-gray-400 text-sm">{profile?.territory || 'Territory'} · Director since {profile?.joined || '—'}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-sm font-semibold">Active Agreement</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-700">
            {[
              { label: 'Commission', value: '25% Override' },
              { label: 'Territory', value: profile?.territory || '—' },
              { label: 'Status', value: 'Active Director' },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">{item.label}</div>
                <div className="text-white text-sm font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Documents Grid */}
        <SectionCard title="Your Documents">
          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOCS.map(doc => {
              const Icon = doc.icon;
              const downloaded = downloadedIds.has(doc.id);
              return (
                <div key={doc.id} className="rounded-xl border border-gray-100 overflow-hidden"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: doc.bg }}>
                        <Icon className="w-5 h-5" style={{ color: doc.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm mb-1">{doc.title}</div>
                        <p className="text-xs text-gray-500 leading-relaxed">{doc.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full"
                          style={{ background: doc.status === 'signed' ? '#059669' : '#3B82F6' }} />
                        <span className="text-[10px] font-semibold capitalize"
                          style={{ color: doc.status === 'signed' ? '#059669' : '#3B82F6' }}>
                          {doc.status === 'signed' ? 'Signed' : 'Active'}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">{doc.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={doc.link}
                          target="_blank"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                          style={{ background: doc.bg, color: doc.color }}
                        >
                          <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
                          View
                        </Link>
                        {doc.downloadable && (
                          <button
                            onClick={() => markDownloaded(doc.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                            style={{
                              background: downloaded ? '#F0FDF4' : '#F9FAFB',
                              color: downloaded ? '#059669' : '#6B7280',
                              border: downloaded ? '1px solid #BBF7D0' : '1px solid #E5E7EB',
                            }}
                          >
                            {downloaded
                              ? <><HiCheckCircle className="w-3.5 h-3.5" /> Saved</>
                              : <><HiArrowDownTray className="w-3.5 h-3.5" /> Download</>
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Important Dates */}
        <SectionCard title="Key Agreement Terms">
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: HiCalendar, label: 'Agreement Start', value: 'Upon territory activation', color: '#1F4D3A', bg: '#E8F3EE' },
                { icon: HiScale, label: 'Commission Rate', value: '25% Monthly Override', color: '#D4AF37', bg: 'rgba(212,175,55,0.1)' },
                { icon: HiShieldCheck, label: 'Territory Exclusivity', value: 'Exclusive rights granted', color: '#3B82F6', bg: '#EFF6FF' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: item.bg }}>
                    <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: item.color }} />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: item.color }}>{item.label}</div>
                      <div className="text-sm font-semibold text-gray-800">{item.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-gray-400 leading-relaxed max-w-lg">
                All agreements are binding under NLV Listings Platform Terms. For disputes or modifications to your territory agreement, contact your platform administrator.
              </p>
              <Link to="/full-contracts" target="_blank">
                <Button variant="outline" size="sm" className="flex items-center gap-2 flex-shrink-0">
                  <HiDocumentText className="w-4 h-4" />
                  View Full Contract
                </Button>
              </Link>
            </div>
          </div>
        </SectionCard>

      </div>
    </AppLayout>
  );
}
