import Drawer from '../ui/Drawer';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';

import { HiPhone, HiEnvelope, HiCalendar, HiTag, HiCurrencyDollar, HiIdentification, HiChatBubbleLeftEllipsis, HiLockClosed, HiLockOpen, HiPaperAirplane, HiXCircle } from 'react-icons/hi2';

/** Maps raw DB status values to the UI status values used in the dropdown. */
function normalizeStatus(status) {
  const map = {
    new: 'new', assigned: 'new',
    contacted: 'contacted',
    showing: 'in_progress', offer: 'in_progress', in_progress: 'in_progress',
    lost: 'lost',
    converted: 'closed', closed: 'closed',
  };
  return map[status] || 'new';
}

/** Mask an email: j***@domain.com */
function maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return '•••••••';
  return `${local[0]}${'•'.repeat(Math.min(local.length - 1, 4))}@${domain}`;
}

/** Mask a phone: (•••) •••-4567 */
function maskPhone(phone) {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '•••••••';
  return `(•••) •••-${digits.slice(-4)}`;
}

function ContactGate({ lead, type }) {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [sent, setSent] = useState(false);

  const handleRequest = async () => {
    setSent(true);
    await supabase.rpc('log_audit_event', {
      p_user_id:     user?.id,
      p_action:      'lead.contact_requested',
      p_entity_type: 'lead',
      p_entity_id:   lead.id,
      p_metadata:    { contact_type: type, lead_name: lead.contact_name },
    });
    addToast({
      type: 'success',
      title: 'Contact request sent',
      desc: `Your ${type} request has been logged.`,
    });
  };

  return (
    <div className="flex-1 p-3 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
        {type === 'email' ? <HiEnvelope className="w-3 h-3" /> : <HiPhone className="w-3 h-3" />}
        {type}
      </div>
      <div className="text-xs font-mono text-gray-600 truncate">
        {type === 'email' ? maskEmail(lead.contact_email) : maskPhone(lead.contact_phone)}
      </div>
      <button
        onClick={handleRequest}
        disabled={sent}
        className={`w-full mt-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
          sent ? 'bg-green-50 text-green-600' : 'bg-gold text-white hover:bg-gold-dark shadow-sm'
        }`}
      >
        {sent ? '✓ REQUESTED' : 'REQUEST CONTACT'}
      </button>
    </div>
  );
}

/** 180-day attribution lock badge — shows lock expiry and release button for directors */
function LockBadge({ lead, onRelease }) {
  const { role } = useAuth();
  const { addToast } = useToast();
  const [releasing, setReleasing] = useState(false);

  if (!lead?.lock_until) return null;

  const lockDate    = new Date(lead.lock_until);
  const isLocked    = lockDate > new Date();
  const daysLeft    = isLocked ? Math.ceil((lockDate - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  const handleRelease = async () => {
    setReleasing(true);
    const { error } = await supabase
      .from('leads')
      .update({ lock_until: null, updated_at: new Date().toISOString() })
      .eq('id', lead.id);
    setReleasing(false);
    if (error) {
      addToast({ type: 'error', title: 'Release failed', desc: error.message });
    } else {
      addToast({ type: 'success', title: 'Lock released', desc: 'The 180-day attribution lock has been removed.' });
      onRelease?.();
    }
  };

  return (
    <div className="mb-8 p-4 rounded-xl border"
      style={{
        background: isLocked ? 'rgba(212,175,55,0.06)' : 'rgba(209,250,229,0.4)',
        borderColor: isLocked ? 'rgba(212,175,55,0.25)' : '#BBF7D0',
      }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {isLocked
            ? <HiLockClosed className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D4AF37' }} />
            : <HiLockOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
          }
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1"
              style={{ color: isLocked ? '#B8962E' : '#059669' }}>
              {isLocked ? '180-Day Attribution Lock' : 'Lock Expired'}
            </div>
            {isLocked ? (
              <div className="text-xs text-gray-700">
                Protected until <span className="font-semibold">{lockDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: 'rgba(212,175,55,0.15)', color: '#B8962E' }}>
                  {daysLeft}d left
                </span>
              </div>
            ) : (
              <div className="text-xs text-gray-500">Attribution window has expired — lead can be reassigned freely.</div>
            )}
          </div>
        </div>
        {/* Director-only: Release Lock */}
        {role === 'director' && isLocked && (
          <button
            onClick={handleRelease}
            disabled={releasing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex-shrink-0"
            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
          >
            <HiLockOpen className="w-3.5 h-3.5" />
            {releasing ? 'Releasing…' : 'Release Lock'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function LeadDrawer({ lead, open, onClose, onAssign, updateStatus, addNote }) {
  const { addToast } = useToast();
  const { role, user } = useAuth();
  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [activities, setActivities] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [localLead, setLocalLead] = useState(lead);
  const [activeTab, setActiveTab] = useState('log');
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [isClosingLead, setIsClosingLead] = useState(false);

  const fetchLogs = async () => {
    if (!lead?.id) return;
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', lead.id)
        .eq('entity_type', 'lead')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('[LeadDrawer] Error fetching logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (open && lead?.id) {
      fetchLogs();
      setNoteText('');
      setLocalLead(lead);
    }
  }, [open, lead?.id]);

  // Sync localLead when lead prop changes
  useEffect(() => {
    setLocalLead(lead);
  }, [lead]);

  if (!lead) return null;

  const displayLead = localLead || lead;
  const isRealtor = role === 'realtor';

  const handleLockRelease = () => {
    setLocalLead(prev => prev ? { ...prev, lock_until: null } : null);
  };

  return (
    <Drawer open={open} onClose={onClose} title="Lead Profile & CRM" width="520px">
      <div className="flex flex-col h-full custom-scrollbar overflow-y-auto px-6 pt-2 pb-6">

        {/* 1. Profile Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Avatar
            initials={(displayLead.contact_name || '??').slice(0, 2).toUpperCase()}
            size="xl"
            color="gold"
            className="ring-4 ring-gold/10 mb-4 shadow-xl"
          />
          <h4 className="text-xl font-bold text-gray-900 tracking-tight">{displayLead.contact_name}</h4>
          <div className="flex items-center gap-2 mt-2">
            <Badge status={displayLead.status} />
            {displayLead.crm_sync_status === 'synced' && (
              displayLead.ghl_contact_id ? (
                <a
                  href={`https://app.gohighlevel.com/contacts/${displayLead.ghl_contact_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest hover:bg-blue-100 transition-colors"
                  title="Open in GoHighLevel"
                >
                  GHL SYNCED ↗
                </a>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest">
                  CRM SYNCED
                </span>
              )
            )}
          </div>
        </div>

        {/* 2. 180-Day Attribution Lock (Feature 3) */}
        <LockBadge lead={displayLead} onRelease={handleLockRelease} />

        {/* 3. Quick Contact (Protected — realtor only) */}
        {isRealtor && (
          <div className="mb-10">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-3">Quick Contact Gate</h5>
            <div className="flex gap-3">
              <ContactGate lead={displayLead} type="email" />
              <ContactGate lead={displayLead} type="phone" />
            </div>
          </div>
        )}

        {/* 4. Lead Context Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-10 pb-10 border-b border-gray-100/50">
          {[
            { icon: <HiCurrencyDollar />, label: 'Budget Range', value: displayLead.budget_min ? `$${displayLead.budget_min.toLocaleString()} - $${displayLead.budget_max?.toLocaleString() || '∞'}` : 'Not Specified' },
            { icon: <HiTag />, label: 'Interest Type', value: displayLead.interest_type || 'General' },
            { icon: <HiIdentification />, label: 'Source', value: displayLead.source || 'Website' },
            { icon: <HiCalendar />, label: 'Lead Since', value: new Date(displayLead.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <span className="text-gray-300">{item.icon}</span>
                {item.label}
              </div>
              <div className="text-sm font-semibold text-gray-700">{item.value}</div>
            </div>
          ))}
        </div>

        {/* 5. Inquiry Message */}
        {displayLead.notes && (
          <div className="mb-10">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-3">Inquiry Message</h5>
            <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 text-sm text-gray-600 leading-relaxed italic">
              "{displayLead.notes}"
            </div>
          </div>
        )}

        {/* 6. Activity Timeline */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">CRM Timeline</h5>
            <span className="text-[10px] text-gray-300 font-bold">{activities.length} Events</span>
          </div>

          <div className="space-y-6 relative crm-timeline pl-6">
            {isLoadingLogs ? (
              <div className="text-[11px] text-gray-400 animate-pulse uppercase tracking-widest">Hydrating timeline...</div>
            ) : activities.length > 0 ? (
              activities.map((a, i) => (
                <div key={a.id || i} className="relative group">
                  <div
                    className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10 transition-transform group-hover:scale-125"
                    style={{ background: a.action.includes('note') ? '#D4AF37' : a.action.includes('status') ? '#1F4D3A' : a.action.includes('lock') ? '#DC2626' : '#9CA3AF' }}
                  />
                  <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all group-hover:border-gold/20 group-hover:shadow-md">
                    <p className="text-xs text-gray-700 font-medium">
                      {a.action === 'lead.note_added' ? (
                        <span>{a.metadata?.note}</span>
                      ) : a.action === 'lead.status_changed' ? (
                        <span>Moved to <span className="text-gold font-bold uppercase">{a.metadata?.status}</span></span>
                      ) : (
                        <span className="capitalize">{a.action.replace('lead.', '').replace(/_/g, ' ')}</span>
                      )}
                    </p>
                    <div className="flex items-center justify-between mt-2 opacity-60">
                      <span className="text-[9px] font-bold uppercase text-gray-400">
                        {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(a.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                      {a.action.includes('note') && <HiChatBubbleLeftEllipsis className="w-3 h-3 text-gold" />}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                <HiChatBubbleLeftEllipsis className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                <p className="text-[11px] text-gray-300 font-bold uppercase tracking-widest">No activities yet</p>
              </div>
            )}
          </div>
        </div>

        {/* 7. CRM Actions — Log Entry / Send Message tabs */}
        <div className="mb-6">
          {/* Tab toggle */}
          <div className="flex gap-2 mb-3">
            {[{ id: 'log', label: 'Log Entry' }, { id: 'message', label: 'Platform Message' }].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: activeTab === t.id ? '#D4AF37' : '#F3F4F6',
                  color: activeTab === t.id ? '#fff' : '#6B7280',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'log' ? (
            <div className="p-4 rounded-3xl bg-ivory border border-[#E8E6E0] shadow-inner">
              <textarea
                rows={3}
                maxLength={500}
                className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-700 placeholder-gray-400 resize-none"
                placeholder="Add internal follow-up note..."
                value={noteText}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  if (noteError) setNoteError('');
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400">{noteText.length} / 500</span>
                {noteError && <span className="text-[11px] text-red-500 font-medium">{noteError}</span>}
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-full px-6 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-gold/20"
                  onClick={async () => {
                    if (!noteText.trim()) {
                      setNoteError('Note cannot be empty');
                      return;
                    }
                    if (noteText.trim().length < 5) {
                      setNoteError('Note must be at least 5 characters');
                      return;
                    }
                    setNoteError('');
                    setIsSubmittingNote(true);
                    const { error } = await addNote(lead.id, noteText);
                    setIsSubmittingNote(false);
                    if (!error) {
                      setNoteText('');
                      addToast({ type: 'success', title: 'Note logged successfully' });
                      fetchLogs();
                    } else {
                      addToast({ type: 'error', title: 'Failed to save note. Try again.' });
                    }
                  }}
                  isLoading={isSubmittingNote}
                  disabled={!noteText.trim()}
                >
                  Log Entry
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-blue-50 border border-blue-100 shadow-inner">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">
                Platform Message (contact info protected)
              </p>
              <textarea
                rows={3}
                maxLength={1000}
                className="w-full bg-white border border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 text-sm text-gray-700 placeholder-gray-400 resize-none p-3"
                placeholder="Type your message... (recipient contact info stays hidden)"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <div className="flex justify-end mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-full px-6 text-[11px] font-black uppercase tracking-widest"
                  onClick={async () => {
                    if (!messageText.trim() || messageText.trim().length < 10) {
                      addToast({ type: 'error', title: 'Message too short', desc: 'Minimum 10 characters required.' });
                      return;
                    }
                    setIsSendingMessage(true);
                    const { error } = await supabase.rpc('log_audit_event', {
                      p_user_id:     user?.id,
                      p_action:      'lead.message_sent',
                      p_entity_type: 'lead',
                      p_entity_id:   lead.id,
                      p_metadata:    { message: messageText.trim() },
                    });
                    setIsSendingMessage(false);
                    if (!error) {
                      setMessageText('');
                      addToast({ type: 'success', title: 'Message sent successfully' });
                      fetchLogs();
                    } else {
                      addToast({ type: 'error', title: 'Failed to send message', desc: error.message });
                    }
                  }}
                  isLoading={isSendingMessage}
                  disabled={!messageText.trim()}
                >
                  <HiPaperAirplane className="w-3 h-3 mr-1" /> Send Message
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Close Lead button — Bug 11 */}
        {normalizeStatus(displayLead.status) !== 'closed' && normalizeStatus(displayLead.status) !== 'lost' && (
          <div className="mb-6">
            {!closeConfirmOpen ? (
              <button
                onClick={() => setCloseConfirmOpen(true)}
                className="w-full py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 transition-all"
              >
                <HiXCircle className="inline w-4 h-4 mr-1" /> Close Lead
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                <p className="text-sm text-red-700 font-medium mb-3">Mark this lead as Closed? You can reopen it later.</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setCloseConfirmOpen(false)}>Cancel</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    style={{ background: '#DC2626' }}
                    isLoading={isClosingLead}
                    onClick={async () => {
                      setIsClosingLead(true);
                      const { error } = await updateStatus(lead.id, 'closed');
                      setIsClosingLead(false);
                      if (!error) {
                        setLocalLead(prev => prev ? { ...prev, status: 'converted' } : null);
                        setCloseConfirmOpen(false);
                        addToast({ type: 'success', title: 'Lead closed' });
                        fetchLogs();
                      } else {
                        addToast({ type: 'error', title: 'Failed to close lead', desc: error.message });
                      }
                    }}
                  >
                    Close Lead
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 8. Sticky Footer — Status + Close */}
        <div className="sticky-action-bar flex items-center justify-between gap-4 mt-auto">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <HiTag className="w-3 h-3 text-gold" />
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Change Status</span>
            </div>
            <select
              className="w-full h-10 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gold transition-all cursor-pointer appearance-none uppercase tracking-wide"
              value={normalizeStatus(displayLead.status)}
              disabled={isUpdatingStatus}
              onChange={async (e) => {
                const newStatus = e.target.value;
                setIsUpdatingStatus(true);
                const { error } = await updateStatus(lead.id, newStatus);
                setIsUpdatingStatus(false);
                if (!error) {
                  addToast({ type: 'success', title: 'STATUS SYNCED', desc: `Lead set to ${newStatus}` });
                  setLocalLead(prev => prev ? { ...prev, status: newStatus } : null);
                  fetchLogs();
                } else {
                  addToast({ type: 'error', title: 'UPDATE FAILED', desc: error.message || 'Could not update lead status.' });
                }
              }}
            >
              {[
                { value: 'new',         label: 'New' },
                { value: 'contacted',   label: 'Contacted' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'lost',        label: 'Closed' },
                { value: 'closed',      label: 'Closed' },
              ].map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-10 text-[11px] font-bold uppercase tracking-widest border border-gray-100">
            Close
          </Button>
        </div>

      </div>
    </Drawer>
  );
}
