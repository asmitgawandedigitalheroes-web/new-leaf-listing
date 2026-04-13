import { useState, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { SectionCard } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
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
  HiXMark,
  HiPencilSquare,
  HiExclamationTriangle,
} from 'react-icons/hi2';

const GOLD = '#D4AF37';
const DEEP = '#1F4D3A';
const BORDER = '#E5E7EB';

// ── Territory Partner Agreement text ─────────────────────────────────────────

const AGREEMENT_SECTIONS = [
  {
    num: '1', title: 'PURPOSE',
    body: `This Agreement establishes the Territory Partner's participation within the NLVListings platform and broader New Leaf Vision ecosystem.\n\nThe Territory Partner is granted the opportunity to operate within a defined geographic area ("Territory") and participate in platform-generated opportunities, subject to the terms of this Agreement.`,
  },
  {
    num: '2', title: 'TERRITORY RIGHTS',
    body: `The Company may grant the Territory Partner priority or exclusive rights within a defined geographic region.\n\nSuch rights may include:\n• Priority or exclusive access to platform-generated leads\n• Market positioning within the Territory\n• First access to certain listings, buyers, or opportunities\n• Participation in localized growth of the platform\n\nThe scope, boundaries, and exclusivity of the Territory shall be defined separately and may evolve over time. The Company reserves the right to review and adjust Territory structures as the platform grows.`,
  },
  {
    num: '3', title: 'PLATFORM PARTICIPATION',
    body: `The Territory Partner may:\n• Access and utilize the NLVListings platform\n• Participate in platform-generated leads\n• List, market, and promote properties\n• Engage with buyers and sellers within the ecosystem\n• Introduce opportunities aligned with the New Leaf Vision network\n\nParticipation is subject to compliance with platform rules and policies.`,
  },
  {
    num: '4', title: 'PLATFORM LEADS AND TRANSACTIONS',
    body: `Any lead generated through the platform shall be considered a "Platform Lead." This includes:\n• Inquiries submitted through listings\n• Direct messages or contact requests\n• Referrals within the ecosystem\n• Leads generated through platform marketing\n\nAny transaction involving a Platform Lead shall be considered a "Platform Transaction," regardless of where the transaction is completed.`,
  },
  {
    num: '5', title: 'LEAD ATTRIBUTION',
    body: `The Company maintains records of all Platform Leads through its systems.\n• Platform records shall serve as the primary reference for attribution\n• Attribution remains valid for a defined period (as outlined in platform policies)\n• The Company retains final discretion in determining attribution`,
  },
  {
    num: '6', title: 'NON-CIRCUMVENTION',
    body: `The Territory Partner agrees not to:\n• Bypass the platform to avoid fees or obligations\n• Redirect Platform Leads outside the ecosystem\n• Complete transactions privately with Platform Leads\n\nAny attempt to circumvent the platform may result in enforcement actions, including suspension or termination.`,
  },
  {
    num: '7', title: 'NEW LEAF VISION ECOSYSTEM',
    body: `The Territory Partner acknowledges that NLVListings is part of a broader ecosystem including:\n• Construction systems and development projects\n• Buyer demand generated through New Leaf Vision\n• Future services such as digital infrastructure, education, and transaction systems\n\nThe Territory Partner may:\n• Introduce clients to New Leaf Vision opportunities\n• Participate in project-related transactions\n• Access development and pre-sale opportunities when available\n\nParticipation in such opportunities is subject to Company discretion and program availability.`,
  },
  {
    num: '8', title: 'DEVELOPMENT AND PROJECT ACCESS',
    body: `The Company may provide Territory Partners with access to:\n• Pre-construction or pre-sale opportunities\n• Off-market or early-stage developments\n• Projects associated with the New Leaf Vision ecosystem\n\nAccess is not guaranteed and may depend on:\n• Level of activity\n• Compliance with platform standards\n• Market availability`,
  },
  {
    num: '9', title: 'BRAND AND REPRESENTATION',
    body: `The Territory Partner may promote listings and opportunities within the platform. However:\n• The Partner may not represent themselves as an employee or agent of the Company\n• All branding must comply with Company guidelines`,
  },
  {
    num: '10', title: 'PLATFORM SYSTEMS AND COMMUNICATION',
    body: `The Territory Partner agrees to utilize the Company's systems where required, including:\n• CRM systems\n• Lead management tools\n• Communication platforms\n\nThis ensures proper tracking, attribution, and ecosystem integrity.`,
  },
  {
    num: '11', title: 'MEDIA AND CONTENT',
    body: `The Territory Partner retains ownership of submitted content. However, the Company is granted a non-exclusive license to use such content for:\n• Platform display\n• Marketing\n• Promotional purposes`,
  },
  {
    num: '12', title: 'TERM AND TERMINATION',
    body: `This Agreement remains in effect until terminated by either party.\n\nThe Company reserves the right to:\n• Modify Territory access\n• Revoke exclusivity\n• Suspend or terminate participation\n\nin cases of:\n• Breach of agreement\n• Misuse of the platform\n• Failure to maintain activity standards`,
  },
  {
    num: '13', title: 'NO GUARANTEE',
    body: `The Company does not guarantee:\n• Lead volume\n• Transaction outcomes\n• Financial results\n\nParticipation is based on opportunity, not assurance.`,
  },
  {
    num: '14', title: 'PLATFORM ROLE',
    body: `NLVListings is a technology platform only. The Company:\n• Is not a real estate broker\n• Does not participate in transactions\n• Does not represent buyers or sellers\n\nThe Territory Partner is solely responsible for compliance with applicable laws and licensing requirements.`,
  },
  {
    num: '15', title: 'GOVERNING LAW',
    body: `This Agreement shall be governed by the laws of the State of Delaware.`,
  },
];

// ── Contract modal ────────────────────────────────────────────────────────────

function ContractModal({ profile, onClose, onSigned }) {
  const [entityName, setEntityName] = useState(profile?.full_name || '');
  const [accepted, setAccepted]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!entityName.trim()) { setError('Please enter your legal name or entity name.'); return; }
    if (!accepted) { setError('You must read and accept the agreement to proceed.'); return; }
    setError('');
    setSaving(true);
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({
        territory_contract_signed_at:   new Date().toISOString(),
        territory_contract_entity_name: entityName.trim(),
      })
      .eq('id', profile.id);
    setSaving(false);
    if (dbErr) { setError('Failed to save. Please try again.'); return; }
    onSigned({ signedAt: new Date().toISOString(), entityName: entityName.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '90vh' }}>

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: BORDER, flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#E8F3EE' }}>
              <HiDocumentText className="w-5 h-5" style={{ color: DEEP }} />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">Territory Partner Agreement</div>
              <div className="text-[11px] text-gray-400">New Leaf Vision Inc. — Read carefully before signing</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <HiXMark className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Contract body — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* Title block */}
          <div className="text-center mb-6 pb-6 border-b" style={{ borderColor: BORDER }}>
            <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: GOLD }}>
              New Leaf Vision Inc.
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-3">
              NLVLISTINGS TERRITORY PARTNER AGREEMENT
            </h2>
            <div className="text-xs text-gray-500 mb-4">Effective Date: {today}</div>
            <div className="text-xs text-gray-600 leading-relaxed">
              This Territory Partner Agreement ("Agreement") is entered into between{' '}
              <strong>New Leaf Vision Inc.</strong>, a Delaware corporation ("Company") and{' '}
              <strong>{entityName || '[Partner Name / Entity]'}</strong> ("Territory Partner").
            </div>
          </div>

          {/* Sections */}
          {AGREEMENT_SECTIONS.map(sec => (
            <div key={sec.num} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: DEEP, color: '#fff' }}>{sec.num}</span>
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">{sec.title}</h3>
              </div>
              <div className="pl-8 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                {sec.body}
              </div>
            </div>
          ))}

          {/* Signatures block */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: BORDER }}>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-800 mb-4">16. SIGNATURES</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB', border: `1px solid ${BORDER}` }}>
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Company</div>
                <div className="text-sm font-bold text-gray-800">New Leaf Vision Inc.</div>
                <div className="text-xs text-gray-500 mt-1">Authorized Representative</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB', border: `1px solid ${BORDER}` }}>
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Territory Partner</div>
                <div className="text-sm font-bold text-gray-800">{entityName || '—'}</div>
                <div className="text-xs text-gray-500 mt-1">Electronic signature on {today}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Signature form — fixed at bottom */}
        <form onSubmit={handleSubmit} className="px-6 py-5 border-t flex flex-col gap-4"
          style={{ borderColor: BORDER, flexShrink: 0, background: '#F9FAFB' }}>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
              Your Legal Name or Entity Name *
            </label>
            <input
              type="text"
              value={entityName}
              onChange={e => setEntityName(e.target.value)}
              placeholder="e.g. John Smith or Smith Realty LLC"
              className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none"
              style={{
                border: `1px solid ${BORDER}`,
                background: '#fff',
                color: '#111',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#1F4D3A]"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              I have read and fully understand the NLVListings Territory Partner Agreement. I agree to be bound by its terms and conditions on behalf of myself and/or my entity.
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: DEEP }}
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing…
                </>
              ) : (
                <>
                  <HiPencilSquare className="w-4 h-4" />
                  Sign &amp; Submit Agreement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DirectorContractsPage() {
  const { profile } = useAuth();
  const [contractData, setContractData] = useState(null);
  const [loadingContract, setLoadingContract] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState(new Set());

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('profiles')
      .select('territory_contract_signed_at, territory_contract_entity_name')
      .eq('id', profile.id)
      .single()
      .then(({ data }) => {
        setContractData(data);
        setLoadingContract(false);
      });
  }, [profile?.id]);

  const isSigned = !!contractData?.territory_contract_signed_at;
  const signedDate = isSigned
    ? new Date(contractData.territory_contract_signed_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const handleSigned = ({ signedAt, entityName }) => {
    setContractData({ territory_contract_signed_at: signedAt, territory_contract_entity_name: entityName });
    setShowModal(false);
  };

  const DOCS = [
    {
      id: 'territory',
      icon: HiDocumentText,
      title: 'Territory Partner Agreement',
      desc: 'Your agreement granting priority/exclusive rights over your assigned territory within the NLVListings platform.',
      status: isSigned ? 'signed' : 'pending',
      date: isSigned ? `Signed ${signedDate}` : 'Action required',
      color: DEEP,
      bg: '#E8F3EE',
      action: isSigned ? null : 'sign',
      downloadable: isSigned,
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
      status: 'active',
      date: 'Always current',
      color: GOLD,
      bg: 'rgba(212,175,55,0.10)',
      link: '/full-contracts',
      downloadable: false,
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
          {!loadingContract && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{ background: isSigned ? '#E8F3EE' : 'rgba(212,175,55,0.10)' }}>
              {isSigned
                ? <HiCheckCircle className="w-4 h-4" style={{ color: DEEP }} />
                : <HiExclamationTriangle className="w-4 h-4" style={{ color: GOLD }} />}
              <span className="text-sm font-semibold"
                style={{ color: isSigned ? DEEP : '#92741A' }}>
                {isSigned ? 'All agreements on file' : 'Territory agreement required'}
              </span>
            </div>
          )}
        </div>

        {/* Unsigned banner */}
        {!loadingContract && !isSigned && (
          <div className="rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{
              background: '#1A202C',
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
              borderLeft: `3px solid ${GOLD}`,
            }}>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Action Required</div>
              <div className="text-white font-bold text-lg mb-1">Sign Your Territory Partner Agreement</div>
              <div className="text-gray-400 text-sm">
                To activate your territory and access all director features, please review and sign the Territory Partner Agreement.
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold flex-shrink-0 transition-all hover:opacity-90"
              style={{ background: GOLD, color: '#111' }}
            >
              <HiPencilSquare className="w-4 h-4" />
              Review &amp; Sign
            </button>
          </div>
        )}

        {/* Signed summary card */}
        {!loadingContract && isSigned && (
          <div className="rounded-2xl p-5 md:p-6"
            style={{
              background: '#1A202C',
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
              borderLeft: `3px solid ${GOLD}`,
            }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Territory Director Agreement</div>
                <div className="text-white font-bold text-lg mb-1">
                  {contractData.territory_contract_entity_name || profile?.full_name || 'Regional Director'}
                </div>
                <div className="text-gray-400 text-sm">{profile?.territory || 'Territory'} · Signed {signedDate}</div>
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
        )}

        {/* Documents Grid */}
        <SectionCard title="Your Documents">
          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOCS.map(doc => {
              const Icon = doc.icon;
              const downloaded = downloadedIds.has(doc.id);
              const isPending = doc.status === 'pending';
              return (
                <div key={doc.id} className="rounded-xl border overflow-hidden"
                  style={{
                    borderColor: isPending ? GOLD : BORDER,
                    boxShadow: isPending ? `0 0 0 1px ${GOLD}` : '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
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
                          style={{ background: isPending ? GOLD : doc.status === 'signed' ? '#059669' : '#3B82F6' }} />
                        <span className="text-[10px] font-semibold capitalize"
                          style={{ color: isPending ? '#92741A' : doc.status === 'signed' ? '#059669' : '#3B82F6' }}>
                          {isPending ? 'Pending signature' : doc.status === 'signed' ? 'Signed' : 'Active'}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">{doc.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.action === 'sign' && (
                          <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                            style={{ background: GOLD, color: '#111' }}
                          >
                            <HiPencilSquare className="w-3.5 h-3.5" />
                            Sign Now
                          </button>
                        )}
                        {doc.link && (
                          <Link
                            to={doc.link}
                            target="_blank"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                            style={{ background: doc.bg, color: doc.color }}
                          >
                            <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
                            View
                          </Link>
                        )}
                        {doc.downloadable && (
                          <button
                            onClick={() => setDownloadedIds(prev => new Set([...prev, doc.id]))}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                            style={{
                              background: downloaded ? '#F0FDF4' : '#F9FAFB',
                              color: downloaded ? '#059669' : '#6B7280',
                              border: downloaded ? '1px solid #BBF7D0' : `1px solid ${BORDER}`,
                            }}
                          >
                            {downloaded
                              ? <><HiCheckCircle className="w-3.5 h-3.5" /> Saved</>
                              : <><HiArrowDownTray className="w-3.5 h-3.5" /> Download</>}
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

        {/* Key terms */}
        <SectionCard title="Key Agreement Terms">
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: HiCalendar, label: 'Agreement Start', value: 'Upon territory activation', color: DEEP, bg: '#E8F3EE' },
                { icon: HiScale, label: 'Commission Rate', value: '25% Monthly Override', color: GOLD, bg: 'rgba(212,175,55,0.1)' },
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
              <button onClick={() => setShowModal(true)}>
                <Button variant="outline" size="sm" className="flex items-center gap-2 flex-shrink-0">
                  <HiDocumentText className="w-4 h-4" />
                  {isSigned ? 'View Agreement' : 'Sign Agreement'}
                </Button>
              </button>
            </div>
          </div>
        </SectionCard>

      </div>

      {showModal && (
        <ContractModal
          profile={profile}
          onClose={() => setShowModal(false)}
          onSigned={handleSigned}
        />
      )}
    </AppLayout>
  );
}
