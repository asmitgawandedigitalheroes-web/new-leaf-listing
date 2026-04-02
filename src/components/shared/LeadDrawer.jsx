import Drawer from '../ui/Drawer';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useState } from 'react';

/** Mask an email to protect lead privacy for realtors: j***@domain.com */
function maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return '•••••••';
  return `${local[0]}${'•'.repeat(Math.min(local.length - 1, 4))}@${domain}`;
}

/** Mask a phone number: (•••) •••-4567 */
function maskPhone(phone) {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '•••••••';
  return `(•••) •••-${digits.slice(-4)}`;
}

/** Contact request button — logs a contact attempt without exposing raw info */
function ContactGate({ lead, type }) {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [sent, setSent] = useState(false);

  const handleRequest = async () => {
    setSent(true);
    // Write to audit log so admin can see the contact request
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      action: 'lead.contact_requested',
      entity_type: 'lead',
      entity_id: lead.id,
      timestamp: new Date().toISOString(),
      metadata: { contact_type: type, lead_name: lead.contact_name },
    });
    addToast({
      type: 'success',
      title: 'Contact request sent',
      desc: `Your ${type} request for ${lead.contact_name} has been logged. The platform will facilitate contact.`,
    });
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', background: 'rgba(212,175,55,0.06)',
      border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, gap: 8,
    }}>
      <div>
        <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
          {type === 'email' ? 'Email' : 'Phone'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', fontFamily: 'monospace' }}>
          {type === 'email' ? maskEmail(lead.contact_email) : maskPhone(lead.contact_phone)}
        </div>
      </div>
      <button
        onClick={handleRequest}
        disabled={sent}
        style={{
          padding: '5px 12px', borderRadius: 6, border: 'none', cursor: sent ? 'default' : 'pointer',
          background: sent ? '#E8F3EE' : '#D4AF37', color: sent ? '#1F4D3A' : '#fff',
          fontSize: 11, fontWeight: 600, flexShrink: 0,
          opacity: sent ? 0.8 : 1,
        }}
      >
        {sent ? '✓ Requested' : 'Contact via Platform'}
      </button>
    </div>
  );
}

export default function LeadDrawer({ lead, open, onClose, onAssign }) {
  const { addToast } = useToast();
  const { role } = useAuth();

  if (!lead) return null;

  // Realtors cannot see raw contact info — shown masked with platform contact gate
  const isRealtor = role === 'realtor';

  const handleAssign = () => {
    onAssign?.(lead.id);
    addToast({ type: 'success', title: 'Lead assigned', desc: `${lead.contact_name} assigned successfully.` });
    onClose();
  };

  const handleContact = () => {
    addToast({ type: 'success', title: 'Contact logged', desc: `Follow-up recorded for ${lead.contact_name}.` });
  };

  return (
    <Drawer open={open} onClose={onClose} title="Lead Details" width="480px">
      {/* Profile */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
        <Avatar initials={lead.initials || (lead.contact_name || '??').slice(0, 2).toUpperCase()} size="lg" color="green" />
        <div>
          <h4 className="font-semibold text-gray-900 text-base">{lead.contact_name}</h4>
          {/* Email — masked for realtors */}
          {isRealtor ? (
            <p className="text-sm text-gray-400 font-mono">{maskEmail(lead.contact_email)}</p>
          ) : (
            <p className="text-sm text-gray-500">{lead.contact_email || '—'}</p>
          )}
          <div className="mt-1.5 flex gap-2">
            <Badge status={lead.status} />
            {lead.crm_sync_status === 'synced' ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 uppercase tracking-tighter">
                CRM Synced
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-400 border border-gray-100 uppercase tracking-tighter">
                CRM Pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact gating for realtors */}
      {isRealtor && (lead.contact_email || lead.contact_phone) && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Contact — Platform Protected
          </div>
          {lead.contact_email && <ContactGate lead={lead} type="email" />}
          {lead.contact_phone && <ContactGate lead={lead} type="phone" />}
          <p style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.4, marginTop: 4 }}>
            Lead contact details are protected per platform rules. All contact is facilitated through NLV Listings to maintain the 180-day attribution period.
          </p>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Phone',    value: isRealtor ? maskPhone(lead.contact_phone) : (lead.contact_phone || '—') },
          { label: 'Source',   value: lead.source || '—' },
          { label: 'Score',    value: lead.score ? `${lead.score}/100` : '—' },
          { label: 'Budget',   value: lead.budget_min ? `$${lead.budget_min.toLocaleString()}${lead.budget_max ? ' - $' + lead.budget_max.toLocaleString() : '+'}` : '—' },
          { label: 'Interest', value: lead.interest_type || '—' },
          { label: 'Created',  value: lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (lead.createdAt || '—') },
        ].map(item => (
          <div key={item.label}>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">{item.label}</div>
            <div className="text-sm font-medium text-gray-800">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Listing attribution */}
      {lead.listing && (
        <div className="mb-6">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Attributed Listing</div>
          <div style={{
            padding: '10px 14px', background: '#F9FAFB', borderRadius: 8,
            border: '1px solid #E5E7EB', fontSize: 13, color: '#374151',
          }}>
            🏠 {lead.listing.title || lead.listing.address || 'Listing'}
            {lead.listing.city && <span style={{ color: '#9CA3AF' }}> · {lead.listing.city}</span>}
          </div>
        </div>
      )}

      {/* Notes */}
      {lead.notes && (
        <div className="mb-6">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Notes</div>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{lead.notes}</p>
        </div>
      )}

      {/* Activity timeline */}
      <div className="mb-8">
        <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-3">Activity</div>
        <div className="space-y-3">
          {(lead.activity || [
            { text: 'Lead created', time: lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'Recently' },
          ]).map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#D4AF37' }} />
              <div>
                <p className="text-sm text-gray-700">{a.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-100 mt-auto">
        {!isRealtor && onAssign && (
          <Button variant="primary" onClick={handleAssign} className="flex-1">
            Assign Lead
          </Button>
        )}
        <Button variant="outline" onClick={handleContact} className="flex-1">
          Log Contact
        </Button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Drawer>
  );
}
