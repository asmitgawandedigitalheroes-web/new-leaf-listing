import { useState, useEffect, useRef } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import {
  HiChatBubbleLeftRight,
  HiPaperAirplane,
  HiUser,
  HiMagnifyingGlass,
  HiInbox,
} from 'react-icons/hi2';

const P     = '#D4AF37';
const S     = '#1F4D3A';
const OS    = '#111111';
const OSV   = '#4B5563';
const LGRAY = '#6B7280';
const BORDER = '#E5E7EB';

function getInitials(name = '') {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (name.slice(0, 2).toUpperCase() || 'U');
}

export default function RealtorMessagesPage() {
  const { profile } = useAuth();
  const { addToast } = useToast();

  const [leads, setLeads]           = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [messages, setMessages]     = useState([]);
  const [newMsg, setNewMsg]         = useState('');
  const [sending, setSending]       = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingMsgs, setLoadingMsgs]  = useState(false);
  const [search, setSearch]         = useState('');
  const bottomRef = useRef(null);

  // Fetch leads assigned to this realtor
  useEffect(() => {
    if (!profile?.id) return;
    setLoadingLeads(true);
    supabase
      .from('leads')
      .select('id, name, email, status, created_at')
      .eq('realtor_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          addToast({ type: 'error', title: 'Failed to load leads', desc: error.message });
        } else {
          setLeads(data || []);
        }
        setLoadingLeads(false);
      });
  }, [profile?.id]);

  // Fetch messages for selected lead
  useEffect(() => {
    if (!selectedLead) { setMessages([]); return; }
    setLoadingMsgs(true);
    supabase
      .from('lead_messages')
      .select('id, sender_id, content, created_at')
      .eq('lead_id', selectedLead.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.warn('[RealtorMessages] lead_messages table may not exist:', error.message);
          setMessages([]);
        } else {
          setMessages(data || []);
        }
        setLoadingMsgs(false);
      });
  }, [selectedLead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedLead) return;
    setSending(true);
    const { data, error } = await supabase
      .from('lead_messages')
      .insert({
        lead_id:   selectedLead.id,
        sender_id: profile.id,
        content:   newMsg.trim(),
      })
      .select()
      .single();
    setSending(false);
    if (error) {
      addToast({ type: 'error', title: 'Send failed', desc: error.message });
    } else {
      setMessages(prev => [...prev, data]);
      setNewMsg('');
    }
  };

  const filteredLeads = leads.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s) => ({
    new:       { bg: '#DBEAFE', color: '#1D4ED8' },
    contacted: { bg: '#FEF9C3', color: '#854D0E' },
    converted: { bg: '#DCFCE7', color: '#166534' },
  }[s] ?? { bg: '#F3F4F6', color: '#374151' });

  return (
    <AppLayout role="realtor" title="Messages">
      <div className="flex h-[calc(100vh-64px)]" style={{ background: '#F9FAFB' }}>

        {/* ── Left: Lead list ── */}
        <div
          className="w-72 flex-shrink-0 flex flex-col"
          style={{ borderRight: `1px solid ${BORDER}`, background: '#fff' }}
        >
          {/* Search */}
          <div className="p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <h2 className="font-bold text-base mb-3" style={{ color: OS }}>Messages</h2>
            <div className="relative">
              <HiMagnifyingGlass size={15} color={LGRAY} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search leads…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ border: `1px solid ${BORDER}`, background: '#F9FAFB', color: OS }}
              />
            </div>
          </div>

          {/* Lead list */}
          <div className="flex-1 overflow-y-auto">
            {loadingLeads ? (
              <div className="p-4 text-center text-sm" style={{ color: LGRAY }}>Loading…</div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-6 flex flex-col items-center gap-2 text-center">
                <HiInbox size={32} color={LGRAY} />
                <p className="text-sm font-medium" style={{ color: OSV }}>No leads yet</p>
                <p className="text-xs" style={{ color: LGRAY }}>Leads from your listings will appear here.</p>
              </div>
            ) : filteredLeads.map(lead => {
              const isSelected = selectedLead?.id === lead.id;
              const sc = statusColor(lead.status);
              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                  style={{
                    background: isSelected ? `${S}08` : 'transparent',
                    borderLeft: isSelected ? `3px solid ${S}` : '3px solid transparent',
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                    style={{ background: `linear-gradient(135deg, ${P}, ${S})` }}
                  >
                    {getInitials(lead.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-sm font-semibold truncate" style={{ color: OS }}>{lead.name || 'Unknown'}</span>
                      <span
                        className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: LGRAY }}>{lead.email}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Conversation ── */}
        <div className="flex-1 flex flex-col">
          {!selectedLead ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: `${P}14` }}
              >
                <HiChatBubbleLeftRight size={28} color={P} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: OS }}>Select a lead to message</h3>
              <p className="text-sm max-w-xs" style={{ color: OSV }}>
                Choose a lead from the list on the left to view and send messages.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div
                className="flex items-center gap-4 px-6 py-4"
                style={{ borderBottom: `1px solid ${BORDER}`, background: '#fff' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${P}, ${S})` }}
                >
                  {getInitials(selectedLead.name)}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: OS }}>{selectedLead.name}</p>
                  <p className="text-xs" style={{ color: LGRAY }}>{selectedLead.email}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
                {loadingMsgs ? (
                  <div className="text-center text-sm" style={{ color: LGRAY }}>Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm mt-8" style={{ color: LGRAY }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : messages.map(msg => {
                  const isMine = msg.sender_id === profile?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className="max-w-xs px-4 py-2.5 rounded-2xl text-sm"
                        style={{
                          background: isMine ? S : '#F3F4F6',
                          color: isMine ? '#fff' : OS,
                          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        }}
                      >
                        <p>{msg.content}</p>
                        <p
                          className="text-[10px] mt-1"
                          style={{ color: isMine ? 'rgba(255,255,255,0.6)' : LGRAY }}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-3 px-6 py-4"
                style={{ borderTop: `1px solid ${BORDER}`, background: '#fff' }}
              >
                <input
                  type="text"
                  placeholder="Type a message…"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ border: `1px solid ${BORDER}`, background: '#F9FAFB', color: OS }}
                  onFocus={e => { e.currentTarget.style.borderColor = P; }}
                  onBlur={e => { e.currentTarget.style.borderColor = BORDER; }}
                />
                <button
                  type="submit"
                  disabled={sending || !newMsg.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: newMsg.trim() ? S : '#E5E7EB',
                    color: '#fff',
                    cursor: newMsg.trim() ? 'pointer' : 'default',
                  }}
                >
                  <HiPaperAirplane size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
