import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useListing } from '../../hooks/useListing';
import { useListings } from '../../hooks/useListings';
import { useLeads } from '../../hooks/useLeads';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { profile, role } = useAuth();
  const { listing, isLoading, error } = useListing(id);
  const {
    approveListing,
    rejectListing,
    featureListing,
    markUnderContract,
    markSold,
    archiveListing,
  } = useListings();
  const { createInquiry } = useLeads();
  const [isActing, setIsActing] = useState({});
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    interest: 'Buying'
  });

  // Pre-fill contact form if user is logged in
  useEffect(() => {
    if (profile) {
      setContactForm(prev => ({
        ...prev,
        name: profile.full_name || '',
        email: profile.email || ''
      }));
    }
  }, [profile]);

  const layoutUser = {
    name: profile?.full_name || 'User',
    role: profile?.role || 'realtor',
    initials: (profile?.full_name || 'U').slice(0, 2).toUpperCase(),
  };

  const isAdminOrDirector = role === 'admin' || role === 'director';
  const isDirector = role === 'director';
  const isOwnListing = listing?.realtor_id === profile?.id;
  const canTransition = (isAdminOrDirector && !isDirector) || isOwnListing;

  const backToListings =
    role === 'admin'    ? '/admin/listings' :
    role === 'director' ? '/director/listings' :
                          '/realtor/listings';

  if (error) {
    return (
      <AppLayout role={profile?.role || 'realtor'} title="Error" user={layoutUser}>
        <div className="p-6 text-center py-24">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="text-gray-500 font-medium">Error loading listing: {error}</p>
          <Button variant="outline" onClick={() => navigate(backToListings)} className="mt-4">← Back to Listings</Button>
        </div>
      </AppLayout>
    );
  }

  if (!isLoading && !listing) {
    return (
      <AppLayout role={profile?.role || 'realtor'} title="Listing Not Found" user={layoutUser}>
        <div className="p-6 text-center py-24">
          <div className="text-5xl mb-3">🏠</div>
          <p className="text-gray-500 font-medium">Listing not found</p>
          <Button variant="outline" onClick={() => navigate(backToListings)} className="mt-4">← Back to Listings</Button>
        </div>
      </AppLayout>
    );
  }

  const DETAILS = [
    { label: 'Bedrooms',    value: listing?.bedrooms != null ? `${listing.bedrooms} bd` : 'N/A' },
    { label: 'Bathrooms',   value: listing?.bathrooms != null ? `${listing.bathrooms} ba` : 'N/A' },
    { label: 'Square Feet', value: listing?.sqft != null ? listing.sqft.toLocaleString() : 'N/A' },
    { label: 'Type',        value: listing?.property_type || 'N/A' },
  ];

  const handleAction = async (name, extra = {}) => {
    setIsActing(p => ({ ...p, [name]: true }));
    try {
      let result;
      if (name === 'approve') {
        result = await approveListing(id);
        if (result.error) throw result.error;
        addToast({ type: 'success', title: 'Listing approved', desc: 'Status set to active.' });
      } else if (name === 'reject') {
        result = await rejectListing(id, extra.reason || '');
        if (result.error) throw result.error;
        addToast({ type: 'warning', title: 'Listing rejected', desc: 'Returned to realtor for revision.' });
        setShowRejectInput(false);
        setRejectReason('');
      } else if (name === 'feature') {
        result = await featureListing(id);
        if (result.error) throw result.error;
        addToast({ type: 'success', title: 'Listing featured', desc: 'Upgrade type set to featured.' });
      } else if (name === 'under_contract') {
        result = await markUnderContract(id);
        if (result.error) throw result.error;
        addToast({ type: 'info', title: 'Marked under contract' });
      } else if (name === 'sold') {
        result = await markSold(id);
        if (result.error) throw result.error;
        addToast({ type: 'success', title: 'Listing marked as sold' });
      } else if (name === 'expire') {
        result = await archiveListing(id);
        if (result.error) throw result.error;
        addToast({ type: 'warning', title: 'Listing archived', desc: 'Status set to expired.' });
      }
      // After any successful admin/director action, go back to their listings page
      if (isAdminOrDirector) {
        navigate(backToListings);
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Action failed', desc: err?.message || 'Please try again.' });
    } finally {
      setIsActing(p => ({ ...p, [name]: false }));
    }
  };

  const handleContactAgent = async () => {
    if (!contactForm.name || !contactForm.email) {
      addToast({ type: 'error', title: 'Missing info', desc: 'Name and email are required.' });
      return;
    }

    setIsContactLoading(true);
    try {
      const { error: leadError } = await createInquiry({
        listing_id: listing.id,
        source: 'listing_detail',
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        message: contactForm.message,
        interest: contactForm.interest,
        territory_id: listing.territory_id,
        status: 'new',
      });

      if (leadError) throw leadError;

      addToast({
        type: 'success',
        title: 'Request sent',
        desc: 'The listing agent will be in touch shortly.',
      });
      setContactModalOpen(false);
      // Reset non-auth fields
      setContactForm(prev => ({ ...prev, message: '', phone: '' }));
    } catch (err) {
      console.error('Contact agent error:', err);
      addToast({ type: 'error', title: 'Could not send request', desc: 'Unable to send your inquiry. Please try again or contact support.' });
    } finally {
      setIsContactLoading(false);
    }
  };

  const imgSrc = listing?.images?.[0] || FALLBACK_IMAGE;
  const isInactive = listing?.status === 'sold' || listing?.status === 'expired';

  return (
    <AppLayout role={profile?.role || 'realtor'} title={isLoading ? 'Loading listing…' : listing?.title} user={layoutUser}>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate(backToListings)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          ← Back to Listings
        </button>

        {/* Rejection reason banner */}
        {!isLoading && listing?.rejection_reason && listing?.status === 'draft' && (
          <div className="mb-5 border border-red-200 bg-red-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-700 mb-1">Listing was rejected</p>
            <p className="text-sm text-red-600">{listing.rejection_reason}</p>
          </div>
        )}

        {/* Image + header */}
        <div className="grid lg:grid-cols-5 gap-6 mb-6">
          <div className="lg:col-span-3">
            <div className="rounded-xl overflow-hidden h-72 bg-gray-100">
              {isLoading ? (
                <Skeleton width="100%" height="100%" />
              ) : (
                <img
                  src={imgSrc}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = FALLBACK_IMAGE; }}
                />
              )}
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              {isLoading ? <Skeleton width="60px" height="24px" /> : <Badge status={listing.status} />}

              {/* Pending: approve / reject buttons (admin/director) */}
              {!isLoading && listing.status === 'pending' && isAdminOrDirector && (
                <div className="flex gap-2">
                  <Button variant="green" size="sm" onClick={() => handleAction('approve')} isLoading={isActing['approve']}>Approve</Button>
                  <Button variant="danger" size="sm" onClick={() => setShowRejectInput(v => !v)}>Reject</Button>
                </div>
              )}
            </div>

            {/* Inline reject reason input */}
            {showRejectInput && (
              <div className="mb-3 flex flex-col gap-2">
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
                  rows={2}
                  placeholder="Rejection reason (optional)"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isActing['reject']}
                  onClick={() => handleAction('reject', { reason: rejectReason })}
                >
                  Confirm Reject
                </Button>
              </div>
            )}

            {isLoading ? (
              <>
                <Skeleton width="80%" height="28px" className="mb-2" />
                <Skeleton width="60%" height="18px" className="mb-4" />
                <Skeleton width="140px" height="36px" className="mb-6" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{listing.title}</h1>
                <p className="text-gray-400 text-sm mb-4">{listing.address}, {listing.city}</p>
                <div className="text-3xl font-black text-gray-900 mb-6">${listing.price?.toLocaleString()}</div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3 mb-6">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <Skeleton width="100%" height="32px" />
                  </div>
                ))
              ) : DETAILS.map(d => (
                <div key={d.label} className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{d.label}</div>
                  <div className="text-sm font-semibold text-gray-800">{d.value}</div>
                </div>
              ))}
            </div>

            {/* Status transition buttons */}
            {!isLoading && canTransition && (
              <div className="flex flex-wrap gap-2 mb-3">
                {listing.status === 'active' && (
                  <>
                    <Button variant="outline" size="sm" isLoading={isActing['under_contract']} onClick={() => handleAction('under_contract')}>
                      Mark Under Contract
                    </Button>
                    {isAdminOrDirector && (
                      <Button variant="outline" size="sm" isLoading={isActing['expire']} onClick={() => handleAction('expire')}>
                        Archive
                      </Button>
                    )}
                  </>
                )}
                {(listing.status === 'active' || listing.status === 'under_contract') && (
                  <Button variant="green" size="sm" isLoading={isActing['sold']} onClick={() => handleAction('sold')}>
                    Mark Sold
                  </Button>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-auto">
              {isAdminOrDirector && !isDirector && !isInactive && listing?.status === 'active' && (
                <Button variant="primary" className="flex-1"
                  isLoading={isActing['feature']}
                  onClick={() => handleAction('feature')}>
                  Feature Listing
                </Button>
              )}
              {canTransition && (role !== 'admin' || isOwnListing) && (
                <Button variant="outline"
                  onClick={() => navigate(`/listings/${id}/edit`)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Description</h3>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton width="100%" height="14px" />
              <Skeleton width="100%" height="14px" />
              <Skeleton width="80%" height="14px" />
            </div>
          ) : (
            <p className="text-sm text-gray-600 leading-relaxed">
              {listing.description || `This ${listing.bedrooms ?? ''}-bedroom, ${listing.bathrooms ?? ''}-bathroom property located in ${listing.city} offers premium finishes throughout.`}
            </p>
          )}
        </div>

        {/* Agent info */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Listing Agent</h3>
          <div className="flex items-center gap-4">
            {isLoading ? (
              <>
                <Skeleton variant="circle" width="48px" height="48px" />
                <div>
                  <Skeleton width="120px" height="14px" className="mb-2" />
                  <Skeleton width="160px" height="12px" />
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold">
                  {listing.realtor?.full_name?.slice(0, 2).toUpperCase() || 'AG'}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{listing.realtor?.full_name || 'Agent'}</div>
                  <div className="text-sm text-gray-400">Licensed Real Estate Agent</div>
                </div>
              </>
            )}
            <Button
              variant={isInactive ? 'outline' : 'primary'}
              size="sm"
              className="ml-auto"
              disabled={isLoading || isInactive}
              onClick={isInactive ? undefined : () => setContactModalOpen(true)}
            >
              {isInactive ? 'Inactive' : 'Contact Agent'}
            </Button>
          </div>
        </div>

        {/* Contact Agent Modal */}
        <Modal
          open={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          title={`Inquiry for ${listing?.title}`}
          footer={
            <div className="flex gap-2 justify-end w-full">
              <Button variant="ghost" onClick={() => setContactModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleContactAgent} isLoading={isContactLoading}>Send Inquiry</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Your Name *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none text-sm"
                  value={contactForm.name}
                  onChange={e => setContactForm({...contactForm, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address *</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none text-sm"
                  value={contactForm.email}
                  onChange={e => setContactForm({...contactForm, email: e.target.value})}
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none text-sm"
                  value={contactForm.phone}
                  onChange={e => setContactForm({...contactForm, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '').slice(0, 20)})}
                  placeholder="(555) 000-0000"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">I am interested in</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-white"
                  value={contactForm.interest}
                  onChange={e => setContactForm({...contactForm, interest: e.target.value})}
                >
                  <option value="Buying">Buying</option>
                  <option value="Renting">Renting</option>
                  <option value="Investing">Investing</option>
                  <option value="More Info">More Info</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Message</label>
              <textarea 
                className="w-full px-3 py-2 border rounded-lg focus:outline-none text-sm min-h-[100px] resize-none"
                value={contactForm.message}
                onChange={e => setContactForm({...contactForm, message: e.target.value})}
                placeholder="I'm interested in this property and would like to schedule a viewing..."
              />
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
