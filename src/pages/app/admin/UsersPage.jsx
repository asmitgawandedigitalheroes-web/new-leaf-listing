import { useState, useMemo, useCallback, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { useToast } from '../../../context/ToastContext';
import {
  HiMagnifyingGlass,
  HiUsers,
  HiCheckBadge,
  HiClock,
  HiNoSymbol,
  HiTrash,
  HiPencil,
  HiChevronDown,
  HiXMark,
  HiCheck,
  HiExclamationTriangle,
  HiMapPin,
  HiArrowPath,
  HiEye,
  HiSparkles,
} from 'react-icons/hi2';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import { useUsers } from '../../../hooks/useUsers';

// ── Color constants ───────────────────────────────────────────────────────────
const P     = '#D4AF37';
const S     = '#1F4D3A';
const OS    = '#111111';
const OSV   = '#4B5563';
const LGRAY = '#6B7280';
const BORDER = '#E5E7EB';

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    active:    { bg: '#DCFCE7', color: '#166534', label: 'Active' },
    pending:   { bg: '#FEF9C3', color: '#854D0E', label: 'Pending' },
    suspended: { bg: '#FEE2E2', color: '#991B1B', label: 'Suspended' },
  }[status] ?? { bg: '#F3F4F6', color: '#374151', label: status };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const cfg = {
    admin:    { bg: '#EDE9FE', color: '#5B21B6', label: 'Admin' },
    director: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Director' },
    realtor:  { bg: '#F3F4F6', color: '#374151', label: 'Realtor' },
  }[role] ?? { bg: '#F3F4F6', color: '#374151', label: role };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ initials, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${P}, ${S})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── Clickable KPI Card ────────────────────────────────────────────────────────
function KPICard({ label, value, icon, accent, onClick, active }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={onClick ? `Filter by: ${label}` : undefined}
      style={{
        background: active ? '#fff' : '#fff',
        border: active ? `2px solid ${accent}` : '1px solid transparent',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: active 
          ? `0 10px 25px -5px ${accent}33, 0 8px 10px -6px ${accent}22` 
          : isHovered 
            ? '0 10px 20px -5px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.05)'
            : '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.02)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 120,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Decorative accent blob */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        background: `${accent}08`, borderRadius: '50%', pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${accent}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          color: accent,
          border: `1px solid ${accent}15`,
        }}>
          {icon}
        </div>
        {active && (
          <div style={{ 
            background: `${accent}22`, color: accent, padding: '4px 8px', 
            borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase'
          }}>
            Active Filter
          </div>
        )}
      </div>

      <div>
        <p style={{ fontSize: 28, fontWeight: 900, color: OS, lineHeight: 1, marginBottom: 4 }}>{value}</p>
        <p style={{ fontSize: 13, color: LGRAY, fontWeight: 600, letterSpacing: '0.01em' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, onConfirm, onCancel, danger = false }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <HiExclamationTriangle size={22} color={danger ? '#DC2626' : P} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: OS }}>{title}</h3>
        </div>
        <p style={{ fontSize: 13, color: OSV, marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: OSV, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: danger ? '#DC2626' : P, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Manage User Modal (Unified) ────────────────────────────────────────────────
function ManageUserModal({
  open,
  user,
  territories,
  onClose,
  onUpdateRole,
  onUpdateTerritory,
  onUpdateSubscription,
  onStatusChange,
  onDelete,
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!open || !user) return null;

  const handleStatusToggle = () => {
    onStatusChange(user.id, user.status === 'active' ? 'suspended' : 'active');
  };

  const handleApprove = () => {
    onStatusChange(user.id, 'active');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: 480, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        
        {/* Header Profile Section */}
        <div style={{ background: `linear-gradient(135deg, ${P}EE, ${S}EE)`, padding: '36px 32px', color: '#fff', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><HiXMark size={20} /></button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Avatar initials={user.initials} size={72} />
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{user.name}</h2>
              <p style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>{user.email}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <StatusBadge status={user.status} />
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
        </div>

        {/* Action Tabs - Redesigned for professionalism */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, padding: '0 12px' }}>
          {[
            { id: 'profile', label: 'Overview' },
            { id: 'subscription', label: 'Subscription' },
            { id: 'danger', label: 'Safety' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setConfirmDelete(false); }}
              style={{
                flex: 1, padding: '16px 8px', fontSize: 13, fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer',
                color: activeTab === tab.id ? S : LGRAY,
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 3, background: S, borderRadius: '3px 3px 0 0' }} />
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: 32, maxHeight: 440, minHeight: 340, overflowY: 'auto' }}>
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Account Status Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: LGRAY, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Account Status</label>
                {user.status === 'pending' ? (
                  <button onClick={handleApprove} style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#22C55E12', color: '#065F46', border: '1px solid #22C55E33', fontWeight: 800, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <HiCheckBadge size={20} /> Activate Account
                  </button>
                ) : (
                  <button onClick={handleStatusToggle} style={{ 
                    width: '100%', padding: '12px', borderRadius: 12, 
                    background: user.status === 'active' ? '#EF444408' : '#22C55E08', 
                    color: user.status === 'active' ? '#991B1B' : '#065F46', 
                    border: `1px solid ${user.status === 'active' ? '#EF444433' : '#22C55E33'}`, 
                    fontWeight: 800, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 
                  }}>
                    {user.status === 'active' ? <HiNoSymbol size={20} /> : <HiCheckBadge size={20} />}
                    {user.status === 'active' ? 'Suspend Access' : 'Restore Access'}
                  </button>
                )}
              </div>

              {/* Role Management */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: LGRAY, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Assign Platform Role</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['admin', 'director', 'realtor'].map(r => (
                    <button key={r} onClick={() => onUpdateRole(user.id, r)} style={{
                      flex: 1, padding: '10px 4px', borderRadius: 10, border: user.role === r ? `2px solid ${targetColor(r)}` : `1px solid ${BORDER}`,
                      background: user.role === r ? `${targetColor(r)}08` : '#fff', fontSize: 12, fontWeight: 700, color: user.role === r ? targetColor(r) : OSV,
                      cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s'
                    }}>{r}</button>
                  ))}
                </div>
              </div>

              {/* Territory Assignment */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: LGRAY, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Territory Assignment</label>
                <select value={user.territory_id ?? ''} onChange={(e) => onUpdateTerritory(user.id, e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#F9FAFB', fontSize: 13, color: OS, outline: 'none', cursor: 'pointer' }}>
                  <option value="">— Unassigned —</option>
                  {territories.map(t => (
                    <option key={t.id} value={t.id}>{[t.city, t.state].filter(Boolean).join(', ')}</option>
                  ))}
                </select>
              </div>

            </div>
          )}

          {activeTab === 'subscription' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '16px', background: `${S}08`, borderRadius: 12, border: `1px solid ${S}15`, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: S, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <HiSparkles size={20} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: LGRAY, textTransform: 'uppercase' }}>Current Plan</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: OS, textTransform: 'capitalize' }}>{user.plan || 'Free'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {['starter', 'pro', 'dominator', 'sponsor'].map(pl => (
                  <button
                    key={pl}
                    onClick={() => onUpdateSubscription(user.id, pl)}
                    style={{
                      padding: '16px 12px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                      border: user.plan === pl ? `2.5px solid ${S}` : `1px solid ${BORDER}`,
                      background: user.plan === pl ? '#fff' : '#fff',
                      transition: 'all 0.2s', position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: OS, textTransform: 'capitalize' }}>{pl}</span>
                      {user.plan === pl && <HiCheckBadge size={18} color={S} />}
                    </div>
                    <p style={{ fontSize: 11, color: LGRAY }}>{pl === 'sponsor' ? 'Enterprise Access' : `Standard ${pl} Tier`}</p>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: LGRAY, textAlign: 'center', marginTop: 8 }}>Changing the plan will update the user's platform access immediately.</p>
            </div>
          )}

          {activeTab === 'danger' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {!confirmDelete ? (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <HiTrash size={24} color="#991B1B" />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: OS, marginBottom: 8 }}>Permanent Deletion</h3>
                  <p style={{ fontSize: 13, color: LGRAY, marginBottom: 24, lineHeight: 1.5 }}>Deleting this user will permanently remove their profile and all associated platform data.</p>
                  <button 
                    disabled={user.role === 'admin'}
                    onClick={() => setConfirmDelete(true)} 
                    style={{ width: '100%', padding: '12px', borderRadius: 10, background: user.role === 'admin' ? '#F3F4F6' : '#991B1B', color: user.role === 'admin' ? '#9CA3AF' : '#fff', border: 'none', fontWeight: 700, cursor: user.role === 'admin' ? 'not-allowed' : 'pointer' }}>
                    {user.role === 'admin' ? 'Admin Accounts Locked' : 'Delete Account'}
                  </button>
                  {user.role === 'admin' && <p style={{ fontSize: 11, color: LGRAY, marginTop: 10 }}>Admin accounts cannot be deleted for security reasons.</p>}
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#991B1B', marginBottom: 12 }}>Are you absolutely sure?</h3>
                  <p style={{ fontSize: 13, color: OSV, marginBottom: 24 }}>This action is final. Type <strong>confirm</strong> to delete {user.name}.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => { onDelete(user.id); onClose(); }} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#991B1B', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Final Confirm</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function targetColor(role) {
  return role === 'admin' ? '#5B21B6' : role === 'director' ? '#1D4ED8' : '#4B5563';
}

// ── Add User Modal ────────────────────────────────────────────────────────────
const PLANS = ['starter', 'pro', 'dominator', 'sponsor'];

function AddUserModal({ open, territories, onConfirm, onCancel, isSubmitting }) {
  const empty = { name: '', email: '', role: 'realtor', territory_id: '', plan: 'starter' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = 'Invalid email';
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onConfirm({ ...form });
  };

  const cancel = () => { setForm(empty); setErrors({}); onCancel(); };
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: OS, margin: 0 }}>Add New User</h3>
            <p style={{ fontSize: 12, color: LGRAY, marginTop: 2 }}>Create a new platform account</p>
          </div>
          <button onClick={cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><HiXMark size={20} color={LGRAY} /></button>
        </div>

        {[{ key: 'name', label: 'Full Name', placeholder: 'e.g. Jane Doe', type: 'text' },
          { key: 'email', label: 'Email Address', placeholder: 'e.g. jane@example.com', type: 'email' }]
          .map(({ key, label, placeholder, type }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: OSV, marginBottom: 5 }}>{label}</label>
              <input type={type} placeholder={placeholder} value={form[key]} onChange={e => set(key, e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[key] ? '#EF4444' : BORDER}`, borderRadius: 8, fontSize: 13, color: OS, outline: 'none', boxSizing: 'border-box', background: errors[key] ? '#FFF5F5' : '#F9FAFB' }} />
              {errors[key] && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors[key]}</p>}
            </div>
          ))}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: OSV, marginBottom: 8 }}>Role</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['realtor', 'director', 'admin'].map(r => (
              <button key={r} onClick={() => set('role', r)} style={{
                flex: 1, padding: '9px 6px', borderRadius: 8,
                border: form.role === r ? `1.5px solid ${P}` : `1.5px solid ${BORDER}`,
                background: form.role === r ? '#FFFBEB' : '#fff', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: form.role === r ? '#92400E' : OSV,
                textTransform: 'capitalize', transition: 'all 0.15s',
              }}>{r}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: OSV, marginBottom: 5 }}>
            Territory <span style={{ color: LGRAY, fontWeight: 400 }}>(optional)</span>
          </label>
          <select value={form.territory_id} onChange={e => set('territory_id', e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: OS, background: '#F9FAFB', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
            <option value=''>— None —</option>
            {territories.map(t => (
              <option key={t.id} value={t.id}>{[t.city, t.state].filter(Boolean).join(', ')}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: OSV, marginBottom: 8 }}>Subscription Plan</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PLANS.map(pl => (
              <button key={pl} onClick={() => set('plan', pl)} style={{
                flex: 1, padding: '9px 6px', borderRadius: 8,
                border: form.plan === pl ? `1.5px solid ${S}` : `1.5px solid ${BORDER}`,
                background: form.plan === pl ? '#F0FDF4' : '#fff', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: form.plan === pl ? S : OSV,
                textTransform: 'capitalize', transition: 'all 0.15s',
              }}>{pl}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={cancel} disabled={isSubmitting}
            style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: OSV, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={isSubmitting}
            style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${P}, #B8962E)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            {isSubmitting && <HiArrowPath size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {isSubmitting ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { addToast } = useToast();
  const { users, territories, isLoading, updateUser, deleteUser: apiDeleteUser, createUser, changeUserPlan, refresh } = useUsers();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState(new Set());

  const [manageModal, setManageModal] = useState({ open: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep the open modal's user data in sync with the live users array
  useEffect(() => {
    if (manageModal.open && manageModal.user) {
      const fresh = users.find(u => u.id === manageModal.user.id);
      if (fresh) setManageModal(prev => ({ ...prev, user: fresh }));
    }
  }, [users]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered users ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search ||
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase());
      const matchRole   = filterRole === 'all' || u.role === filterRole;
      const matchStatus = filterStatus === 'all' || u.status === filterStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, filterRole, filterStatus]);

  const pending = users.filter(u => u.status === 'pending');

  // ── KPIs ──────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Total Users',      statusKey: 'all',       value: users.length,                                        icon: <HiUsers size={24} />,     accent: '#6366F1' },
    { label: 'Active Status',    statusKey: 'active',    value: users.filter(u => u.status === 'active').length,    icon: <HiCheckBadge size={24} />, accent: '#10B981' },
    { label: 'Awaiting Action',  statusKey: 'pending',   value: users.filter(u => u.status === 'pending').length,   icon: <HiClock size={24} />,      accent: '#F59E0B' },
    { label: 'Restricted',       statusKey: 'suspended', value: users.filter(u => u.status === 'suspended').length, icon: <HiNoSymbol size={24} />,   accent: '#EF4444' },
  ];

  const handleKpiClick = (statusKey) => {
    setFilterStatus(prev => prev === statusKey ? 'all' : statusKey);
  };

  // ── Helper: is locally-created? ───────────────────────────────────
  const isLocal = (id) => String(id).startsWith('local-');

  // ── Mutations ─────────────────────────────────────────────────────
  const approveUser = async (id) => {
    if (isLocal(id)) return;
    const { error } = await updateUser(id, { status: 'active' });
    addToast(error
      ? { type: 'error', title: 'Approve failed', desc: error.message }
      : { type: 'success', title: 'User approved', desc: 'Account is now active.' });
  };

  const handleStatusChange = async (id, status) => {
    if (isLocal(id)) return;
    const { error } = await updateUser(id, { status });
    const actionLabel = status === 'active' ? 'activated' : 'suspended';
    addToast(error
      ? { type: 'error', title: 'Update failed', desc: error.message }
      : { type: 'success', title: `User ${actionLabel}`, desc: `Account is now ${status}.` });
  };

  const reactivateUser = async (id) => {
    if (isLocal(id)) return;
    const { error } = await updateUser(id, { status: 'active' });
    addToast(error
      ? { type: 'error', title: 'Reactivate failed', desc: error.message }
      : { type: 'success', title: 'User reactivated', desc: 'Account is now active.' });
  };

  const deleteUser = async (id) => {
    if (isLocal(id)) return;
    const { error } = await apiDeleteUser(id);
    if (!error) {
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      addToast({ type: 'success', title: 'User deleted', desc: 'User removed.' });
    } else {
      addToast({ type: 'error', title: 'Delete failed', desc: error.message });
    }
  };

  const changeRole = async (id, newRole) => {
    if (isLocal(id)) return;
    const { error } = await updateUser(id, { role: newRole });
    addToast(error
      ? { type: 'error', title: 'Update failed', desc: error.message }
      : { type: 'success', title: 'Role updated', desc: `Role changed to ${newRole}.` });
  };

  const changeSubscription = async (id, newPlan) => {
    if (isLocal(id)) return;
    const { error } = await changeUserPlan(id, newPlan);
    addToast(error
      ? { type: 'error', title: 'Update failed', desc: error.message }
      : { type: 'success', title: 'Plan updated', desc: `Subscription changed to ${newPlan}.` });
  };

  const assignTerritory = async (id, territory_id) => {
    if (isLocal(id)) return;
    const { error } = await updateUser(id, { territory_id: territory_id || null });
    addToast(error
      ? { type: 'error', title: 'Update failed', desc: error.message }
      : { type: 'success', title: 'Territory assigned' });
  };

  const approveAll = async () => {
    const pendingIds = pending.filter(u => !isLocal(u.id)).map(u => u.id);
    await Promise.all(pendingIds.map(id => updateUser(id, { status: 'active' })));
    addToast({ type: 'success', title: 'All pending users approved', desc: `${pendingIds.length} accounts activated.` });
    await refresh();
  };

  // ── Bulk actions ──────────────────────────────────────────────────
  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(u => u.id)));
  };
  const bulkApprove = async () => {
    const ids = [...selected].filter(id => !isLocal(id));
    await Promise.all(ids.map(id => updateUser(id, { status: 'active' })));
    addToast({ type: 'success', title: 'Bulk approve done', desc: `${ids.length} users activated.` });
    setSelected(new Set());
    await refresh();
  };
  const bulkSuspend = async () => {
    const ids = [...selected].filter(id => !isLocal(id));
    await Promise.all(ids.map(id => updateUser(id, { status: 'suspended' })));
    addToast({ type: 'success', title: 'Bulk suspend done', desc: `${ids.length} users suspended.` });
    setSelected(new Set());
    await refresh();
  };

  // ── Add User ──────────────────────────────────────────────────────
  const handleAddUser = useCallback(async (formData) => {
    setIsSubmitting(true);
    const { data, error } = await createUser({
      email: formData.email.trim(),
      full_name: formData.name.trim(),
      role: formData.role,
      territory_id: formData.territory_id || null,
      plan: formData.plan,
    });
    setIsSubmitting(false);
    if (error) {
      addToast({ type: 'error', title: 'Create failed', desc: error.message });
    } else {
      setAddUserOpen(false);
      addToast({ type: 'success', title: 'User created', desc: `${data?.full_name || 'User'} added (pending approval).` });
    }
  }, [createUser, addToast]);

  return (
    <AppLayout role="admin">
      <div style={{ padding: '28px 32px', minHeight: '100vh', background: '#F9FAFB' }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: OS, marginBottom: 4 }}>User Management</h1>
            <p style={{ fontSize: 13, color: LGRAY }}>Manage platform users, roles, and access.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={refresh} title="Refresh" style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <HiArrowPath size={16} color={LGRAY} />
            </button>
            <Button variant="primary" onClick={() => setAddUserOpen(true)}>+ Add User</Button>
          </div>
        </div>

        {/* KPI Cards — Premium Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ marginBottom: 32 }}>
          {kpis.map(k => (
            <KPICard key={k.label} {...k} active={filterStatus === k.statusKey} onClick={() => handleKpiClick(k.statusKey)} />
          ))}
        </div>

        {/* Pending Banner */}
        {pending.length > 0 && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HiClock size={18} color="#D97706" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>
                {pending.length} user{pending.length > 1 ? 's' : ''} pending approval
              </span>
              <span style={{ fontSize: 12, color: '#B45309' }}>— {pending.map(u => u.name).join(', ')}</span>
            </div>
            <button onClick={approveAll} style={{ padding: '7px 14px', borderRadius: 8, background: '#D97706', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HiCheck size={14} color="#fff" /> Approve All
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <HiMagnifyingGlass size={15} color={LGRAY} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: OS, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              style={{ padding: '8px 32px 8px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: OS, background: '#F9FAFB', appearance: 'none', cursor: 'pointer', outline: 'none' }}>
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="director">Director</option>
              <option value="realtor">Realtor</option>
            </select>
            <HiChevronDown size={14} color={LGRAY} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '8px 32px 8px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: OS, background: '#F9FAFB', appearance: 'none', cursor: 'pointer', outline: 'none' }}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            <HiChevronDown size={14} color={LGRAY} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
          {selected.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: LGRAY }}>{selected.size} selected</span>
              <button onClick={bulkApprove} style={{ padding: '7px 12px', borderRadius: 8, background: '#22C55E', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Bulk Approve</button>
              <button onClick={bulkSuspend} style={{ padding: '7px 12px', borderRadius: 8, background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Bulk Suspend</button>
            </div>
          )}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ padding: '11px 14px', textAlign: 'left', width: 40 }}>
                    <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                  </th>
                  {['User', 'Email', 'Role', 'Territory', 'Status', 'Plan', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LGRAY, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td style={{ padding: '12px 14px' }}><Skeleton width="16px" height="16px" /></td>
                      <td style={{ padding: '12px 14px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Skeleton variant="circle" width="32px" height="32px" /><Skeleton width="100px" height="12px" /></div></td>
                      <td style={{ padding: '12px 14px' }}><Skeleton width="140px" height="12px" /></td>
                      <td style={{ padding: '12px 14px' }}><Skeleton width="60px" height="20px" /></td>
                      <td style={{ padding: '12px 14px' }}><Skeleton width="100px" height="12px" /></td>
                      <td style={{ padding: '12px 14px' }}><Skeleton width="60px" height="20px" /></td>
                      <td style={{ padding: '12px 14px' }}><Skeleton width="80px" height="12px" /></td>
                      <td style={{ padding: '12px 14px' }}><Skeleton width="90px" height="12px" /></td>
                      <td style={{ padding: '12px 14px' }}><div style={{ display: 'flex', gap: 6 }}><Skeleton width="50px" height="24px" /><Skeleton width="50px" height="24px" /></div></td>
                    </tr>
                  ))
                ) : filtered.map((user, idx) => (
                  <tr key={user.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? `1px solid ${BORDER}` : 'none', background: selected.has(user.id) ? '#FFFBEB' : '#fff', transition: 'background 0.15s' }}
                    onMouseEnter={e => { if (!selected.has(user.id)) e.currentTarget.style.background = '#F9FAFB'; }}
                    onMouseLeave={e => { if (!selected.has(user.id)) e.currentTarget.style.background = '#fff'; }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <input type="checkbox" checked={selected.has(user.id)} onChange={() => toggleSelect(user.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar initials={user.initials} />
                        <span style={{ fontWeight: 600, color: OS, whiteSpace: 'nowrap' }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: OSV, whiteSpace: 'nowrap' }}>{user.email}</td>
                    <td style={{ padding: '12px 14px' }}><RoleBadge role={user.role} /></td>
                    <td style={{ padding: '12px 14px', color: user.territory ? OSV : LGRAY, fontStyle: user.territory ? 'normal' : 'italic', whiteSpace: 'nowrap' }}>{user.territory ?? 'Unassigned'}</td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={user.status} /></td>
                    <td style={{ padding: '12px 14px', color: user.plan ? OSV : LGRAY, fontStyle: user.plan ? 'normal' : 'italic', textTransform: 'capitalize' }}>{user.plan ?? '—'}</td>
                    <td style={{ padding: '12px 14px', color: LGRAY, whiteSpace: 'nowrap' }}>{user.joined}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button 
                          onClick={() => setManageModal({ open: true, user })} 
                          title="View Profile & Manage"
                          style={{ 
                            padding: '6px 12px', borderRadius: 8, background: `${S}10`, color: S, 
                            fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', 
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                          }}
                        >
                          <HiEye size={16} /> Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: LGRAY, fontSize: 13 }}>No users match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ fontSize: 12, color: LGRAY, marginTop: 10 }}>Showing {filtered.length} of {users.length} users</p>
      </div>

      {/* Modals */}
      <ManageUserModal
        open={manageModal.open}
        user={manageModal.user}
        territories={territories}
        onClose={() => setManageModal({ open: false, user: null })}
        onUpdateRole={changeRole}
        onUpdateTerritory={assignTerritory}
        onUpdateSubscription={changeSubscription}
        onStatusChange={handleStatusChange}
        onDelete={deleteUser}
      />
      <AddUserModal open={addUserOpen} territories={territories} isSubmitting={isSubmitting}
        onConfirm={handleAddUser} onCancel={() => setAddUserOpen(false)} />
    </AppLayout>
  );
}
