import Badge from '../ui/Badge';
import Button from '../ui/Button';
import {
  HiMapPin,
  HiUser,
  HiStar,
  HiHome,
  HiNoSymbol,
  HiTrash,
} from 'react-icons/hi2';

// Inline stat icons — avoids heavy icon imports for micro-glyphs
function BedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
      <path d="M2 9h20v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9z" />
      <path d="M10 9V5" />
    </svg>
  );
}
function BathIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
      <line x1="10" y1="5" x2="8" y2="7" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  );
}
function SqftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M3 9h6M15 3v6M15 9h6M15 15v6M9 15h6" />
    </svg>
  );
}

export default function ListingCard({
  listing,
  showActions = false,
  onEdit,
  onApprove,
  onReject,
  onSubmit,
  onFeature,
  onUnfeature,
  onMarkSold,
  onArchive,
  onDeactivate,
  onDelete,
}) {
  const { id, title, address, city, price, beds, baths, sqft, status, upgrade_type, image, realtor } = listing;
  const isFeatured = upgrade_type === 'featured' || upgrade_type === 'top';
  const hasStats = beds != null || baths != null || sqft != null;

  const agentInitials = realtor?.full_name
    ? realtor.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : null;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-300 group"
      style={{
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.06)',
        border: '1px solid #F0F0F0',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.13)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = '';
      }}
    >
      {/* ── Image ── */}
      <div className="relative overflow-hidden" style={{ height: 210 }}>
        <img
          src={image || `https://picsum.photos/seed/${id}/600/400`}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.12) 50%, transparent 100%)' }}
        />

        {/* Status badge — top left */}
        <div className="absolute top-3 left-3">
          <Badge status={status} />
        </div>

        {/* Featured ribbon — top right */}
        {isFeatured && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#B8962E)', color: '#fff', boxShadow: '0 2px 8px rgba(212,175,55,0.45)' }}
          >
            <HiStar size={10} />
            {upgrade_type === 'top' ? 'Top Pick' : 'Featured'}
          </div>
        )}

        {/* Price — bottom left */}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div>
            <div className="text-white font-black text-xl leading-none" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
              {price ? `$${Number(price).toLocaleString()}` : 'Price on request'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-4 flex flex-col flex-1">

        {/* Title */}
        <h3
          className="font-bold text-[15px] leading-snug line-clamp-1 mb-1"
          style={{ color: '#111111' }}
        >
          {title}
        </h3>

        {/* Address */}
        <div className="flex items-center gap-1 mb-3" style={{ color: '#9CA3AF' }}>
          <HiMapPin size={12} className="flex-shrink-0" />
          <span className="text-xs truncate">
            {address ? `${address}, ` : ''}{city}
          </span>
        </div>

        {/* Stats row */}
        {hasStats && (
          <div
            className="flex items-center gap-3 py-2.5 px-3 rounded-xl mb-3 text-xs font-semibold"
            style={{ background: '#F8F9FA', color: '#4B5563' }}
          >
            {beds != null && (
              <span className="flex items-center gap-1.5">
                <BedIcon />
                {beds} <span className="font-normal text-gray-400">bd</span>
              </span>
            )}
            {beds != null && baths != null && (
              <span className="w-px h-3 rounded" style={{ background: '#E5E7EB' }} />
            )}
            {baths != null && (
              <span className="flex items-center gap-1.5">
                <BathIcon />
                {baths} <span className="font-normal text-gray-400">ba</span>
              </span>
            )}
            {(beds != null || baths != null) && sqft != null && (
              <span className="w-px h-3 rounded" style={{ background: '#E5E7EB' }} />
            )}
            {sqft != null && (
              <span className="flex items-center gap-1.5">
                <SqftIcon />
                {Number(sqft).toLocaleString()} <span className="font-normal text-gray-400">sqft</span>
              </span>
            )}
          </div>
        )}

        {/* Agent row */}
        {realtor?.full_name && (
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: '#E8F3EE', color: '#1F4D3A' }}
            >
              {agentInitials || <HiUser size={11} />}
            </div>
            <span className="text-xs" style={{ color: '#6B7280' }}>
              Agent: <span className="font-semibold text-gray-700">{realtor.full_name}</span>
            </span>
          </div>
        )}

        {/* ── Actions ── */}
        {showActions && (
          <div
            className="mt-auto pt-3 flex flex-wrap gap-2"
            style={{ borderTop: '1px solid #F3F4F6' }}
          >
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.()}
                style={{ borderColor: '#D1D5DB', color: '#374151' }}
              >
                Edit
              </Button>
            )}

            {/* Draft / Rejected → submit */}
            {(status === 'draft' || status === 'rejected') && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSubmit?.()}
              >
                Submit for Approval
              </Button>
            )}

            {/* Pending → approve / reject */}
            {status === 'pending' && (
              <>
                <Button variant="green" size="sm" onClick={() => onApprove?.()}>
                  Approve
                </Button>
                <Button variant="danger" size="sm" onClick={() => onReject?.()}>
                  Reject
                </Button>
              </>
            )}

            {/* Active → feature / unfeature */}
            {status === 'active' && !isFeatured && (
              <Button
                size="sm"
                onClick={() => onFeature?.()}
                style={{ background: '#D4AF37', color: '#fff', fontWeight: 600 }}
              >
                <HiStar size={13} />
                Feature
              </Button>
            )}
            {status === 'active' && isFeatured && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUnfeature?.()}
                style={{ borderColor: '#D4AF37', color: '#B8962E' }}
              >
                Unfeature
              </Button>
            )}

            {/* Active / under_contract → mark sold */}
            {(status === 'active' || status === 'under_contract') && (
              <Button variant="outline" size="sm" onClick={() => onMarkSold?.()}>
                Mark Sold
              </Button>
            )}

            {/* Active → archive */}
            {status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onArchive?.()}
                style={{ color: '#9CA3AF' }}
              >
                Archive
              </Button>
            )}

            {/* Admin: deactivate (any non-inactive listing) */}
            {onDeactivate && status !== 'inactive' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeactivate?.()}
                style={{ color: '#D97706' }}
              >
                <HiNoSymbol size={13} />
                Deactivate
              </Button>
            )}

            {/* Admin: delete (any listing) */}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.()}
                style={{ color: '#DC2626' }}
              >
                <HiTrash size={13} />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
