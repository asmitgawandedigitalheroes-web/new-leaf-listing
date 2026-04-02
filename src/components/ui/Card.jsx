// ── Card ─────────────────────────────────
// Modern premium card — shadow-based depth, no hard borders

export function Card({ children, className = '', hover = false, style: extraStyle = {}, ...props }) {
  return (
    <div
      className={`bg-white rounded-2xl ${hover ? 'transition-all duration-200 cursor-pointer' : ''} ${className}`}
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
        ...extraStyle,
      }}
      onMouseEnter={hover ? e => {
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      } : undefined}
      onMouseLeave={hover ? e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = '';
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export function DarkCard({ children, className = '', accentColor = 'gold', ...props }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        background: '#1A202C',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        borderLeft: '3px solid #D4AF37',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionCard({ title, action, children, footer, noPadding = false, className = '' }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      {title && (
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid #F9FAFB' }}
        >
          <h3 className="font-bold text-[15px] tracking-tight text-gray-900">{title}</h3>
          {action && <div className="flex items-center">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : ''}>{children}</div>
      {footer && (
        <div className="px-6 py-3" style={{ borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
          {footer}
        </div>
      )}
    </Card>
  );
}
