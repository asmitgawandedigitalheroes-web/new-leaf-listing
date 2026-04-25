import { useState, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { useToast } from '../../../context/ToastContext';
import { usePlatformSettings } from '../../../hooks/usePlatformSettings';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import {
  HiDocumentText,
  HiPlusCircle,
  HiTrash,
  HiArrowUp,
  HiArrowDown,
  HiEye,
  HiPencilSquare,
  HiArrowPath,
} from 'react-icons/hi2';

const P      = '#D4AF37';
const OS     = '#111111';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';
const SURF   = '#F9FAFB';

const DEFAULT_SECTIONS = [
  { num: '1', title: 'PURPOSE', body: `This Agreement establishes the Territory Partner's participation within the NLVListings platform and broader New Leaf Vision ecosystem.\n\nThe Territory Partner is granted the opportunity to operate within a defined geographic area ("Territory") and participate in platform-generated opportunities, subject to the terms of this Agreement.` },
  { num: '2', title: 'TERRITORY RIGHTS', body: `The Company may grant the Territory Partner priority or exclusive rights within a defined geographic region.\n\nSuch rights may include:\n• Priority or exclusive access to platform-generated leads\n• Market positioning within the Territory\n• First access to certain listings, buyers, or opportunities\n• Participation in localized growth of the platform\n\nThe scope, boundaries, and exclusivity of the Territory shall be defined separately and may evolve over time. The Company reserves the right to review and adjust Territory structures as the platform grows.` },
  { num: '3', title: 'PLATFORM PARTICIPATION', body: `The Territory Partner may:\n• Access and utilize the NLVListings platform\n• Participate in platform-generated leads\n• List, market, and promote properties\n• Engage with buyers and sellers within the ecosystem\n• Introduce opportunities aligned with the New Leaf Vision network\n\nParticipation is subject to compliance with platform rules and policies.` },
  { num: '4', title: 'PLATFORM LEADS AND TRANSACTIONS', body: `Any lead generated through the platform shall be considered a "Platform Lead." This includes:\n• Inquiries submitted through listings\n• Direct messages or contact requests\n• Referrals within the ecosystem\n• Leads generated through platform marketing\n\nAny transaction involving a Platform Lead shall be considered a "Platform Transaction," regardless of where the transaction is completed.` },
  { num: '5', title: 'LEAD ATTRIBUTION', body: `The Company maintains records of all Platform Leads through its systems.\n• Platform records shall serve as the primary reference for attribution\n• Attribution remains valid for a defined period (as outlined in platform policies)\n• The Company retains final discretion in determining attribution` },
  { num: '6', title: 'NON-CIRCUMVENTION', body: `The Territory Partner agrees not to:\n• Bypass the platform to avoid fees or obligations\n• Redirect Platform Leads outside the ecosystem\n• Complete transactions privately with Platform Leads\n\nAny attempt to circumvent the platform may result in enforcement actions, including suspension or termination.` },
  { num: '7', title: 'NEW LEAF VISION ECOSYSTEM', body: `The Territory Partner acknowledges that NLVListings is part of a broader ecosystem including:\n• Construction systems and development projects\n• Buyer demand generated through New Leaf Vision\n• Future services such as digital infrastructure, education, and transaction systems\n\nThe Territory Partner may:\n• Introduce clients to New Leaf Vision opportunities\n• Participate in project-related transactions\n• Access development and pre-sale opportunities when available\n\nParticipation in such opportunities is subject to Company discretion and program availability.` },
  { num: '8', title: 'DEVELOPMENT AND PROJECT ACCESS', body: `The Company may provide Territory Partners with access to:\n• Pre-construction or pre-sale opportunities\n• Off-market or early-stage developments\n• Projects associated with the New Leaf Vision ecosystem\n\nAccess is not guaranteed and may depend on:\n• Level of activity\n• Compliance with platform standards\n• Market availability` },
  { num: '9', title: 'BRAND AND REPRESENTATION', body: `The Territory Partner may promote listings and opportunities within the platform. However:\n• The Partner may not represent themselves as an employee or agent of the Company\n• All branding must comply with Company guidelines` },
  { num: '10', title: 'PLATFORM SYSTEMS AND COMMUNICATION', body: `The Territory Partner agrees to utilize the Company's systems where required, including:\n• CRM systems\n• Lead management tools\n• Communication platforms\n\nThis ensures proper tracking, attribution, and ecosystem integrity.` },
  { num: '11', title: 'MEDIA AND CONTENT', body: `The Territory Partner retains ownership of submitted content. However, the Company is granted a non-exclusive license to use such content for:\n• Platform display\n• Marketing\n• Promotional purposes` },
  { num: '12', title: 'TERM AND TERMINATION', body: `This Agreement remains in effect until terminated by either party.\n\nThe Company reserves the right to:\n• Modify Territory access\n• Revoke exclusivity\n• Suspend or terminate participation\n\nin cases of:\n• Breach of agreement\n• Misuse of the platform\n• Failure to maintain activity standards` },
  { num: '13', title: 'NO GUARANTEE', body: `The Company does not guarantee:\n• Lead volume\n• Transaction outcomes\n• Financial results\n\nParticipation is based on opportunity, not assurance.` },
  { num: '14', title: 'PLATFORM ROLE', body: `NLVListings is a technology platform only. The Company:\n• Is not a real estate broker\n• Does not participate in transactions\n• Does not represent buyers or sellers\n\nThe Territory Partner is solely responsible for compliance with applicable laws and licensing requirements.` },
  { num: '15', title: 'GOVERNING LAW', body: `This Agreement shall be governed by the laws of the State of Delaware.` },
];

function renumber(sections) {
  return sections.map((s, i) => ({ ...s, num: String(i + 1) }));
}

function PreviewModal({ sections, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER, flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            <HiDocumentText size={20} color={P} />
            <h2 className="text-base font-bold text-gray-900">Territory Partner Agreement — Preview</h2>
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1 rounded-lg border border-gray-200">Close</button>
        </div>
        <div className="overflow-y-auto px-6 py-5" style={{ flex: 1 }}>
          <h3 className="text-center font-bold text-gray-900 mb-1" style={{ fontSize: 17 }}>TERRITORY PARTNER AGREEMENT</h3>
          <p className="text-center text-xs text-gray-500 mb-6">NLVListings Platform — New Leaf Vision</p>
          {sections.map(s => (
            <div key={s.num} className="mb-5">
              <h4 className="font-bold text-sm mb-1" style={{ color: OS }}>
                {s.num}. {s.title}
              </h4>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ContractEditorPage() {
  const { addToast } = useToast();
  const { settings, isLoading, updateSetting, refresh } = usePlatformSettings();
  const [sections, setSections] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setSections(settings.contract_template || DEFAULT_SECTIONS);
    }
  }, [settings, isLoading]);

  const update = (idx, field, val) =>
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));

  const move = (idx, dir) => {
    const next = [...sections];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSections(renumber(next));
  };

  const addSection = () =>
    setSections(prev => renumber([...prev, { num: '', title: 'NEW SECTION', body: '' }]));

  const removeSection = (idx) => {
    if (sections.length <= 1) return;
    setSections(prev => renumber(prev.filter((_, i) => i !== idx)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await updateSetting('contract_template', sections);
    setIsSaving(false);
    if (error) {
      addToast({ type: 'error', title: 'Save failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Contract saved', desc: 'Directors will see the updated agreement on next load.' });
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset contract to the original default text? This cannot be undone.')) return;
    setSections(DEFAULT_SECTIONS);
  };

  return (
    <AppLayout role="admin">
      <div style={{ padding: 'clamp(16px, 4vw, 32px)', minHeight: '100vh', background: SURF }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract Editor</h1>
            <p className="text-sm text-gray-500 mt-0.5">Edit the Territory Partner Agreement shown to directors before they sign.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} title="Refresh" className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
              <HiArrowPath size={16} className="text-gray-500" />
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              <HiEye size={15} />
              Preview
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
            >
              Reset to Default
            </button>
            <Button variant="gold" onClick={handleSave} isLoading={isSaving}>
              Save Contract
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-5 px-4 py-3 rounded-xl text-sm text-yellow-800 flex items-start gap-2"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <HiDocumentText size={16} className="mt-0.5 flex-shrink-0" style={{ color: P }} />
          <span>
            Changes take effect immediately for directors who have <strong>not yet signed</strong>.
            Already-signed agreements are not retroactively altered — directors keep their signed version.
          </span>
        </div>

        {/* Sections */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(k => <Skeleton key={k} width="100%" height="160px" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sections.map((section, idx) => (
              <div key={idx} style={{
                background: '#fff', border: `1px solid ${BORDER}`,
                borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
              }}>
                {/* Section header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, background: SURF,
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 6, background: P,
                    color: '#fff', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {section.num}
                  </span>
                  <input
                    value={section.title}
                    onChange={e => update(idx, 'title', e.target.value)}
                    placeholder="Section title"
                    style={{
                      flex: 1, fontSize: 13, fontWeight: 700, color: OS,
                      border: 'none', outline: 'none', background: 'transparent',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}
                  />
                  <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0}
                      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title="Move up">
                      <HiArrowUp size={14} className="text-gray-500" />
                    </button>
                    <button onClick={() => move(idx, 1)} disabled={idx === sections.length - 1}
                      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title="Move down">
                      <HiArrowDown size={14} className="text-gray-500" />
                    </button>
                    <button onClick={() => removeSection(idx)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Remove section">
                      <HiTrash size={14} />
                    </button>
                  </div>
                </div>

                {/* Body textarea */}
                <div style={{ padding: '12px 16px' }}>
                  <textarea
                    value={section.body}
                    onChange={e => update(idx, 'body', e.target.value)}
                    placeholder="Section body text…"
                    rows={5}
                    style={{
                      width: '100%', fontSize: 13, color: '#374151',
                      border: `1px solid ${BORDER}`, borderRadius: 8,
                      padding: '10px 12px', resize: 'vertical', outline: 'none',
                      lineHeight: 1.6, fontFamily: 'inherit', background: '#fff',
                    }}
                    onFocus={e => { e.target.style.borderColor = P; }}
                    onBlur={e => { e.target.style.borderColor = BORDER; }}
                  />
                  <p style={{ fontSize: 11, color: LGRAY, marginTop: 4 }}>
                    Use • for bullet points. Press Enter for new lines.
                  </p>
                </div>
              </div>
            ))}

            {/* Add section button */}
            <button
              onClick={addSection}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
            >
              <HiPlusCircle size={18} />
              Add Section
            </button>
          </div>
        )}

        {/* Bottom save */}
        <div className="flex justify-end mt-6">
          <Button variant="gold" onClick={handleSave} isLoading={isSaving}>
            Save Contract
          </Button>
        </div>
      </div>

      {showPreview && <PreviewModal sections={sections} onClose={() => setShowPreview(false)} />}
    </AppLayout>
  );
}
