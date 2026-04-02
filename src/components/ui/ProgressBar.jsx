// ── ProgressBar ───────────────────────────
// color: gold | green | blue | red

const COLORS = {
  gold:  '#D4AF37',
  green: '#D4AF37',
  blue:  '#3B82F6',
  red:   '#EF4444',
};

export default function ProgressBar({ value = 0, max = 100, color = 'green', showLabel = false, className = '' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = COLORS[color] || COLORS.green;
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1" style={{ color: '#6B7280' }}>
          <span>{value}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
