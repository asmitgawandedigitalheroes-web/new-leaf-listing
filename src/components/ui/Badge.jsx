// ── Badge ────────────────────────────────
// status: draft | pending | active | featured | sold | approved | paid | rejected | new | contacted | converted | lost

const STYLES = {
  draft:     { bg: '#E5E7EB', text: '#4B5563',  dot: '#6B7280' },
   pending:   { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  active:    { bg: '#E8F3EE', text: '#1F4D3A',  dot: '#D4AF37' },
  featured:  { bg: 'linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)', text: '#FFFFFF', dot: 'rgba(255,255,255,0.4)' },
  sold:      { bg: '#EDE9FE', text: '#5B21B6',  dot: '#7C3AED' },
  approved:  { bg: '#E8F3EE', text: '#1F4D3A',  dot: '#D4AF37' },
  paid:      { bg: '#DBEAFE', text: '#1E40AF',  dot: '#2563EB' },
  rejected:  { bg: '#FEE2E2', text: '#991B1B',  dot: '#DC2626' },
  new:       { bg: '#E8F3EE', text: '#1F4D3A',  dot: '#D4AF37' },
  contacted: { bg: 'rgba(212,175,55,0.12)', text: '#B8962E', dot: '#D4AF37' },
  converted: { bg: '#E8F3EE', text: '#1F4D3A',  dot: '#D4AF37' },
  lost:      { bg: '#E5E7EB', text: '#4B5563',  dot: '#6B7280' },
  showing:   { bg: '#EDE9FE', text: '#5B21B6',  dot: '#7C3AED' },
  offer:     { bg: 'rgba(212,175,55,0.12)', text: '#B8962E', dot: '#D4AF37' },
  trial:     { bg: 'rgba(212,175,55,0.12)', text: '#B8962E', dot: '#D4AF37' },
  assigned:  { bg: 'rgba(31,77,58,0.06)', text: '#1F4D3A', dot: '#D4AF37' },
};

export default function Badge({ status, label, className = '' }) {
  const s = STYLES[status?.toLowerCase()] || STYLES.draft;
  const text = label || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '');
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${className}`}
      style={{ background: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {text}
    </span>
  );
}
