import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiEllipsisVertical } from 'react-icons/hi2';

/**
 * ActionPill — compact colored pill button used in table action columns.
 */
export function ActionPill({ icon: Icon, label, color, bg, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 9px', borderRadius: 6, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 11, fontWeight: 700, background: bg, color,
        transition: 'opacity 0.15s', whiteSpace: 'nowrap',
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.75'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = '1'; }}
    >
      {Icon && <Icon size={12} />}
      {label}
    </button>
  );
}

/**
 * ActionMenu — circular 3-dot dropdown menu.
 * Uses a portal + fixed positioning so it escapes overflow:hidden/auto containers.
 *
 * Props:
 *  items    — array of { icon, label, color?, onClick }
 *  open     — boolean controlled open state
 *  onToggle — (boolean) => void
 */
export function ActionMenu({ items, open, onToggle }) {
  const btnRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  // Recalculate position whenever menu opens
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) onToggle(false);
    };
    const tid = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(tid); document.removeEventListener('click', handler); };
  }, [open, onToggle]);

  if (!items || !items.length) return null;

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={btnRef}
        onClick={() => onToggle(!open)}
        title="More actions"
        style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '1px solid #E5E7EB', background: open ? '#F3F4F6' : '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#6B7280', transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = '#fff'; }}
      >
        <HiEllipsisVertical size={16} />
      </button>

      {open && createPortal(
        <div style={{
          position: 'fixed',
          top: coords.top,
          right: coords.right,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4,
          zIndex: 9999, minWidth: 170,
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); item.onClick(); onToggle(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', textAlign: 'left',
                padding: '7px 12px', fontSize: 13, fontWeight: 500,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: item.color || '#374151', borderRadius: 6, transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {item.icon && <item.icon size={14} style={{ flexShrink: 0 }} />}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
