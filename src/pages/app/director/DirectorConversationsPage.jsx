import { useState, useEffect, useRef } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import Skeleton from '../../../components/ui/Skeleton';
import {
  HiChatBubbleLeftRight,
  HiMagnifyingGlass,
  HiInbox,
  HiShieldCheck,
  HiUserCircle,
  HiEyeSlash,
} from 'react-icons/hi2';

const P      = '#D4AF37';
const S      = '#1F4D3A';
const OS     = '#111111';
const OSV    = '#4B5563';
const LGRAY  = '#6B7280';
const BORDER = '#E5E7EB';

function getInitials(name = '') {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (name.slice(0, 2).toUpperCase() || 'U');
}

export default function DirectorConversationsPage() {
  const { profile } = useAuth();

  const [leads, setLeads]               = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [senderMap, setSenderMap]       = useState({}); // id → { full_name, role }
  const [search, setSearch]             = useState('');
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const bottomRef = useRef(null);

  // Fetch all leads visible to this director:
  // 1. Leads in their territory (by territory_id)
  // 2. Leads directly assigned to them (assigned_director_id)
  // 3. Leads assigned to ANY realtor who belongs to their territories
  useEffect(() => {
    if (!profile?.id) return;

    async function fetchTerritoryLeads() {
      setLoadingLeads(true);

      // Step 1: Get director's territory IDs
      const { data: territories } = await supabase
        .from('territories')
        .select('id')
        .eq('director_id', profile.id);

      const territoryIds = (territories || []).map(t => t.id);

      // Step 2: Get all realtor IDs whose territory belongs to this director
      let realtorIds = [];
      if (territoryIds.length > 0) {
        const { data: realtors } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'realtor')
          .in('territory_id', territoryIds);
        realtorIds = (realtors || []).map(r => r.id);
      }

      // Step 3: Build query covering all three scopes
      let query = supabase
        .from('leads')
        .select(`
          id, contact_name, contact_email, contact_masked_email, status, lead_type,
          created_at, assigned_realtor_id,
          assigned_realtor:profiles!leads_assigned_realtor_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      const orParts = [`assigned_director_id.eq.${profile.id}`];
      if (territoryIds.length > 0) orParts.push(`territory_id.in.(${territoryIds.join(',')})`);
      if (realtorIds.length > 0)   orParts.push(`assigned_realtor_id.in.(${realtorIds.join(',')})`);

      query = query.or(orParts.join(','));

      const { data } = await query;
      setLeads(data || []);
      setLoadingLeads(false);
    }

    fetchTerritoryLeads();
  }, [profile?.id]);

  // Fetch messages + sender profiles when a lead is selected
  useEffect(() => {
    if (!selectedLead) { setMessages([]); setSenderMap({}); return; }

    setLoadingMsgs(true);
    supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at')
      .eq('lead_id', selectedLead.id)
      .order('created_at', { ascending: true })
      .then(async ({ data: msgs }) => {
        const msgList = msgs || [];
        setMessages(msgList);

        // Collect unique sender IDs and resolve names + roles
        const senderIds = [...new Set(msgList.map(m => m.sender_id).filter(Boolean))];
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('id', senderIds);

          const map = {};
          (profiles || []).forEach(p => { map[p.id] = p; });
          setSenderMap(map);
        }

        setLoadingMsgs(false);
      });
  }, [selectedLead]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredLeads = leads.filter(l =>
    (l.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.contact_email || '').toLowerCase().includes(search.toLowerCase())
  );

  const leadsWithMessages = filteredLeads; // all leads in territory are shown; messages load on select

  const getSenderLabel = (senderId) => {
    const p = senderMap[senderId];
    if (!p) return 'Unknown';
    return p.role === 'realtor'
      ? `${p.full_name} (Realtor)`
      : p.role === 'director'
      ? `${p.full_name} (Director)`
      : p.full_name;
  };

  const getSenderColor = (senderId) => {
    const p = senderMap[senderId];
    if (!p) return LGRAY;
    return p.role === 'realtor' ? S : P;
  };

  return (
    <AppLayout role="director" title="Conversation Monitor">
      <div className="p-4 md:p-6 max-w-6xl mx-auto h-[calc(100vh-80px)]">

        {/* Read-only warning banner */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 text-sm font-medium"
          style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', color: '#92400E' }}
        >
          <HiShieldCheck size={18} style={{ color: P, flexShrink: 0 }} />
          <span>
            <strong>Director Oversight Mode</strong> — Read-only view of realtor–client conversations in your territory.
            Realtors cannot see that you are monitoring.
          </span>
          <HiEyeSlash size={16} style={{ marginLeft: 'auto', flexShrink: 0, color: P }} />
        </div>

        <div className="flex bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100" style={{ height: 'calc(100% - 60px)' }}>

          {/* ── Left: Lead list ── */}
          <div
            className="w-72 flex-shrink-0 flex flex-col"
            style={{ borderRight: `1px solid ${BORDER}`, background: '#fff' }}
          >
            <div className="p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <h2 className="font-bold text-base mb-3" style={{ color: OS }}>Territory Leads</h2>
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

            <div className="flex-1 overflow-y-auto">
              {loadingLeads ? (
                <div className="p-4 flex flex-col gap-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-2">
                      <Skeleton variant="circle" width="36px" height="36px" />
                      <div className="flex-1">
                        <Skeleton width="70%" height="12px" className="mb-1.5" />
                        <Skeleton width="50%" height="10px" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : leadsWithMessages.length === 0 ? (
                <div className="p-6 flex flex-col items-center gap-2 text-center">
                  <HiInbox size={32} color={LGRAY} />
                  <p className="text-sm font-medium" style={{ color: OSV }}>No leads found</p>
                  <p className="text-xs" style={{ color: LGRAY }}>Leads in your territory will appear here.</p>
                </div>
              ) : leadsWithMessages.map(lead => {
                const isSelected = selectedLead?.id === lead.id;
                const lt = lead.lead_type || 'buyer';
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
                      {getInitials(lead.contact_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-sm font-semibold truncate" style={{ color: OS }}>
                          {lead.contact_name || 'Unknown'}
                        </span>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={
                            lt === 'realtor'
                              ? { background: '#EDE9FE', color: '#5B21B6' }
                              : { background: '#E8F3EE', color: '#1F4D3A' }
                          }
                        >
                          {lt === 'realtor' ? 'Realtor' : 'Buyer'}
                        </span>
                      </div>
                      <p className="text-xs truncate" style={{ color: LGRAY }}>
                        {lead.assigned_realtor?.full_name
                          ? `Realtor: ${lead.assigned_realtor.full_name}`
                          : 'Unassigned'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: Conversation view (read-only) ── */}
          <div className="flex-1 flex flex-col">
            {!selectedLead ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: `${P}14` }}
                >
                  <HiChatBubbleLeftRight size={28} color={P} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: OS }}>Select a lead to monitor</h3>
                <p className="text-sm max-w-xs" style={{ color: OSV }}>
                  Choose a lead from the list to view the full realtor–client conversation.
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div
                  className="flex items-center justify-between px-6 py-4"
                  style={{ borderBottom: `1px solid ${BORDER}`, background: '#fff' }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${P}, ${S})` }}
                    >
                      {getInitials(selectedLead.contact_name)}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: OS }}>{selectedLead.contact_name}</p>
                      <p className="text-xs" style={{ color: LGRAY }}>
                        {selectedLead.contact_masked_email || selectedLead.contact_email}
                        {selectedLead.assigned_realtor?.full_name && (
                          <span style={{ color: S }}> · Realtor: {selectedLead.assigned_realtor.full_name}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(212,175,55,0.1)', color: '#92400E' }}
                  >
                    <HiShieldCheck size={14} />
                    Monitoring
                  </div>
                </div>

                {/* Messages — read-only */}
                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
                  {loadingMsgs ? (
                    <div className="flex flex-col gap-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                          <div className="flex flex-col gap-1" style={{ maxWidth: '60%' }}>
                            <Skeleton width="80px" height="10px" />
                            <Skeleton width="200px" height="40px" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-sm mt-8" style={{ color: LGRAY }}>
                      No messages in this conversation yet.
                    </div>
                  ) : messages.map(msg => {
                    const senderInfo = senderMap[msg.sender_id];
                    const isRealtor = senderInfo?.role === 'realtor';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col gap-1 ${isRealtor ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender label */}
                        <span className="text-[10px] font-semibold px-1" style={{ color: getSenderColor(msg.sender_id) }}>
                          {getSenderLabel(msg.sender_id)}
                        </span>
                        <div
                          className="max-w-sm px-4 py-2.5 text-sm"
                          style={{
                            background: isRealtor ? S : '#F3F4F6',
                            color: isRealtor ? '#fff' : OS,
                            borderRadius: isRealtor ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          }}
                        >
                          <p>{msg.content}</p>
                          <p
                            className="text-[10px] mt-1"
                            style={{ color: isRealtor ? 'rgba(255,255,255,0.55)' : LGRAY }}
                          >
                            {new Date(msg.created_at).toLocaleString([], {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Read-only footer — no input */}
                <div
                  className="flex items-center gap-3 px-6 py-4"
                  style={{ borderTop: `1px solid ${BORDER}`, background: '#F9FAFB' }}
                >
                  <HiEyeSlash size={16} color={LGRAY} />
                  <p className="text-xs" style={{ color: LGRAY }}>
                    You are viewing this conversation in read-only mode. Realtors are not notified.
                  </p>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
