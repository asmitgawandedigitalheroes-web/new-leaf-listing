// ── ActivityFeed ──────────────────────────
// Shows a list of recent activity items
import {
  HiHome,
  HiUser,
  HiBanknotes,
  HiCheckCircle,
  HiSparkles,
  HiCreditCard,
} from 'react-icons/hi2';

const TYPE_STYLES = {
  listing:    { bg: '#ECFDF5', icon: <HiHome className="text-emerald-600" /> },
  lead:       { bg: '#EFF6FF', icon: <HiUser className="text-blue-600" /> },
  commission: { bg: '#FEFCE8', icon: <HiBanknotes className="text-yellow-700" /> },
  approval:   { bg: '#ECFDF5', icon: <HiCheckCircle className="text-emerald-600" /> },
  signup:     { bg: '#FFF7ED', icon: <HiSparkles className="text-orange-500" /> },
  payment:    { bg: '#FEFCE8', icon: <HiCreditCard className="text-yellow-700" /> },
};

export default function ActivityFeed({ items = [], maxItems = 6 }) {
  const shown = items.slice(0, maxItems);

  return (
    <ul className="divide-y divide-gray-50">
      {shown.map((item, i) => {
        const style = TYPE_STYLES[item.type] || TYPE_STYLES.listing;
        return (
          <li key={i} className="flex items-center gap-4 py-4 px-6 hover:bg-gray-50/50 transition-colors cursor-default group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-transform group-hover:scale-105"
              style={{ background: style.bg }}
            >
              {style.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-700 truncate leading-tight">
                {item.text}
              </p>
              <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-tight">
                {item.time}
              </p>
            </div>
          </li>
        );
      })}
      {items.length === 0 && (
        <li className="py-12 text-center text-sm text-gray-400 font-medium">No recent activity</li>
      )}
    </ul>
  );
}
