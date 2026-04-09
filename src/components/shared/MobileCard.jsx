/**
 * MobileCard — consistent card wrapper for mobile list views.
 *
 * Replaces table rows on screens < md. Each card lives in a
 * `<div className="md:hidden flex flex-col gap-3">` container.
 *
 * Props:
 *  children  — card content
 *  highlight — optional color for left border accent (e.g. '#DC2626' for errors)
 *  onClick   — optional click handler for the whole card
 */
export default function MobileCard({ children, highlight, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
        borderLeft: highlight ? `3px solid ${highlight}` : '1.5px solid transparent',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {children}
    </div>
  );
}

/**
 * MobileCardRow — a single label/value row inside a MobileCard.
 *
 * Props:
 *  label    — row label text
 *  children — row value content
 */
export function MobileCardRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: '#374151', textAlign: 'right' }}>
        {children}
      </span>
    </div>
  );
}

/**
 * MobileCardActions — bottom action row inside a MobileCard.
 */
export function MobileCardActions({ children }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
      {children}
    </div>
  );
}
