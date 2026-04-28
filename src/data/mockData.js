// ─────────────────────────────────────────
//  NLVListings — Central Mock Data
// ─────────────────────────────────────────

export const LISTINGS = [
  { id: 1, title: '84 Palm Drive', address: '84 Palm Drive', city: 'Beverly Hills', state: 'CA', price: 2400000, beds: 5, baths: 4, sqft: 4200, status: 'featured', views: 428, agent: 'Sarah Kim', image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80', listed: 'Mar 15, 2026', submittedAt: '3 days ago' },
  { id: 2, title: '550 Horizon Way', address: '550 Horizon Way', city: 'Miami', state: 'FL', price: 1750000, beds: 6, baths: 5, sqft: 5100, status: 'featured', views: 312, agent: 'Lisa Chen', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80', listed: 'Mar 12, 2026', submittedAt: '5 days ago' },
  { id: 3, title: '1201 Oak Boulevard', address: '1201 Oak Boulevard', city: 'Austin', state: 'TX', price: 890000, beds: 4, baths: 3, sqft: 2800, status: 'active', views: 198, agent: 'Tom Garcia', image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80', listed: 'Mar 10, 2026' },
  { id: 4, title: '312 Elm Court', address: '312 Elm Court', city: 'Nashville', state: 'TN', price: 540000, beds: 3, baths: 2, sqft: 1900, status: 'pending', views: 0, agent: 'Mark Davis', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', listed: 'Mar 28, 2026', submittedAt: '1 day ago' },
  { id: 5, title: '742 Oak Lane', address: '742 Oak Lane', city: 'Austin', state: 'TX', price: 780000, beds: 3, baths: 2, sqft: 2200, status: 'active', views: 156, agent: 'Sarah Kim', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', listed: 'Mar 8, 2026' },
  { id: 6, title: '1 Sunset Ridge Court', address: '1 Sunset Ridge Ct', city: 'Malibu', state: 'CA', price: 3100000, beds: 7, baths: 6, sqft: 6800, status: 'featured', views: 524, agent: 'Anna Reeves', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80', listed: 'Mar 5, 2026' },
  { id: 7, title: '88 Maple Grove Road', address: '88 Maple Grove Rd', city: 'Houston', state: 'TX', price: 429000, beds: 3, baths: 2, sqft: 1650, status: 'active', views: 87, agent: 'Chris Wong', image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80', listed: 'Mar 20, 2026' },
  { id: 8, title: '21 Lakeview Terrace', address: '21 Lakeview Terrace', city: 'Dallas', state: 'TX', price: 1100000, beds: 4, baths: 3, sqft: 3400, status: 'active', views: 213, agent: 'James Park', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80', listed: 'Mar 3, 2026' },
  { id: 9, title: '4400 Biscayne Drive', address: '4400 Biscayne Drive', city: 'Miami Beach', state: 'FL', price: 2050000, beds: 5, baths: 4, sqft: 4800, status: 'featured', views: 389, agent: 'Lisa Chen', image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80', listed: 'Feb 28, 2026' },
  { id: 10, title: '933 Highland Park Blvd', address: '933 Highland Park Blvd', city: 'Los Angeles', state: 'CA', price: 1380000, beds: 4, baths: 3, sqft: 3100, status: 'draft', views: 0, agent: 'Sarah Kim', image: 'https://images.unsplash.com/photo-1600047509782-20d39509f26d?w=600&q=80', listed: 'Mar 27, 2026', submittedAt: '1 day ago' },
];

export const LEADS = [
  { id: 1, name: 'John Mitchell', email: 'j***@gmail.com', phone: '(512) 847-2291', status: 'new', budget: '$450K–$600K', interest: 'Single Family', source: 'website', assignedTo: 'Sarah Kim', score: 84, createdAt: 'Mar 28, 2026', notes: 'Looking for 4+ beds in North Austin. Pre-approved for $580K.' },
  { id: 2, name: 'Emma Torres', email: 'e***@yahoo.com', phone: '(305) 921-4400', status: 'contacted', budget: '$250K–$350K', interest: 'Condo', source: 'referral', assignedTo: 'Lisa Chen', score: 67, createdAt: 'Mar 27, 2026', notes: 'First-time buyer. Interested in Brickell area.' },
  { id: 3, name: 'Alex Park', email: 'a***@gmail.com', phone: '(615) 334-8812', status: 'new', budget: '$380K–$500K', interest: 'Townhouse', source: 'website', assignedTo: null, score: 55, createdAt: 'Mar 27, 2026', notes: null },
  { id: 4, name: 'Maria Lopez', email: 'm***@email.com', phone: '(310) 445-2100', status: 'showing', budget: '$1M–$1.5M', interest: 'Luxury Home', source: 'direct', assignedTo: 'Tom Garcia', score: 91, createdAt: 'Mar 26, 2026', notes: 'Cash buyer. Prefers gated communities in BH.' },
  { id: 5, name: 'Chris Wong', email: 'c***@gmail.com', phone: '(713) 892-5544', status: 'new', budget: '$300K–$450K', interest: 'House', source: 'partner', assignedTo: 'Mark Davis', score: 42, createdAt: 'Mar 26, 2026', notes: null },
  { id: 6, name: 'Priya Sharma', email: 'p***@gmail.com', phone: '(512) 774-9021', status: 'offer', budget: '$600K–$800K', interest: 'House', source: 'website', assignedTo: 'Sarah Kim', score: 95, createdAt: 'Mar 25, 2026', notes: 'Submitted offer on 742 Oak Lane. Counter pending.' },
  { id: 7, name: 'James Liu', email: 'j***@yahoo.com', phone: '(305) 881-2233', status: 'converted', budget: '$1.5M–$2M', interest: 'House', source: 'referral', assignedTo: 'Lisa Chen', score: 98, createdAt: 'Mar 24, 2026', notes: 'Closed on 4400 Biscayne Drive.' },
  { id: 8, name: 'Ana Reeves', email: 'a***@gmail.com', phone: '(615) 552-6699', status: 'lost', budget: '$200K–$300K', interest: 'Condo', source: 'website', assignedTo: 'Mark Davis', score: 22, createdAt: 'Mar 23, 2026', notes: 'Closed competitor deal. Budget too low for inventory.' },
];

export const COMMISSIONS = [
  { id: 'NLV-C-0421', property: '84 Palm Drive', city: 'Beverly Hills, CA', salePrice: 2400000, rate: 7, total: 168000, myShare: 117600, status: 'paid', closedAt: 'Mar 20, 2026' },
  { id: 'NLV-C-0420', property: '550 Horizon Way', city: 'Miami, FL', salePrice: 1750000, rate: 10, total: 175000, myShare: 122500, status: 'approved', closedAt: 'Mar 18, 2026' },
  { id: 'NLV-C-0419', property: '1201 Oak Boulevard', city: 'Austin, TX', salePrice: 890000, rate: 10, total: 89000, myShare: 62300, status: 'pending', closedAt: 'Mar 15, 2026' },
  { id: 'NLV-C-0418', property: '742 Oak Lane', city: 'Austin, TX', salePrice: 680000, rate: 15, total: 102000, myShare: 71400, status: 'pending', closedAt: 'Mar 14, 2026' },
  { id: 'NLV-C-0417', property: '21 Lakeview Terrace', city: 'Dallas, TX', salePrice: 1100000, rate: 10, total: 110000, myShare: 77000, status: 'paid', closedAt: 'Mar 10, 2026' },
];

export const REALTORS = [
  { id: 1, name: 'Sarah Kim', email: 'sarah@nlv.com', initials: 'SK', plan: 'Premium', region: 'Beverly Hills', listings: 18, leads: 43, revenue: 48200, monthRevenue: 8400, openLeads: 12, status: 'active' },
  { id: 2, name: 'Tom Garcia', email: 'tom@nlv.com', initials: 'TG', plan: 'Professional', region: 'Austin', listings: 12, leads: 28, revenue: 31400, monthRevenue: 5200, openLeads: 8, status: 'active' },
  { id: 3, name: 'Lisa Chen', email: 'lisa@nlv.com', initials: 'LC', plan: 'Premium', region: 'Miami', listings: 21, leads: 50, revenue: 28100, monthRevenue: 6100, openLeads: 14, status: 'active' },
  { id: 4, name: 'Mark Davis', email: 'mark@nlv.com', initials: 'MD', plan: 'Professional', region: 'Nashville', listings: 8, leads: 19, revenue: 21800, monthRevenue: 3200, openLeads: 5, status: 'active' },
  { id: 5, name: 'Chris Wong', email: 'chris@nlv.com', initials: 'CW', plan: 'Starter', region: 'Houston', listings: 3, leads: 7, revenue: 8200, monthRevenue: 1400, openLeads: 3, status: 'trial' },
  { id: 6, name: 'Anna Reeves', email: 'anna@nlv.com', initials: 'AR', plan: 'Professional', region: 'Malibu', listings: 11, leads: 24, revenue: 19600, monthRevenue: 4100, openLeads: 7, status: 'active' },
];

export const ACTIVITY = [
  { type: 'approval', text: 'Sarah Kim approved listing "84 Palm Drive, Beverly Hills"', time: '2 minutes ago' },
  { type: 'payment',  text: 'New subscription: Tom Garcia → Professional Plan ($79/mo)', time: '15 minutes ago' },
  { type: 'lead',     text: 'Lead "John Mitchell" assigned to Lisa Chen by Director', time: '1 hour ago' },
  { type: 'listing',  text: 'Listing "312 Elm Court" rejected — insufficient photo quality', time: '2 hours ago' },
  { type: 'commission', text: 'Commission $77,000 marked as Paid for James Park', time: '3 hours ago' },
  { type: 'lead',     text: 'New lead from website: Emma Torres — Miami, FL', time: '4 hours ago' },
];

export const PLANS = [
  {
    name: 'Free',
    price: 'Free',
    period: 'Forever',
    description: 'Perfect for getting started. Explore the platform with basic features.',
    features: ['Up to 2 listings', '5 lead captures/mo', 'Basic analytics', 'Email support'],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$29',
    period: 'per month',
    description: 'For solo realtors building their pipeline.',
    features: ['Up to 10 listings', '50 lead captures/mo', '1 territory', 'Advanced analytics', 'Priority email support'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$79',
    period: 'per month',
    description: 'For growing realtors who need more reach and automation.',
    features: ['Up to 25 listings', '200 lead captures/mo', '3 territories', '2 featured spots', 'Phone + email support', 'Commission tracking'],
    cta: 'Most Popular',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For large brokerages with custom requirements and SLAs.',
    features: ['Unlimited listings', 'Unlimited leads', 'Unlimited territories', 'Custom analytics', 'Dedicated account manager', 'API access', 'White-label option'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];
