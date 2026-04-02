import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function ListingCard({
  listing,
  showActions = false,
  onApprove,
  onReject,
  onSubmit,
  onFeature,
  onUnfeature,
  onMarkSold,
  onArchive,
}) {
  const { id, title, address, city, price, beds, baths, sqft, status, upgrade_type, image, realtor } = listing;

  // Determine if listing is currently featured/top
  const isFeatured = upgrade_type === 'featured' || upgrade_type === 'top';

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = '';
      }}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden" style={{ background: '#E8F3EE' }}>
        <img
          src={image || `https://picsum.photos/seed/${id}/400/300`}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <Badge status={status} />
        </div>
        {isFeatured && (
          <div
            className="absolute top-3 right-3 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg"
            style={{ background: '#D4AF37' }}
          >
            {upgrade_type === 'top' ? 'Top' : 'Featured'}
          </div>
        )}
        {/* Price overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-2"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}
        >
          <span className="font-bold text-white text-sm">${price?.toLocaleString()}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-sm leading-snug line-clamp-1 mb-1" style={{ color: '#111111' }}>
          {title}
        </h3>
        <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
          {address ? `${address}, ` : ''}{city}
        </p>

        {/* Stats row */}
        <div
          className="flex items-center gap-4 text-xs mb-3 pb-3"
          style={{ color: '#4B5563', borderBottom: '1px solid #F3F4F6' }}
        >
          {beds != null  && <span className="flex items-center gap-1">🛏 <span>{beds} bd</span></span>}
          {baths != null && <span className="flex items-center gap-1">🚿 <span>{baths} ba</span></span>}
          {sqft != null  && <span className="flex items-center gap-1">📐 <span>{sqft?.toLocaleString()} sqft</span></span>}
        </div>

        {realtor?.full_name && (
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
            Agent: {realtor.full_name}
          </p>
        )}

        {/* Actions */}
        {showActions && (
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {/* Draft → submit for approval (Realtor action) */}
            {(status === 'draft' || status === 'rejected') && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSubmit?.()}
                className="w-full sm:w-auto"
              >
                Submit for Approval
              </Button>
            )}

            {/* Pending → approve or reject (Admin/Director action) */}
            {status === 'pending' && (
              <>
                <Button variant="primary" size="sm" onClick={() => onApprove?.()}>
                  Approve
                </Button>
                <Button variant="danger" size="sm" onClick={() => onReject?.()}>
                  Reject
                </Button>
              </>
            )}

            {/* Active → feature toggle */}
            {status === 'active' && !isFeatured && (
              <Button
                size="sm"
                onClick={() => onFeature?.()}
                style={{ background: '#D4AF37', color: '#fff', fontWeight: 600 }}
              >
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

            {/* Active / featured → mark sold */}
            {(status === 'active' || status === 'under_contract') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkSold?.()}
              >
                Mark Sold
              </Button>
            )}

            {/* Active → archive */}
            {status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onArchive?.()}
                style={{ color: '#6B7280' }}
              >
                Archive
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
