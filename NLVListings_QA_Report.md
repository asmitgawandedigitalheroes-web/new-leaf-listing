# NLVListings Platform — QA Audit Report

**Date:** April 1, 2026
**Auditor:** Automated End-to-End QA (Claude)
**Environment:** Local dev (`http://localhost:5173`), Supabase project `jrpenintcikamlpzxwdm`
**Stack:** React 19.2.4 · Vite 8.0.1 · Supabase 2.100.1 · Stripe JS 9.0.0 · React Router v7 · Tailwind v4

---

## Executive Summary

The NLVListings platform is functionally operational for all three role dashboards (Admin, Director, Realtor). Core features — listing management, lead routing, role-based access control, commission settings, billing display, and audit logging — are working at the UI level. However, **3 critical and 5 high-severity bugs** require immediate attention before any production launch. The most severe issues are a raw contact-email leak on realtor lead cards (violating the platform's core privacy model), missing Stripe webhook signature verification, and three truncated service files that render back-end services non-functional.

---

## Severity Legend

| Level | Label | Criteria |
|-------|-------|----------|
| 🔴 P0 | Critical | Data breach, payment fraud vector, or app crash |
| 🟠 P1 | High | Core feature broken or serious security gap |
| 🟡 P2 | Medium | Wrong data displayed, UX broken, spec deviation |
| 🔵 P3 | Low | Minor cosmetic or informational inconsistency |

---

## Phase 1 — Database Schema Review

### Schema file: `supabase/schema.sql`

**✅ Passing**
- 15 tables present: `territories`, `profiles`, `listings`, `leads`, `subscriptions`, `payments`, `commissions`, `audit_logs`, `notifications`, `messages`, `crm_configs`, `crm_sync_queue`, `platform_settings`, `pricing_plans`, `listing_prices`
- Foreign key constraints properly defined throughout
- `audit_logs` table records actor, action, entity, and metadata — confirmed live with 53 events
- Commission rates stored in `platform_settings` (Director 25%, Admin Override 15%, Platform Fee 15%, Lead Attribution 180 days) — confirmed correct in Admin Settings UI
- `subscriptions` has duplicate-active guard via `(user_id, status)` unique constraint (BUG-001 fix present)
- Integer-cent arithmetic used in commission calculations to avoid floating-point errors (BUG-026 fix)

**🔴 BUG-S01 — `listings.status` CHECK missing required states**
The schema CHECK constraint is: `status IN ('draft','pending','active','sold','expired','archived')`. Missing values: `'featured'`, `'top_placement'`, `'under_contract'`. These statuses appear in the application code and UI (Admin Listings shows "Featured 3" tab) but any DB write with these values will throw a constraint violation at the database level.

**🟡 BUG-S02 — Role enum does not match spec**
`profiles.role CHECK (role IN ('admin','director','realtor'))`. The spec mentions `super_admin` and `regional_director`. The Admin UI renders the role as "SUPER ADMIN" and Director as "DIRECTOR" but the underlying DB values remain `admin`/`director`. This is cosmetic only if the code consistently uses the DB values, but it's a spec deviation.

**🟡 BUG-S03 — Subscription plan names differ from spec**
DB: `plan IN ('starter','pro','dominator','sponsor')`. Spec names: `'pro_agent'`, `'territory_sponsor'`. Sponsor plan is priced at $0 in seed data with no clear purpose.

**🟡 BUG-S04 — Lead contact data stored as flat columns, not JSONB**
Schema uses `contact_name`, `contact_email`, `contact_phone` as individual columns. The spec describes a `contact_info JSONB` field. This creates a structural mismatch between the spec and the implementation.

**🟡 BUG-S05 — `leads.attribution_expiry` vs spec's `expires_at`**
The field is named `attribution_expiry` in the DB but `expires_at` in spec references. Not a functional bug if the app code consistently uses the DB name, but causes spec/doc inconsistency.

---

## Phase 2 — RLS Policy Audit

**✅ Passing**
- `profiles` table: users can only update their own profile (correct)
- `listings` insert: only authenticated users can create listings
- `commissions` read: users can only read their own commissions
- Supabase Edge Functions: `create-checkout-session` requires Authorization header (returns 401 without it)
- Edge Function CORS: restricted to allowlist via `ALLOWED_ORIGINS` env var
- Checkout price fetched server-side from DB — client cannot tamper with price (BUG-031 fix)

**🟠 BUG-R01 — `leads_insert_public` policy: `WITH CHECK (true)`**
Any unauthenticated user can INSERT arbitrary lead records into the `leads` table. There is no validation on required fields, no rate limiting at the RLS level, and no proof of identity required. This allows spam flooding and data pollution. A minimum `WITH CHECK` should validate required fields or require a captcha token.

**🟠 BUG-R02 — `profiles_select_authenticated` is overly permissive**
Any authenticated user (regardless of role) can SELECT all rows in the `profiles` table. A realtor can read the full profile of every other user on the platform, including admin and director email addresses, phone numbers, and territory assignments. Should be scoped: users read own profile; directors read profiles in their territory; admins read all.

**🟡 BUG-R03 — No director policy to read realtor subscriptions**
Directors cannot query subscription plans for realtors in their territory (confirmed: `My Realtors` page shows `—` in the Plan column). A scoped SELECT policy is needed: `WHERE user_id IN (SELECT id FROM profiles WHERE territory_id = director_territory_id)`.

---

## Phase 3 — Authentication & Authorization

**✅ Passing**
- Login with all three demo roles works correctly
- After login, users are redirected to role-appropriate dashboards
- `ProtectedRoute` correctly returns 403 "Access Denied" with role name displayed
- Director accessing `/admin/dashboard` → blocked with "Your role (director) does not have permission"
- Realtor accessing `/admin/dashboard` → blocked
- Forgot password flow sends reset email (UI confirmed)
- Signup requires terms checkbox before submission

**🔴 BUG-A01 — `AuthContext.jsx` file is truncated**
`src/context/AuthContext.jsx` ends at line 334 with a bare `return` keyword — the JSX return statement and closing tag for `AuthProvider` are missing. Vite reports `Expected } but found EOF` during pre-bundle scan. While the app currently runs (Vite falls back to on-demand compilation), this file will fail to compile in any strict build context and will cause a production build failure (`npm run build`). This is a **build-breaking bug**.

**🟠 BUG-A02 — Demo credentials hardcoded in source**
`LoginPage.jsx` lines 26–29 contain plain-text fallback credentials:
```
admin@nlvlistings.com / admin123
director@nlvlistings.com / director123
realtor@nlvlistings.com / realtor123
```
These are only rendered in `IS_DEV` mode, but they exist in the source repository. Any developer with repo access has these credentials. If these accounts exist in a staging environment accessible from the internet, this is a credential exposure risk. Credentials should be injected via `.env.local` only — never hardcoded as fallbacks.

**🟡 BUG-A03 — Signup UI shows "Regional Director" role option that is silently ignored**
The signup form (Step 1) offers "Regional Director" as a role selection. However, `AuthContext.signup()` hardcodes `ENFORCED_ROLE = 'realtor'` and ignores the user's selection. This is misleading UX — a user who selects "Regional Director" believes they are registering as a director, but receives the `realtor` role. The option should be removed from the UI or a clear message displayed explaining how Directors are assigned.

**🟡 BUG-A04 — `company` field collected at signup but never saved**
The signup form (Step 1) has a "Company / Brokerage" input field. The `AuthContext.signup()` function calls `supabase.from('profiles').upsert({...})` but does not include the `company` field in the payload. All company names entered at signup are silently discarded.

**🟡 BUG-A05 — Session persists across sign-out in some navigation paths**
After clicking "Sign Out", navigating directly to an authenticated route (e.g. `/listing/:id`) without waiting for the router redirect occasionally results in auto-login as a different demo user ("James Park"). This suggests a race condition in the AuthContext session teardown sequence. Reproduction was intermittent.

---

## Phase 4 — Listing Lifecycle

**✅ Passing**
- Realtor can create listings via 4-step modal (Title → Details → Media → Submit)
- Listing appears as `draft` after creation
- "Submit for Review" changes status to `pending`
- Admin Listings page shows pending listing with "Approve" / "Reject" buttons
- Approved listing transitions to `active` status and appears on public browse page
- Admin can also toggle "Feature" and "Archive" on active listings
- Listing detail page shows ACTIVE status badge, price, beds/baths/sqft, description
- Realtor owner sees "Mark Under Contract", "Mark Sold", "Edit" buttons on their listings
- Non-owner realtor does not see management buttons on others' listings
- Public browse page shows 8 listings correctly with search/filter UI
- Filter by Listing Tier (Top Picks / Featured / All Properties) present

**🟠 BUG-L01 — No price or title validation on listing creation**
Realtors can submit a listing with `$0` price (confirmed: a `$0` PENDING listing by Sarah Kim exists in Admin panel). There is no client-side or visible server-side validation preventing zero or negative prices, empty titles, or missing required fields beyond the HTML `required` attribute.

**🟡 BUG-L02 — Listing agent name blank on public detail page**
The "Listing Agent" section of `/listing/:id` displays the label "Agent" instead of the realtor's actual name. When logged in as the owning realtor, the correct name appears. When viewing the same listing as a different authenticated user or unauthenticated visitor, the name shows as "Agent". This is a profile join bug in the listing detail query.

**🟡 BUG-L03 — "Contact Agent" button is non-functional**
Clicking the "Contact Agent" button on the public listing detail page produces no result — no modal, no form, no navigation. The lead capture flow for public visitors is completely broken. This means no new leads can be generated from the public site.

**🟡 BUG-L04 — Draft listings have "Submit for Approval" button in Admin view**
Admin should not need to submit listings on behalf of realtors. The Admin Listings page shows a "Submit for Approval" button for DRAFT listings (owned by any agent). This may be intentional for admin overrides but is not documented in spec.

---

## Phase 5 — Lead Management & Privacy

**✅ Passing**
- Lead drawer (`LeadDrawer.jsx`) correctly masks emails: `j****@domain.com`
- Lead drawer correctly masks phones: `(•••) •••-4567`
- `ContactGate` component logs to audit_log when a realtor requests contact info instead of exposing raw data
- 180-day attribution lock enforced in `lead.service.ts` (`assignLead()` checks `attribution_expiry`)
- Director Leads page shows Kanban-style board: New / Assigned / Contacted / Closed columns
- Admin can view all leads across all territories

**🔴 BUG-P01 — Raw contact emails exposed on realtor lead cards**
`RealtorLeadsPage.jsx` renders lead list cards that display `contact_email` directly as a subtitle (e.g. `second@test.com`, `success@test.com`, `admin_manual@test.com`). This bypasses the masking logic that only exists inside the `LeadDrawer` popup. Any realtor can see buyer email addresses simply by viewing their leads list, without ever opening the drawer. This directly violates the platform's core rule that realtors cannot access buyer contact information.

**Fix required:** Replace `lead.contact_email` in the card subtitle with `maskEmail(lead.contact_email)` from `LeadDrawer.jsx`, or use a non-identifying field such as lead name initials or a reference ID.

**🟡 BUG-P02 — Lead cards show raw name in list view**
Related to BUG-P01: the lead list also displays the lead's full `contact_name` without masking (e.g. "John Smith"). Depending on privacy requirements, this should also be masked or replaced with initials/ID.

---

## Phase 6 — Subscriptions & Billing

**✅ Passing**
- Billing page renders: Current Plan, Plan Usage (Active Listings, Assigned Leads), Invoice History
- Subscriptions admin page shows MRR ($225), Active Subs (5), Past Due (0), Churn Rate (0%)
- Plan distribution chart visible: Starter 1, Pro 2, Dominator 2
- Admin can Cancel subscriptions from the Subscriptions page
- Subscription guard exists in `subscription.service.ts`: blocks duplicate active subscriptions
- Feature access map present: 'listings.featured' requires 'pro'/'dominator'/'sponsor'

**🟡 BUG-B01 — Plan name/price mismatch across Billing, Profile, and Users pages**
Sarah Kim's Billing page shows "Pro — $29/Mo". However, the schema seed data defines: Starter = $29/mo, Pro = $79/mo, Dominator = $199/mo. The UI is displaying "Pro" as the plan name but using the "Starter" price. Similarly, Admin Users shows "Pro" for Sarah Kim but "Starter" for Tom Garcia (at $29). Either the plan names in the DB are incorrect for these records, or the price display logic has a lookup error. This causes financial misrepresentation to users.

**🟡 BUG-B02 — All subscription Stripe IDs show `—` (no Stripe integration in test data)**
All 5 subscription records in the Subscriptions admin page show `—` for Stripe ID. Subscriptions were created directly in the DB without going through Stripe checkout. The Stripe integration has not been end-to-end tested with actual checkout flows.

**🔴 BUG-B03 — `STRIPE_WEBHOOK_SECRET` missing from `.env`**
Line 12 of `.env`: `# STRIPE_WEBHOOK_SECRET=whsec_...` is commented out. The `stripe-webhook` Edge Function verifies webhook signatures using this secret. Without it, signature verification will fail in production — either rejecting all legitimate Stripe events, or (if the verification is bypassed on error) accepting forged events. Both outcomes are catastrophic for payment integrity.

---

## Phase 7 — Commission Engine

**✅ Passing**
- Commission rates stored in `platform_settings` table, editable via Admin Settings UI
- Default rates: Director 25%, Admin Override 15%, Platform Fee 15%
- Lead Attribution window: 180 days (confirmed in settings and Terms of Service)
- Realtor Commissions page shows: This Month, Pending, YTD, Upcoming metrics
- Director Commissions page shows: This Month, YTD Earnings, Pending, Payable + Earnings Timeline chart
- Commission history table present on both pages (empty in test data)
- Payout Schedule: Monthly (confirmed in settings)
- Integer-cent arithmetic used (BUG-026 fix present in `commission.service.ts`)

**🟠 BUG-C01 — `commission.service.ts` is truncated**
The file ends at line 285 in the middle of a JSDoc comment for `processTransactionCommissions()`. The `processTransactionCommissions` function body is absent. Since the Stripe webhook (`stripe-webhook/index.ts`) calls `process_transaction_commissions()` as a Postgres RPC (PL/pgSQL), the TypeScript service layer is incomplete and any TypeScript-side commission processing will fail silently.

---

## Phase 8 — CRM & Service Layer

**🟠 BUG-CR01 — `routing.service.ts` is truncated**
File ends at line 261 with an unterminated string literal: `'lead.a`. Lead routing logic is incomplete — any import of this module will throw a parse/syntax error.

**🟠 BUG-CR02 — `crm.service.ts` is truncated**
File ends at line 261 in the middle of a JSDoc comment inside `handleIncomingWebhook()`. CRM webhook processing (GoHighLevel, SalesPro, LEAP) is non-functional.

**🟡 BUG-CR03 — CRM integration status not visible in Admin Settings**
The Admin Settings page shows Platform Settings and Commission Rules, but there is no section for CRM integration status or configuration (no GoHighLevel / SalesPro / LEAP connection UI). The `crm_configs` table exists in the DB but has no admin management interface.

---

## Phase 9 — Dashboard Testing Summary

### Admin Dashboard ✅
- Platform Overview: 11 listings, 7 active leads, $225/mo, 1 pending approval
- Users page: 6 users with role/territory/plan/status displayed
- Listings page: All listings with status tabs (Active 8, Featured 3, Pending 1, Draft 1), approve/reject/feature actions work
- Audit Log: 53 events, filterable by action/user/entity/date, Export CSV button present
- Settings: Platform name, tagline, support email, commission rates, maintenance mode toggle

### Director Dashboard ✅
- Overview: Region Listings 0, Unassigned Leads 0, Active Realtors 1, Total Leads 0
- My Leads: Kanban board (New/Assigned/Contacted/Closed) — all empty for Michael Torres
- My Realtors: Shows Tom Garcia (Active, Starter plan) — plan visible here but not in Realtor list
- My Commissions: This Month/YTD/Pending/Payable all $0, Earnings Timeline chart, Request Payout button
- Reports: Territory Reports with performance metrics (skeleton loading state observed)

### Realtor Dashboard ✅
- Overview stats, My Listings table, My Leads table with "View All" links
- My Listings: Create, edit, submit for approval, view detail all functional
- My Leads: Lead cards display with status, score, budget, interest — contact info partially masked (BUG-P01)
- Commissions: $0 across all metrics, How Commissions Work explainer visible
- Billing: Current Plan (Pro $29/mo — see BUG-B01), Plan Usage, Invoice History
- Profile: Name, email, phone, territory (inconsistency — see BUG-P03 below), account status, subscription summary

**🟡 BUG-P03 — Territory display inconsistency: Profile page vs Admin Users page**
Sarah Kim's Profile page (`/realtor/profile`) shows Territory: "Not assigned". The Admin Users page shows Sarah Kim's territory as "Beverly Hills, California". The profile page query is failing to join or display the territory name while the admin query retrieves it correctly.

---

## Phase 10 — Security Edge Cases

**✅ Passing**
- **Role escalation blocked (Director → Admin):** Navigating to `/admin/dashboard` as a Director returns 403 "Access Denied — ACCESS RESTRICTED TO: ADMIN"
- **Route protection works for all admin sub-routes** verified
- **Stripe price cannot be manipulated client-side:** `create-checkout-session` Edge Function fetches price from DB server-side
- **Webhook auth required:** Edge Function returns 401 without Authorization header

**🟡 BUG-SEC01 — Unauthenticated access to `/listing/:id` auto-logs in ghost user**
After signing out and navigating to `/listing/:id`, the app renders with a logged-in state showing "James Park — REALTOR" in the sidebar. This user was not explicitly logged in — the session appeared without any credential entry. Suggests either a cached session token was not fully cleared, or a shared/test token is being reused. Requires session teardown audit.

**🟡 BUG-SEC02 — No rate limiting visible on lead insert endpoint**
The `leads_insert_public` RLS policy (`WITH CHECK (true)`) combined with no observable rate limiting means the lead submission endpoint (if it were working) could be abused for bulk spam insertion. Supabase Edge Functions or a Cloudflare WAF rule should enforce rate limiting.

---

## Phase 11 — Legal Pages

**✅ Passing**
- `/terms-of-service` — Renders correctly, Last updated March 30, 2026
  - Sections: Acceptance of Terms, Lead Protection (180-Day Rule), Non-Circumvention, Commission Structure, Platform Use, Termination, Governing Law
- `/privacy-policy` — Renders correctly, Last updated March 30, 2026
  - Sections: Data Collection, Data Usage, Data Security, Cookies & Tracking, User Rights, Contact
- Terms of Service checkbox required at signup Step 3 (confirmed required before form submit enabled)
- Both pages accessible without authentication

---

## Complete Bug Registry

| ID | Severity | Category | Description |
|----|----------|----------|-------------|
| BUG-A01 | 🔴 P0 | Auth | `AuthContext.jsx` truncated at line 334 — production build will fail |
| BUG-P01 | 🔴 P0 | Privacy | Raw `contact_email` exposed on realtor lead list cards |
| BUG-B03 | 🔴 P0 | Payments | `STRIPE_WEBHOOK_SECRET` missing from `.env` — webhook signature validation broken |
| BUG-R01 | 🟠 P1 | Security | `leads_insert_public` RLS: `WITH CHECK (true)` allows unauthenticated lead spam |
| BUG-R02 | 🟠 P1 | Security | `profiles_select_authenticated` allows any user to read all profiles |
| BUG-C01 | 🟠 P1 | Commission | `commission.service.ts` truncated — `processTransactionCommissions()` body missing |
| BUG-CR01 | 🟠 P1 | CRM | `routing.service.ts` truncated — unterminated string at line 261 |
| BUG-CR02 | 🟠 P1 | CRM | `crm.service.ts` truncated — `handleIncomingWebhook()` body missing |
| BUG-L03 | 🟠 P1 | Listings | "Contact Agent" button on listing detail page is non-functional — lead capture broken |
| BUG-A02 | 🟡 P2 | Auth | Demo credentials hardcoded in source (`admin123`, `director123`, `realtor123`) |
| BUG-A03 | 🟡 P2 | Auth | "Regional Director" signup option silently ignored — all signups become realtor |
| BUG-A04 | 🟡 P2 | Auth | `company` field collected at signup but not saved to profile |
| BUG-A05 | 🟡 P2 | Auth | Session persists after sign-out (intermittent race condition) |
| BUG-B01 | 🟡 P2 | Billing | Plan name/price mismatch — "Pro" shown at $29/mo (should be $79/mo) |
| BUG-B02 | 🟡 P2 | Billing | All subscription Stripe IDs are `—` — no real Stripe data |
| BUG-L01 | 🟡 P2 | Listings | No validation prevents $0 price or empty title on listing creation |
| BUG-L02 | 🟡 P2 | Listings | Listing agent name shows "Agent" instead of actual name for non-owners |
| BUG-L04 | 🟡 P2 | Listings | Admin can "Submit for Approval" on behalf of realtors — unintended? |
| BUG-P02 | 🟡 P2 | Privacy | Raw `contact_name` visible on lead cards (should be masked or initialed) |
| BUG-P03 | 🟡 P2 | Profile | Territory shows "Not assigned" on Realtor Profile but correct in Admin Users |
| BUG-R03 | 🟡 P2 | Security | Director cannot see realtor subscription plans (RLS gap) |
| BUG-S01 | 🟡 P2 | Schema | `listings.status` CHECK missing 'featured', 'top_placement', 'under_contract' |
| BUG-S04 | 🟡 P2 | Schema | Lead contact data uses flat columns, not JSONB `contact_info` per spec |
| BUG-SEC01 | 🟡 P2 | Security | Ghost auto-login after sign-out when navigating to listing detail |
| BUG-SEC02 | 🟡 P2 | Security | No rate limiting on public lead insert endpoint |
| BUG-CR03 | 🟡 P2 | CRM | No CRM integration config UI in Admin Settings |
| BUG-S02 | 🔵 P3 | Schema | Role enum values differ from spec (`admin` vs `super_admin`) |
| BUG-S03 | 🔵 P3 | Schema | Subscription plan names differ from spec (`pro` vs `pro_agent`) |
| BUG-S05 | 🔵 P3 | Schema | `attribution_expiry` vs spec's `expires_at` field naming |

---

## Recommended Fix Priority

### Before any production launch (P0 blockers)
1. **BUG-A01** — Complete the truncated `AuthContext.jsx` file and verify `npm run build` passes
2. **BUG-P01** — Mask `contact_email` on lead list cards using `maskEmail()` from `LeadDrawer.jsx`
3. **BUG-B03** — Add `STRIPE_WEBHOOK_SECRET=whsec_...` to production environment secrets

### Before beta launch (P1 blockers)
4. **BUG-R01** — Tighten `leads_insert_public` RLS with field validation or move inserts to an Edge Function with captcha
5. **BUG-R02** — Scope `profiles_select_authenticated` to own-row + territory-based reads
6. **BUG-CR01/CR02/C01** — Restore complete file content for `routing.service.ts`, `crm.service.ts`, `commission.service.ts`
7. **BUG-L03** — Implement "Contact Agent" modal with lead submission form

### Before GA (P2 items)
8. **BUG-B01** — Audit all subscription records and fix plan name/price display
9. **BUG-A03** — Remove "Regional Director" from signup form or explain it's admin-assigned
10. **BUG-L01** — Add price validation (min $1,000) and title min-length to listing creation
11. **BUG-L02** — Fix agent name join in listing detail query for non-owner viewers
12. **BUG-P03** — Fix territory display in Realtor Profile page
13. **BUG-S01** — Add missing listing statuses to schema CHECK constraint
14. **BUG-A04** — Save `company` field from signup to `profiles`

---

## Environment Notes

- Dev server requires running from `/tmp/nlvlistings/` (copied project) due to EPERM on the mounted workspace FS
- Three files have Vite parse errors during pre-bundle scan: `AuthContext.jsx`, `routing.service.ts`, `crm.service.ts`
- `npm run build` has not been tested; expected to fail due to BUG-A01
- Stripe is in test mode (`sk_test_...`); no real payments have been processed
- SMTP is configured to Gmail (`asmitgawandedigitalheroes@gmail.com`); email delivery untested

---

*Report generated via automated browser QA + static code analysis. All screenshots and console logs were captured during live session on April 1, 2026.*
