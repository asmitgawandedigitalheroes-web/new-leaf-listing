import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../context/AuthContext';

// ── Notification type config ───────────────────────────────────────────────
const TYPE_CFG = {
  lead:         { icon: '👤', label: 'New Lead',       color: '#1F4D3A' },
  listing:      { icon: '🏠', label: 'Listing Update', color: '#1D4ED8' },
  payment:      { icon: '💳', label: 'Payment',        color: '#16A34A' },
  commission:   { icon: '💰', label: 'Commission',     color: '#D4AF37' },
  system:       { icon: '🔔', label: 'System',         color: '#6B7280' },
};

function formatRelativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── NotificationPanel ──────────────────────────────────────────────────────
function NotificationPanel({ notifications, unreadCount, onMarkRead, onMarkAllRead, onClose }) {
  const navigate = useNavigate();

  const handleClick = (n) => {
    onMarkRead(n.id);
    onClose();
    // Navigate to relevant page based on type
    if (n.type === 'lead')       navigate('/realtor/leads');
    else if (n.type === 'listing') navigate('/realtor/listings');
    else if (n.type === 'commission') navigate('/realtor/commissions');
    else if (n.type === 'payment') navigate('/realtor/billing');
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        width: 360,
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 14,
        boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid #F3F4F6',
        background: '#FAFAFA',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111111' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{
              background: '#D4AF37', color: '#fff',
              borderRadius: 10, padding: '1px 7px',
              fontSize: 11, fontWeight: 700,
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#D4AF37', fontWeight: 600,
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => {
            const cfg = TYPE_CFG[n.type] || TYPE_CFG.system;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  background: n.is_read ? '#fff' : 'rgba(212,175,55,0.06)',
                  borderBottom: '1px solid #F9FAFB',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = n.is_read ? '#fff' : 'rgba(212,175,55,0.06)'}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: cfg.color + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: n.is_read ? 500 : 700,
                    color: '#111111', lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.title || cfg.label}
                  </div>
                  <div style={{
                    fontSize: 11, color: '#6B7280', marginTop: 2,
                    lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {n.message || n.body || ''}
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                    {formatRelativeTime(n.created_at)}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.is_read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#D4AF37', flexShrink: 0, marginTop: 4,
                  }} />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div style={{
          padding: '10px 16px', borderTop: '1px solid #F3F4F6',
          background: '#FAFAFA', textAlign: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>
            Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Topbar ─────────────────────────────────────────────────────────────────
export default function Topbar({ title, user, onMenuClick }) {
  const { profile, role, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  // Resolve display user from props or AuthContext
  const displayUser = user || {
    name: profile?.full_name || 'User',
    role: role || 'realtor',
    initials: (profile?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const profilePath = role === 'realtor' ? '/realtor/profile' : null;

  return (
    <header className="topbar">
      {/* Hamburger — mobile only */}
      <button
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors mr-2 flex-shrink-0"
        style={{ color: '#6B7280' }}
        onClick={onMenuClick}
        aria-label="Open menu"
        onMouseEnter={e => { e.currentTarget.style.background = '#E8F3EE'; e.currentTarget.style.color = '#1F4D3A'; }}
        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#6B7280'; }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: `'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 22`, lineHeight: 1 }}>menu</span>
      </button>

      {/* Page title */}
      <h1 className="font-semibold text-lg hidden md:block" style={{ color: '#111111' }}>{title}</h1>

      {/* Search */}
      <div className="flex-1 max-w-xs md:max-w-sm mx-2 md:mx-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7280' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: `'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 16`, lineHeight: 1 }}>search</span>
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm rounded-lg focus:outline-none transition"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111111' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = ''; }}
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 ml-auto">

        {/* ── Notification bell ─────────────────────────────────────────── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setNotifOpen(p => !p); setUserMenuOpen(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: notifOpen ? '#1F4D3A' : '#6B7280', background: notifOpen ? '#E8F3EE' : '' }}
            onMouseEnter={e => { if (!notifOpen) { e.currentTarget.style.background = '#E8F3EE'; e.currentTarget.style.color = '#1F4D3A'; } }}
            onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#6B7280'; } }}
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20`, lineHeight: 1 }}>notifications</span>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                minWidth: 16, height: 16, borderRadius: 8,
                background: '#D4AF37', border: '2px solid #fff',
                fontSize: 9, fontWeight: 800, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, padding: '0 3px',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <NotificationPanel
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markAsRead}
              onMarkAllRead={markAllAsRead}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

        {/* ── User menu ─────────────────────────────────────────────────── */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setUserMenuOpen(p => !p); setNotifOpen(false); }}
            className="flex items-center gap-2.5 cursor-pointer"
            style={{ background: 'none', border: 'none', padding: '4px 8px', borderRadius: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Avatar initials={displayUser.initials} size="sm" color={displayUser.role === 'admin' ? 'gold' : 'green'} />
            <div className="hidden md:block" style={{ textAlign: 'left' }}>
              <div className="text-sm font-medium leading-none" style={{ color: '#111111' }}>{displayUser.name}</div>
              <div className="text-[11px] capitalize mt-0.5" style={{ color: '#6B7280' }}>{displayUser.role}</div>
            </div>
          </button>

          {userMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              width: 200, background: '#fff', border: '1px solid #E5E7EB',
              borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 9999, overflow: 'hidden',
            }}>
              {/* Account info */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>{displayUser.name}</div>
                <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'capitalize' }}>{displayUser.role}</div>
              </div>

              {profilePath && (
                <button
                  onClick={() => { setUserMenuOpen(false); navigate(profilePath); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
                  My Profile
                </button>
              )}

              <button
                onClick={handleLogout}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8,
                  borderTop: '1px solid #F3F4F6',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
