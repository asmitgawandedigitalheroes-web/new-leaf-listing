// ── BarChart ──────────────────────────────
// Simple CSS bar chart (no external deps)
// data: [{ label, value }]

export default function BarChart({ data = [], color = 'gold', height = 240 }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const ceiling = Math.ceil(maxValue / 5) * 5 || 5; // Round up for cleaner ticks
  const barColor = color === 'green' ? '#1F4D3A' : '#D4AF37';
  
  // 4 ticks for the Y-axis
  const ticks = [ceiling, Math.round(ceiling * 0.66), Math.round(ceiling * 0.33), 0];

  return (
    <div className="w-full flex">
      {/* Y-axis Labels */}
      <div className="flex flex-col justify-between pr-3 text-[10px] font-bold text-gray-300 pointer-events-none mb-6" style={{ height }}>
        {ticks.map((t, idx) => (
          <span key={idx}>{t}</span>
        ))}
      </div>

      <div className="flex-1 relative">
        {/* Horizontal Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between mb-6 pointer-events-none" style={{ height }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-full border-t border-gray-100/60" />
          ))}
        </div>

        {/* Chart Content */}
        <div className="relative">
          <div className="flex items-end gap-3 px-2" style={{ height }}>
            {data.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                <span className="absolute -top-6 text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white/80 px-1 rounded shadow-sm">
                  {d.label}: {d.value}
                </span>
                <div
                  className="w-full rounded-t-sm transition-all duration-300 cursor-pointer shadow-sm group-hover:shadow-md"
                  style={{
                    height: `${(d.value / ceiling) * height}px`,
                    background: barColor,
                    minHeight: d.value > 0 ? 2 : 0,
                  }}
                />
              </div>
            ))}
          </div>

          {/* X-axis Labels */}
          <div className="flex gap-3 px-2 mt-4">
            {data.map((d, i) => (
              <div key={i} className="flex-1 text-center text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
