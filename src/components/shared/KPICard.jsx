// ── KPICard ───────────────────────────────
// Premium dashboard metric card

export default function KPICard({ label, value, trend, trendLabel, icon, accentColor = 'green', dark = false, onClick }) {
  const isPositive = trend >= 0;

  if (dark) {
    return (
      <div
        onClick={onClick}
        className="rounded-2xl p-6 flex flex-col gap-3"
        style={{
          background: '#1A202C',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          borderLeft: '3px solid #D4AF37',
          cursor: onClick ? 'pointer' : undefined,
        }}
      >
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>{label}</span>
          {icon && (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'rgba(212,175,55,0.14)' }}>
              {icon}
            </div>
          )}
        </div>
        <div className="font-headline font-black text-2xl md:text-3xl leading-none text-white">{value}</div>
        {trendLabel && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold" style={{ color: isPositive ? '#D4AF37' : '#FC8181' }}>
              {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
            <span className="text-[11px]" style={{ color: '#6B7280' }}>{trendLabel}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-6 flex flex-col gap-4 group transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
      style={{
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05), 0 2px 6px -1px rgba(0,0,0,0.02)',
        border: '1px solid rgba(229, 231, 235, 0.5)',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {/* Noise pattern overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none noise-overlay" />
      
      {/* Subtle top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-transparent opacity-40" />

      <div className="flex items-start justify-between relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-[#D4AF37] transition-colors">{label}</span>
        {icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
            style={{ 
              background: 'linear-gradient(135deg, white, #F9FAFB)',
              border: '1px solid rgba(229, 231, 235, 0.8)'
            }}>
            {icon}
          </div>
        )}
      </div>

      <div className="relative z-10">
        <div className="font-headline font-black text-2xl md:text-3xl leading-none text-gray-900 mb-1">{value}</div>
        {trendLabel && (
          <div className="flex items-center gap-1.5 mt-1">
            {trend !== null && trend !== undefined && (
              <span className="text-[11px] font-bold" style={{ color: trend >= 0 ? '#1F4D3A' : '#DC2626' }}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
            <span className="text-[11px] text-gray-400">{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
