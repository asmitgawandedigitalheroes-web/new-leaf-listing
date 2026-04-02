import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout({ role, title, user: userProp, children }) {
  const { profile, role: authRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Build display user — props take precedence, fall back to AuthContext
  const resolvedRole = role || authRole || 'realtor';
  const resolvedUser = userProp || (profile ? {
    name: profile.full_name || profile.email || 'User',
    role: profile.role || resolvedRole,
    initials: (() => {
        const name = profile.full_name || 'U';
        const parts = name.trim().split(' ').filter(Boolean);
        return parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase();
      })(),
  } : undefined);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F9FAFB' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40
        transition-transform duration-300
        md:translate-x-0 md:flex md:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar role={resolvedRole} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Topbar
          title={title}
          user={resolvedUser}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
