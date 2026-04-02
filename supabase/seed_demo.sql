-- =============================================================================
-- NLVListings - Demo Seed Data
-- =============================================================================
-- PREREQUISITE: Run schema.sql first.
--
-- These UUIDs must match auth users you create in Supabase Auth.
-- Create the following users in Supabase Dashboard > Authentication > Users
-- (or use the auth.users INSERT block at the bottom of this file for local dev):
--
--   admin@nlvlistings.com    / admin123
--   director@nlvlistings.com / director123
--   realtor@nlvlistings.com  / realtor123
--   lisa@nlvlistings.com     / realtor123
--   tom@nlvlistings.com      / realtor123
-- =============================================================================

-- =============================================================================
-- DEMO PROFILES
-- =============================================================================

INSERT INTO profiles (id, email, full_name, phone, role, status, territory_id, bio) VALUES
  (
    '00000000-0000-0000-0001-000000000001',
    'admin@nlvlistings.com',
    'Asmit Shah',
    '+1-555-000-0001',
    'admin',
    'active',
    NULL,
    'Platform administrator with full access to all NLV Listings features.'
  ),
  (
    '00000000-0000-0000-0001-000000000002',
    'director@nlvlistings.com',
    'Michael Torres',
    '+1-555-000-0002',
    'director',
    'active',
    '00000000-0000-0000-0000-000000000003',
    'Territory director for Texas covering Austin, Houston, and Dallas.'
  ),
  (
    '00000000-0000-0000-0001-000000000003',
    'realtor@nlvlistings.com',
    'Sarah Kim',
    '+1-555-000-0003',
    'realtor',
    'active',
    '00000000-0000-0000-0000-000000000001',
    'Licensed realtor specializing in luxury properties in Beverly Hills.'
  ),
  (
    '00000000-0000-0000-0001-000000000004',
    'lisa@nlvlistings.com',
    'Lisa Chen',
    '+1-555-000-0004',
    'realtor',
    'active',
    '00000000-0000-0000-0000-000000000002',
    'Miami-based realtor with 8 years of experience in waterfront properties.'
  ),
  (
    '00000000-0000-0000-0001-000000000005',
    'tom@nlvlistings.com',
    'Tom Garcia',
    '+1-555-000-0005',
    'realtor',
    'active',
    '00000000-0000-0000-0000-000000000003',
    'Austin realtor focused on tech-corridor residential and commercial listings.'
  )
ON CONFLICT (id) DO NOTHING;

-- Assign director_id to Texas territories
UPDATE territories
SET director_id = '00000000-0000-0000-0001-000000000002'
WHERE state = 'Texas'
  AND director_id IS NULL;

-- Set assigned_director_id for realtors in Texas territory
UPDATE profiles
SET assigned_director_id = '00000000-0000-0000-0001-000000000002'
WHERE territory_id IN (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000007'
)
AND role = 'realtor';

-- =============================================================================
-- DEMO SUBSCRIPTIONS
-- =============================================================================

INSERT INTO subscriptions (id, user_id, plan, status, next_billing_date) VALUES
  (
    '00000000-0000-0001-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',
    'dominator', 'active', NOW() + INTERVAL '30 days'
  ),
  (
    '00000000-0000-0001-0000-000000000002',
    '00000000-0000-0000-0001-000000000002',
    'pro', 'active', NOW() + INTERVAL '25 days'
  ),
  (
    '00000000-0000-0001-0000-000000000003',
    '00000000-0000-0000-0001-000000000003',
    'pro', 'active', NOW() + INTERVAL '18 days'
  ),
  (
    '00000000-0000-0001-0000-000000000004',
    '00000000-0000-0000-0001-000000000004',
    'dominator', 'active', NOW() + INTERVAL '12 days'
  ),
  (
    '00000000-0000-0001-0000-000000000005',
    '00000000-0000-0000-0001-000000000005',
    'starter', 'active', NOW() + INTERVAL '5 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Link subscriptions back to profiles
UPDATE profiles SET subscription_id = '00000000-0000-0001-0000-000000000001'
  WHERE id = '00000000-0000-0000-0001-000000000001';
UPDATE profiles SET subscription_id = '00000000-0000-0001-0000-000000000002'
  WHERE id = '00000000-0000-0000-0001-000000000002';
UPDATE profiles SET subscription_id = '00000000-0000-0001-0000-000000000003'
  WHERE id = '00000000-0000-0000-0001-000000000003';
UPDATE profiles SET subscription_id = '00000000-0000-0001-0000-000000000004'
  WHERE id = '00000000-0000-0000-0001-000000000004';
UPDATE profiles SET subscription_id = '00000000-0000-0001-0000-000000000005'
  WHERE id = '00000000-0000-0000-0001-000000000005';

-- =============================================================================
-- DEMO LISTINGS
-- =============================================================================

INSERT INTO listings (
  id, title, description, price, property_type, bedrooms, bathrooms, sqft,
  address, city, state, zip_code, territory_id, realtor_id,
  status, upgrade_type, approved_by, approved_at, views_count
) VALUES
  (
    '00000000-0000-0002-0000-000000000001',
    '3BR Luxury Home in Beverly Hills',
    'Stunning contemporary home in the heart of Beverly Hills. Features floor-to-ceiling windows, chef''s kitchen, and a resort-style pool. Walking distance to Rodeo Drive.',
    4500000, 'Single Family', 3, 2.5, 2800,
    '123 Maple Drive', 'Beverly Hills', 'California', '90210',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000003',
    'active', 'featured',
    '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '10 days',
    142
  ),
  (
    '00000000-0000-0002-0000-000000000002',
    'Modern Beachfront Condo in Miami',
    'Breathtaking ocean views from this 2-bedroom condo on South Beach. Private balcony, building amenities include gym, rooftop pool, and concierge service.',
    1250000, 'Condo', 2, 2, 1400,
    '456 Ocean Drive #12A', 'Miami', 'Florida', '33139',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0001-000000000004',
    'active', 'top',
    '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '7 days',
    287
  ),
  (
    '00000000-0000-0002-0000-000000000003',
    'Spacious Austin Family Home',
    'Perfect family home in highly rated school district. Open floor plan, large backyard, 3-car garage. Close to tech corridors, shopping and parks.',
    675000, 'Single Family', 4, 3, 3200,
    '789 Oak Street', 'Austin', 'Texas', '78701',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0001-000000000005',
    'active', 'standard',
    '00000000-0000-0000-0001-000000000002', NOW() - INTERVAL '5 days',
    95
  ),
  (
    '00000000-0000-0002-0000-000000000004',
    'Downtown Austin Loft',
    'Trendy industrial loft in the heart of downtown Austin. Exposed brick, original hardwood floors, rooftop access. Walking distance to 6th Street and Lady Bird Lake.',
    485000, 'Condo', 1, 1, 980,
    '101 Congress Ave #5B', 'Austin', 'Texas', '78701',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0001-000000000005',
    'pending', 'standard',
    NULL, NULL,
    0
  ),
  (
    '00000000-0000-0002-0000-000000000005',
    'Malibu Cliffside Estate',
    'Exclusive oceanfront estate perched on the Malibu cliffs. 5 bedrooms, private beach access, infinity pool, home theater and guest house included.',
    12500000, 'Single Family', 5, 5.5, 6500,
    '1 Pacific Coast Highway', 'Malibu', 'California', '90265',
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0001-000000000003',
    'draft', 'standard',
    NULL, NULL,
    0
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO LEADS
-- =============================================================================

INSERT INTO leads (
  id, source, listing_id, territory_id,
  assigned_realtor_id, assigned_director_id,
  contact_name, contact_email, contact_masked_email, contact_phone,
  budget_min, budget_max, interest_type, notes, score, status,
  attribution_expiry
) VALUES
  (
    '00000000-0000-0003-0000-000000000001',
    'website',
    '00000000-0000-0002-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000003',
    NULL,
    'David Nguyen', 'david.nguyen@email.com',
    mask_email('david.nguyen@email.com'),
    '+1-310-555-1234',
    3500000, 5000000, 'buy',
    'Interested in luxury homes for primary residence. Pre-approved for $4.8M.',
    85, 'showing',
    NOW() + INTERVAL '180 days'
  ),
  (
    '00000000-0000-0003-0000-000000000002',
    'referral',
    '00000000-0000-0002-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0001-000000000004',
    NULL,
    'Emily Watson', 'e.watson@corporatemail.com',
    mask_email('e.watson@corporatemail.com'),
    '+1-305-555-5678',
    1000000, 1500000, 'buy',
    'Relocating from NYC. Looking for investment + residence. Prefers waterfront.',
    72, 'contacted',
    NOW() + INTERVAL '170 days'
  ),
  (
    '00000000-0000-0003-0000-000000000003',
    'api',
    '00000000-0000-0002-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0001-000000000005',
    '00000000-0000-0000-0001-000000000002',
    'Robert Martinez', 'rmartinez@gmail.com',
    mask_email('rmartinez@gmail.com'),
    '+1-512-555-9012',
    550000, 750000, 'buy',
    'Young family, needs good schools nearby. First-time buyers.',
    60, 'assigned',
    NOW() + INTERVAL '180 days'
  ),
  (
    '00000000-0000-0003-0000-000000000004',
    'website',
    NULL,
    '00000000-0000-0000-0000-000000000002',
    NULL,
    NULL,
    'Jennifer Blake', 'jen.blake@outlook.com',
    mask_email('jen.blake@outlook.com'),
    '+1-305-555-3456',
    800000, 1200000, 'buy',
    'Cash buyer, no financing needed. Timeline: 60 days.',
    91, 'new',
    NULL
  ),
  (
    '00000000-0000-0003-0000-000000000005',
    'manual',
    '00000000-0000-0002-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0001-000000000005',
    '00000000-0000-0000-0001-000000000002',
    'Kevin Park', 'kpark@techcorp.io',
    mask_email('kpark@techcorp.io'),
    '+1-512-555-7890',
    400000, 600000, 'buy',
    'Software engineer relocating for new job. Needs home office space.',
    55, 'offer',
    NOW() + INTERVAL '155 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO PAYMENTS
-- =============================================================================

INSERT INTO payments (
  id, user_id, type, amount, status, description, listing_id
) VALUES
  (
    '00000000-0000-0004-0000-000000000001',
    '00000000-0000-0000-0001-000000000003',
    'subscription', 97.00, 'succeeded',
    'Pro plan - monthly subscription', NULL
  ),
  (
    '00000000-0000-0004-0000-000000000002',
    '00000000-0000-0000-0001-000000000004',
    'subscription', 197.00, 'succeeded',
    'Dominator plan - monthly subscription', NULL
  ),
  (
    '00000000-0000-0004-0000-000000000003',
    '00000000-0000-0000-0001-000000000003',
    'listing_upgrade', 49.00, 'succeeded',
    'Featured listing upgrade - Beverly Hills home',
    '00000000-0000-0002-0000-000000000001'
  ),
  (
    '00000000-0000-0004-0000-000000000004',
    '00000000-0000-0000-0001-000000000004',
    'listing_upgrade', 99.00, 'succeeded',
    'Top placement upgrade - Miami Beach condo',
    '00000000-0000-0002-0000-000000000002'
  ),
  (
    '00000000-0000-0004-0000-000000000005',
    '00000000-0000-0000-0001-000000000005',
    'subscription', 47.00, 'succeeded',
    'Starter plan - monthly subscription', NULL
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO COMMISSIONS
-- =============================================================================

INSERT INTO commissions (
  id, type, amount, source_transaction_id, recipient_user_id,
  override_user_id, status, property, listing_id, notes,
  approved_by, approved_at
) VALUES
  -- Director override from Sarah's subscription
  (
    '00000000-0000-0005-0000-000000000001',
    'subscription', 24.25,
    '00000000-0000-0004-0000-000000000001',
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0001-000000000001',
    'paid', NULL, NULL,
    'Director 25% override on Sarah Kim pro subscription ($97)',
    '00000000-0000-0000-0001-000000000001',
    NOW() - INTERVAL '25 days'
  ),
  -- Admin override from Sarah's subscription
  (
    '00000000-0000-0005-0000-000000000002',
    'subscription', 14.55,
    '00000000-0000-0004-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',
    NULL,
    'paid', NULL, NULL,
    'Admin 15% override on Sarah Kim pro subscription ($97)',
    '00000000-0000-0000-0001-000000000001',
    NOW() - INTERVAL '25 days'
  ),
  -- Listing upgrade commission for Sarah
  (
    '00000000-0000-0005-0000-000000000003',
    'listing', 41.65,
    '00000000-0000-0004-0000-000000000003',
    '00000000-0000-0000-0001-000000000003',
    NULL,
    'approved', '123 Maple Drive, Beverly Hills',
    '00000000-0000-0002-0000-000000000001',
    'Realtor share of featured listing upgrade ($49)',
    '00000000-0000-0000-0001-000000000001',
    NOW() - INTERVAL '8 days'
  ),
  -- Director commission from Lisa's subscription
  (
    '00000000-0000-0005-0000-000000000004',
    'subscription', 49.25,
    '00000000-0000-0004-0000-000000000002',
    '00000000-0000-0000-0001-000000000002',
    NULL,
    'payable', NULL, NULL,
    'Director 25% override on Lisa Chen dominator subscription ($197)',
    NULL, NULL
  ),
  -- Deal commission for Tom
  (
    '00000000-0000-0005-0000-000000000005',
    'deal', 8500.00,
    NULL,
    '00000000-0000-0000-0001-000000000005',
    '00000000-0000-0000-0001-000000000002',
    'pending', '789 Oak Street, Austin TX',
    '00000000-0000-0002-0000-000000000003',
    'Pending commission on Austin family home deal',
    NULL, NULL
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO NOTIFICATIONS
-- =============================================================================

INSERT INTO notifications (user_id, title, message, type, entity_id, read) VALUES
  (
    '00000000-0000-0000-0001-000000000003',
    'New Lead Assigned',
    'A new lead (David Nguyen, $4.8M budget) has been assigned to you in Beverly Hills.',
    'lead',
    '00000000-0000-0003-0000-000000000001',
    false
  ),
  (
    '00000000-0000-0000-0001-000000000003',
    'Listing Approved',
    'Your listing "3BR Luxury Home in Beverly Hills" has been approved and is now active.',
    'listing',
    '00000000-0000-0002-0000-000000000001',
    true
  ),
  (
    '00000000-0000-0000-0001-000000000004',
    'New Lead Assigned',
    'A new lead (Emily Watson) has been assigned to you in Miami.',
    'lead',
    '00000000-0000-0003-0000-000000000002',
    false
  ),
  (
    '00000000-0000-0000-0001-000000000004',
    'Listing Upgrade Confirmed',
    'Your Miami Beach condo has been upgraded to Top placement. It is now featured prominently.',
    'payment',
    '00000000-0000-0004-0000-000000000004',
    false
  ),
  (
    '00000000-0000-0000-0001-000000000002',
    'New Lead in Territory',
    'A new unassigned lead with $800K-$1.2M budget has entered your Florida territory.',
    'lead',
    '00000000-0000-0003-0000-000000000004',
    false
  ),
  (
    '00000000-0000-0000-0001-000000000005',
    'Offer Stage Update',
    'Lead Kevin Park has moved to offer stage on the Austin family home listing.',
    'lead',
    '00000000-0000-0003-0000-000000000005',
    false
  ),
  (
    '00000000-0000-0000-0001-000000000001',
    'Pending Listing Review',
    'Sarah Kim submitted a new listing "Downtown Austin Loft" for approval.',
    'listing',
    '00000000-0000-0002-0000-000000000004',
    false
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DEMO MESSAGES
-- =============================================================================

INSERT INTO messages (lead_id, sender_id, recipient_id, content, read) VALUES
  (
    '00000000-0000-0003-0000-000000000001',
    '00000000-0000-0000-0001-000000000003',
    '00000000-0000-0000-0001-000000000001',
    'Hi, I''ve reached out to David Nguyen and we have a showing scheduled for this Saturday at 2pm.',
    true
  ),
  (
    '00000000-0000-0003-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000003',
    'Great work Sarah! Make sure to highlight the outdoor entertaining space — it matches his wishlist.',
    false
  ),
  (
    '00000000-0000-0003-0000-000000000003',
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0001-000000000005',
    'Tom, please follow up with Robert Martinez today. He has a tight timeline and strong budget.',
    false
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DEMO AUDIT LOGS
-- =============================================================================

INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES
  (
    '00000000-0000-0000-0001-000000000001',
    'listing.approved',
    'listing',
    '00000000-0000-0002-0000-000000000001',
    '{"previous_status": "pending", "new_status": "active"}'
  ),
  (
    '00000000-0000-0000-0001-000000000001',
    'listing.approved',
    'listing',
    '00000000-0000-0002-0000-000000000002',
    '{"previous_status": "pending", "new_status": "active"}'
  ),
  (
    '00000000-0000-0000-0001-000000000002',
    'listing.approved',
    'listing',
    '00000000-0000-0002-0000-000000000003',
    '{"previous_status": "pending", "new_status": "active", "approved_by_role": "director"}'
  ),
  (
    '00000000-0000-0000-0001-000000000001',
    'lead.assigned',
    'lead',
    '00000000-0000-0003-0000-000000000001',
    '{"assigned_to": "00000000-0000-0000-0001-000000000003", "realtor_name": "Sarah Kim"}'
  ),
  (
    '00000000-0000-0000-0001-000000000001',
    'commission.paid',
    'commission',
    '00000000-0000-0005-0000-000000000001',
    '{"amount": 24.25, "recipient": "Michael Torres", "type": "director_override"}'
  )
ON CONFLICT DO NOTHING;
