import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiViewColumns,
  HiUsers,
  HiHomeModern,
  HiChatBubbleLeftRight,
  HiMap,
  HiCreditCard,
  HiBanknotes,
  HiClipboardDocumentList,
  HiCog6Tooth,
  HiIdentification,
  HiChartBar,
  HiUserCircle,
  HiArrowLeftOnRectangle,
  HiChevronLeft,
  HiCurrencyDollar,
  HiEnvelope,
  HiSparkles,
  HiExclamationTriangle,
  HiArrowDownTray,
  HiDocumentText,
  HiCheckBadge,
  HiUserPlus,
} from 'react-icons/hi2';

// Reusable icon wrapper for consistency
function NavIcon({ icon: Icon, sz = 18 }) {
  return <Icon size={sz} style={{ flexShrink: 0 }} />;
}

const NAV = {
  admin: [
    { key: 'dashboard',    label: 'Dashboard',    icon: HiViewColumns,         to: '/admin/dashboard' },
    { key: 'users',        label: 'Users',         icon: HiUsers,               to: '/admin/users' },
    { key: 'approvals',   label: 'Approvals',     icon: HiCheckBadge,          to: '/admin/approvals' },
    { key: 'add-user',        label: 'Add User',         icon: HiUserPlus,       to: '/admin/add-user' },
    { key: 'listings',     label: 'Listings',      icon: HiHomeModern,          to: '/admin/listings' },
    { key: 'leads',        label: 'Leads',         icon: HiChatBubbleLeftRight,  to: '/admin/leads' },
    { key: 'enquiries',   label: 'Enquiries',     icon: HiEnvelope,            to: '/admin/enquiries' },
    { key: 'territories',  label: 'Territories',   icon: HiMap,                 to: '/admin/territories' },
    { key: 'subscriptions',label: 'Subscriptions', icon: HiCreditCard,          to: '/admin/subscriptions' },
    { key: 'commissions',  label: 'Commissions',   icon: HiBanknotes,           to: '/admin/commissions-admin' },
    { key: 'pricing',      label: 'Pricing',       icon: HiCurrencyDollar,        to: '/admin/pricing' },
    { key: 'payouts',      label: 'Payouts',       icon: HiArrowDownTray,         to: '/admin/payouts' },
    { key: 'disputes',     label: 'Disputes',      icon: HiExclamationTriangle,   to: '/admin/disputes' },
    { key: 'audit',        label: 'Audit Log',     icon: HiClipboardDocumentList, to: '/admin/audit' },
    { key: 'settings',     label: 'Settings',      icon: HiCog6Tooth,             to: '/admin/settings' },
  ],
  director: [
    { key: 'dashboard',    label: 'Dashboard',     icon: HiViewColumns,         to: '/director/dashboard' },
    { key: 'listings',     label: 'Listings',      icon: HiHomeModern,          to: '/director/listings' },
    { key: 'leads',        label: 'My Leads',      icon: HiChatBubbleLeftRight,  to: '/director/leads' },
    { key: 'realtors',     label: 'My Realtors',   icon: HiIdentification,      to: '/director/realtors' },
    { key: 'commissions',  label: 'My Commissions',icon: HiBanknotes,           to: '/director/commissions' },
    { key: 'billing',      label: 'Earnings & Payouts', icon: HiCreditCard,      to: '/director/billing' },
    { key: 'reports',      label: 'Reports',       icon: HiChartBar,            to: '/director/reports' },
    { key: 'contracts',    label: 'Legal & Contracts', icon: HiDocumentText,    to: '/director/contracts' },
  ],
  realtor: [
    { key: 'dashboard',    label: 'Dashboard',     icon: HiViewColumns,         to: '/realtor/dashboard' },
    { key: 'listings',     label: 'My Listings',   icon: HiHomeModern,          to: '/realtor/listings' },
    { key: 'leads',        label: 'My Leads',      icon: HiChatBubbleLeftRight,  to: '/realtor/leads' },
    { key: 'messages',     label: 'Messages',      icon: HiEnvelope,            to: '/realtor/messages' },
    { key: 'referrals',    label: 'NLV Referrals', icon: HiSparkles,            to: '/realtor/referrals' },
    { key: 'commissions',  label: 'Commissions',   icon: HiBanknotes,           to: '/realtor/commissions' },
    { key: 'billing',      label: 'Billing',       icon: HiCreditCard,          to: '/realtor/billing' },
    { key: 'profile',      label: 'Profile',       icon: HiUserCircle,          to: '/realtor/profile' },
  ],
};

const ROLE_LABEL = {
  admin:    'Super Admin',
  director: 'Director',
  realtor:  'Realtor',
};

const ROLE_COLOR = {
  admin:    { bg: 'rgba(212,175,55,0.18)', text: '#D4AF37' },
  director: { bg: 'rgba(31,77,58,0.25)',   text: '#4ADE80' },
  realtor:  { bg: 'rgba(59,130,246,0.18)', text: '#93C5FD' },
};

// Fallback display names per role for demo/dev mode
const DEMO_NAMES = {
  admin:    'Asmit Shah',
  director: 'Michael Torres',
  realtor:  'James Park',
};

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function Sidebar({ role: roleProp = 'realtor', onClose }) {
  const navigate = useNavigate();
  const { role: authRole, profile, logout } = useAuth();

  // Auth context role takes priority over the prop passed from AppLayout
  const effectiveRole = authRole || roleProp || 'realtor';
  const items = NAV[effectiveRole] || NAV.realtor;

  const displayName = profile?.full_name || DEMO_NAMES[effectiveRole] || 'User';
  const roleColors  = ROLE_COLOR[effectiveRole] || ROLE_COLOR.realtor;
  const initials    = getInitials(displayName);

  const handleSignOut = async () => {
    try { await logout(); } catch { /* ignore */ }
    // FIX: CRIT-004 — Use hard redirect instead of navigate() to prevent race condition
    // where React state (auth.profile) is not yet null when LoginPage mounts,
    // causing the redirect-if-authenticated useEffect to loop back to admin dashboard.
    window.location.replace('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #1F4D3A)' }}
        >
          N
        </div>
        <div>
          <div className="text-white font-bold text-sm tracking-wide">NLV Listings</div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: '#6B7280' }}>
            {ROLE_LABEL[effectiveRole] || 'User'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {items.map(item => (
          <NavLink
            key={item.key}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <NavIcon icon={item.icon} sz={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* User info card */}
        <div
          className="flex items-center gap-3 px-2 py-3 mb-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #1F4D3A)' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-semibold truncate">{displayName}</div>
            <span
              className="inline-block text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mt-0.5"
              style={{ background: roleColors.bg, color: roleColors.text }}
            >
              {ROLE_LABEL[effectiveRole]}
            </span>
          </div>
        </div>

        <button
          className="nav-item w-full text-left"
          onClick={() => navigate('/')}
        >
          <NavIcon icon={HiChevronLeft} sz={18} />
          Back to Site
        </button>
        <button
          className="nav-item w-full text-left"
          style={{ color: '#FC8181' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#FCA5A5'; e.currentTarget.style.background = 'rgba(252,129,129,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#FC8181'; e.currentTarget.style.background = ''; }}
          onClick={handleSignOut}
        >
          <NavIcon icon={HiArrowLeftOnRectangle} sz={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
