// ── Avatar ───────────────────────────────
// Initials-based avatar with gold/green gradient variants

const SIZES = { xs: 'w-6 h-6 text-[9px]', sm: 'w-8 h-8 text-[11px]', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl' };
const COLORS = {
  gold:  'from-gold-400 to-gold-600',
  green: 'from-brand-400 to-brand-600',
};

export default function Avatar({ initials, size = 'sm', color = 'gold', className = '' }) {
  return (
    <div
      className={`${SIZES[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 bg-gradient-to-br ${COLORS[color]} ${className}`}
    >
      {initials}
    </div>
  );
}
