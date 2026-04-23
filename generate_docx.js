const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  ExternalHyperlink, TableOfContents
} = require('docx');
const fs = require('fs');

// ── helpers ──────────────────────────────────────────────────────────────────
const PURPLE = '6B3FE7';
const BLUE   = '2D9CDB';
const DARK   = '0d0d1a';
const GRAY   = '555555';
const WHITE  = 'FFFFFF';
const LIGHT_PURPLE = 'F3EFFF';
const LIGHT_BLUE   = 'E8F4FD';
const LIGHT_WARN   = 'FFF8E6';

const CW = 9360; // content width DXA (A4 with 1" margins)

function h(level, text) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: level === HeadingLevel.HEADING_1 ? 36 : level === HeadingLevel.HEADING_2 ? 28 : 24 })]
  });
}

function p(text, opts = {}) {
  const runs = [];
  // parse **bold** and `code` inline
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, font: 'Arial', size: 22, color: DARK }));
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(new TextRun({ text: part.slice(1, -1), font: 'Courier New', size: 20, color: PURPLE, shading: { fill: 'F0EBFF', type: ShadingType.CLEAR } }));
    } else if (part) {
      runs.push(new TextRun({ text: part, font: 'Arial', size: 22, color: opts.color || '333333' }));
    }
  }
  return new Paragraph({
    children: runs,
    spacing: { before: 60, after: 100 },
    ...opts
  });
}

function code(text) {
  const lines = text.split('\n');
  return lines.map(line => new Paragraph({
    children: [new TextRun({ text: line || ' ', font: 'Courier New', size: 18, color: 'D0D0D0' })],
    spacing: { before: 0, after: 0 },
    indent: { left: 200 },
    shading: { fill: '1A1A2E', type: ShadingType.CLEAR }
  }));
}

function callout(text, type = 'info') {
  const colors = { info: PURPLE, note: BLUE, warn: 'B07800' };
  const fills  = { info: 'F7F6FF', note: 'F3F9FF', warn: LIGHT_WARN };
  const col = colors[type] || PURPLE;
  const fill = fills[type] || 'F7F6FF';
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const runs = parts.map(part =>
    part.startsWith('**') && part.endsWith('**')
      ? new TextRun({ text: part.slice(2, -2), bold: true, font: 'Arial', size: 20, color: col })
      : new TextRun({ text: part, font: 'Arial', size: 20, color: '333333' })
  );
  return new Paragraph({
    children: runs,
    spacing: { before: 120, after: 120 },
    indent: { left: 360 },
    border: { left: { style: BorderStyle.THICK, size: 12, color: col, space: 8 } },
    shading: { fill, type: ShadingType.CLEAR }
  });
}

function bullet(items) {
  return items.map(item => new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text: item, font: 'Arial', size: 22, color: '333333' })],
    spacing: { before: 40, after: 40 }
  }));
}

function flowStep(num, text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  const runs = [new TextRun({ text: `${num}.  `, bold: true, font: 'Arial', size: 22, color: PURPLE })];
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, font: 'Arial', size: 22, color: DARK }));
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(new TextRun({ text: part.slice(1, -1), font: 'Courier New', size: 20, color: PURPLE }));
    } else if (part) {
      runs.push(new TextRun({ text: part, font: 'Arial', size: 22, color: '333333' }));
    }
  }
  return new Paragraph({ children: runs, spacing: { before: 60, after: 60 }, indent: { left: 200 } });
}

function br() { return new Paragraph({ children: [new PageBreak()] }); }
function spacer() { return new Paragraph({ children: [new TextRun('')], spacing: { before: 80, after: 80 } }); }

function tblBorder() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
  return { top: b, bottom: b, left: b, right: b };
}

function makeTable(headers, rows, colWidths) {
  const totalCols = headers.length;
  const defaultW = Math.floor(CW / totalCols);
  const widths = colWidths || headers.map(() => defaultW);

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: PURPLE, type: ShadingType.CLEAR },
      borders: tblBorder(),
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, color: WHITE, font: 'Arial', size: 18 })]
      })]
    }))
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => {
      const parts = String(cell).split(/(`[^`]+`)/g);
      const runs = parts.map(part =>
        part.startsWith('`') && part.endsWith('`')
          ? new TextRun({ text: part.slice(1, -1), font: 'Courier New', size: 18, color: PURPLE, shading: { fill: LIGHT_PURPLE, type: ShadingType.CLEAR } })
          : new TextRun({ text: part, font: 'Arial', size: 20, color: '444444' })
      );
      return new TableCell({
        width: { size: widths[ci], type: WidthType.DXA },
        shading: { fill: ri % 2 === 1 ? 'FAF9FF' : WHITE, type: ShadingType.CLEAR },
        borders: tblBorder(),
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({ children: runs })]
      });
    })
  }));

  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...dataRows]
  });
}

function sectionDivider(num, title, subtitle) {
  return [
    br(),
    new Paragraph({
      children: [new TextRun({ text: `SECTION ${num}`, font: 'Arial', size: 20, color: BLUE, bold: true, allCaps: true })],
      spacing: { before: 120, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PURPLE } }
    }),
    new Paragraph({
      children: [new TextRun({ text: title, font: 'Arial', size: 52, bold: true, color: DARK })],
      spacing: { before: 120, after: 100 }
    }),
    subtitle ? new Paragraph({
      children: [new TextRun({ text: subtitle, font: 'Arial', size: 22, color: GRAY, italics: true })],
      spacing: { before: 0, after: 240 }
    }) : spacer()
  ];
}

function kvTable(pairs, w1 = 3600, w2 = 5760) {
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [w1, w2],
    rows: pairs.map(([k, v], i) => new TableRow({
      children: [
        new TableCell({
          width: { size: w1, type: WidthType.DXA },
          shading: { fill: 'F7F6FF', type: ShadingType.CLEAR },
          borders: tblBorder(),
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: k, font: 'Courier New', size: 18, color: PURPLE, bold: true })] })]
        }),
        new TableCell({
          width: { size: w2, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? WHITE : 'FAF9FF', type: ShadingType.CLEAR },
          borders: tblBorder(),
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: v, font: 'Arial', size: 20, color: '444444' })] })]
        })
      ]
    }))
  });
}

// ── Content Sections ──────────────────────────────────────────────────────────

const coverContent = [
  new Paragraph({
    children: [new TextRun({ text: 'Digital Marketing Heroes', font: 'Arial', size: 28, bold: true, color: PURPLE, allCaps: true })],
    alignment: AlignmentType.CENTER, spacing: { before: 720, after: 120 }
  }),
  new Paragraph({
    children: [new TextRun({ text: 'digitalheroes.co.in', font: 'Arial', size: 20, color: BLUE })],
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 480 }
  }),
  new Paragraph({
    children: [new TextRun({ text: 'New Leaf Listings Platform', font: 'Arial', size: 72, bold: true, color: DARK })],
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Complete Technical Documentation', font: 'Arial', size: 36, color: GRAY, italics: true })],
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 480 }
  }),
  new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PURPLE } },
    children: [new TextRun('')], spacing: { before: 0, after: 480 }
  }),
  makeTable(
    ['Property', 'Value'],
    [
      ['Prepared by', 'Shreyansh'],
      ['Publisher', 'Digital Marketing Heroes'],
      ['Published', 'April 2026'],
      ['Version', '1.0'],
      ['Stack', 'React · Supabase · Stripe'],
      ['Total Pages', '50+'],
    ],
    [3000, 6360]
  ),
  new Paragraph({
    children: [new TextRun({ text: '"We Launch Brands in New Orbits" — digitalheroes.co.in', font: 'Arial', size: 20, italics: true, color: GRAY })],
    alignment: AlignmentType.CENTER, spacing: { before: 480, after: 0 }
  }),
];

// ── Section 1: System Overview
const sec1 = [
  ...sectionDivider('01', 'System Overview', 'Platform purpose, key features, and capacity metrics'),
  h(HeadingLevel.HEADING_1, '1.1 Platform Purpose'),
  p('New Leaf Listings is a full-stack real estate SaaS platform that connects property buyers and sellers with licensed realtors operating under regional directors. It provides structured listing management, intelligent lead routing, subscription-based access tiers, commission tracking, and multi-CRM synchronisation within a single unified interface.'),
  p('The platform is designed for a **franchise or territory-based real estate agency model**: a national or regional administrator oversees multiple geographic territories, each managed by a Director who recruits and supervises Realtors.'),
  h(HeadingLevel.HEADING_2, '1.2 Key Features'),
  makeTable(
    ['Feature', 'Description'],
    [
      ['Listing Management', '5-stage approval pipeline: draft → pending → active → sold/expired. Image galleries, property details, three upgrade tiers.'],
      ['Intelligent Lead Routing', 'Scoring engine assigns leads using subscription tier, listing upgrades, territory sponsorship, and current lead load.'],
      ['Commission Tracking', 'Multi-recipient records (Realtor 25%, Director 15%, Sponsor 10%) with pending → approved → payable → paid workflow.'],
      ['Subscription Billing', 'Four Stripe-backed plans: Starter $9, Pro $29, Dominator $79, Sponsor $199. Per-plan feature gating.'],
      ['CRM Synchronisation', 'Webhook-based sync to GoHighLevel. Retry queue with exponential backoff (5 min → 15 min → 45 min).'],
      ['Audit & Compliance', 'Every significant action recorded in audit_logs with actor, entity, and metadata.'],
    ],
    [2800, 6560]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, '1.3 Platform Metrics'),
  makeTable(
    ['Metric', 'Value'],
    [
      ['Subscription Tiers', '4 (Starter, Pro, Dominator, Sponsor)'],
      ['User Role Types', '3 (Admin, Director, Realtor)'],
      ['Backend Services', '13 TypeScript service modules'],
      ['Database Tables', '18+'],
      ['Application Routes', '45+'],
      ['Custom React Hooks', '16'],
    ],
    [4000, 5360]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, '1.4 Subscription Plan Limits'),
  makeTable(
    ['Plan', 'Monthly Price', 'Listings', 'Leads', 'CRM Sync'],
    [
      ['Starter', '$9', '5', '50', 'No'],
      ['Pro', '$29', 'Unlimited', 'Unlimited', 'No'],
      ['Dominator', '$79', 'Unlimited', 'Unlimited', 'Yes'],
      ['Sponsor', '$199', 'Unlimited', 'Unlimited', 'Yes + Territory Bonus'],
    ],
    [2000, 1800, 1600, 1600, 2360]
  ),
];

// ── Section 2: Architecture & Tech Stack
const sec2 = [
  ...sectionDivider('02', 'Architecture & Tech Stack', 'Frontend, backend, database layer, build tooling and project structure'),
  h(HeadingLevel.HEADING_1, '2.1 High-Level Architecture'),
  p('The New Leaf Listings platform follows a **client-driven SaaS architecture**: a React SPA communicates directly with Supabase (PostgreSQL + Auth + Edge Functions) for all data operations. Stripe handles payment processing and webhooks are consumed by serverless Edge Functions. There is no traditional Node.js middleware.'),
  ...code(`BROWSER / CLIENT
  React 19 SPA  (Vite, React Router DOM v7)
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐
  │  Public  │  │  Admin   │  │ Director │  │Realtor  │
  │  Pages   │  │Dashboard │  │Dashboard │  │Dashboard│
  └──────────┘  └──────────┘  └──────────┘  └─────────┘
         Custom React Hooks (16+)
         TypeScript Services (13 modules)
              │ Supabase JS Client (anon key)
  ┌───────────▼──────────────────────────────┐
  │          SUPABASE PLATFORM               │
  │  PostgreSQL  │ Auth (JWT)  │ Edge Funcs  │
  │  18 tables   │ email/pass  │ (Deno RT)   │
  └──────────────────────────────────────────┘
              │ service-role key
  ┌───────────▼──────────────────────────────┐
  │  Stripe Checkout+Webhooks │ GoHighLevel  │
  └──────────────────────────────────────────┘`),
  spacer(),
  h(HeadingLevel.HEADING_2, '2.2 Frontend Stack'),
  makeTable(
    ['Library / Tool', 'Version', 'Purpose'],
    [
      ['React', '19.2.4', 'UI component tree, concurrent rendering'],
      ['React Router DOM', '7.13.2', 'Client-side routing, protected route wrappers'],
      ['Vite', '8.0.1', 'Dev server, HMR, production bundler'],
      ['Tailwind CSS', '4.2.2', 'Utility-first styling'],
      ['React Icons', '5.6.0', 'Icon library (HeroIcons, Feather, etc.)'],
      ['Leaflet + React Leaflet', '1.9.4 / 5.0.0', 'Interactive property map on /map route'],
      ['@stripe/stripe-js', '9.0.0', 'Stripe.js for client-side checkout redirect'],
    ],
    [2800, 1560, 5000]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, '2.3 Backend Service Modules'),
  makeTable(
    ['Service File', 'Responsibility'],
    [
      ['admin.service.ts', 'User approval/suspension, bulk management via Edge Functions'],
      ['audit.service.ts', 'Fire-and-forget audit log writes via RPC'],
      ['commission.service.ts', 'Commission calculation, approval workflow, payout aggregation'],
      ['crm.service.ts', 'GoHighLevel webhook sync, retry queue, mock mode'],
      ['lead.service.ts', 'Lead CRUD, 180-day attribution lock enforcement'],
      ['listing.service.ts', 'Listing CRUD, status pipeline, upgrade tier management'],
      ['notification.service.ts', 'Email notifications for lead assignment and listing approval'],
      ['payment.service.ts', 'Payment recording, Stripe checkout session, refund handling'],
      ['pricing.service.ts', 'Plan tier management, upgrade/downgrade cost calculation'],
      ['routing.service.ts', 'Lead routing scoring engine, eligible Realtor lookup'],
      ['subscription.service.ts', 'Subscription lifecycle, feature access checks, MRR stats'],
      ['territory.service.ts', 'Territory CRUD, director assignment, location detection'],
      ['user.service.ts', 'User profile CRUD, invite links, status changes'],
    ],
    [3200, 6160]
  ),
];

// ── Section 3: User Roles & Permissions
const sec3 = [
  ...sectionDivider('03', 'User Roles & Permissions', 'Three-tier role model, RBAC matrix, subscription plan gating, and onboarding flow'),
  h(HeadingLevel.HEADING_1, '3.1 Role Definitions'),
  makeTable(
    ['Role', 'Scope', 'Key Abilities'],
    [
      ['Admin', 'Entire platform (1 account)', 'Approve/reject users and listings, manage all users, set CRM config, view audit logs, override commissions, manage territories.'],
      ['Director', 'Assigned territory only', 'View/approve territory listings and leads, assign leads to Realtors, manage Realtors, view commissions, release attribution locks.'],
      ['Realtor', 'Own listings and leads only', 'Create/edit own listings, view assigned leads, view own commissions, manage billing, update profile. Gated by subscription plan.'],
    ],
    [1800, 2560, 5000]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, '3.2 RBAC Permissions Matrix'),
  makeTable(
    ['Permission', 'Admin', 'Director', 'Realtor'],
    [
      ['listings.view (all)', '✓', 'Territory only', 'Own only'],
      ['listings.create', '✓', '✓', '✓ (plan limit)'],
      ['listings.approve', '✓', '✓ (territory)', '✗'],
      ['leads.view (all)', '✓', 'Territory only', 'Own only'],
      ['leads.assign', '✓', '✓ (territory)', '✗'],
      ['leads.release_lock', '✓', '✓', '✗'],
      ['commissions.view', '✓', 'Territory only', 'Own only'],
      ['commissions.approve', '✓', '✗', '✗'],
      ['users.manage', '✓', 'Realtors only', '✗'],
      ['territories.manage', '✓', '✗', '✗'],
      ['settings.manage', '✓', '✗', '✗'],
      ['audit.view', '✓', '✗', '✗'],
      ['billing.manage', '✓', '✓ (own)', '✓ (own)'],
      ['analytics.view', '✓', 'Territory', 'Own (Pro+ plan)'],
    ],
    [3600, 1700, 2060, 2000]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, '3.3 Subscription Feature Gating'),
  makeTable(
    ['Feature', 'Starter', 'Pro', 'Dominator', 'Sponsor'],
    [
      ['Listing limit', '5', 'Unlimited', 'Unlimited', 'Unlimited'],
      ['Lead limit', '50', 'Unlimited', 'Unlimited', 'Unlimited'],
      ['Featured listing upgrade', '✗', '✓', '✓', '✓'],
      ['Top listing upgrade', '✗', '✗', '✓', '✓'],
      ['Commission tracking', '✗', '✓', '✓', '✓'],
      ['Analytics page', '✗', '✓', '✓', '✓'],
      ['CRM sync (GoHighLevel)', '✗', '✗', '✓', '✓'],
      ['Territory sponsor bonus', '✗', '✗', '✗', '✓ (+25 routing pts)'],
    ],
    [2800, 1440, 1280, 1840, 1960 + 40]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, '3.4 Onboarding Flow'),
  flowStep(1, '**Realtor signs up** via `/signup`. Profile created with `role = realtor`, `status = pending`.'),
  flowStep(2, '**Redirected to** `/onboarding/pending` — shown a waiting screen.'),
  flowStep(3, '**Admin reviews** the Approvals Queue at `/admin/approvals` and approves or rejects.'),
  flowStep(4, '**On approval**, status changes to `active`. Realtor gains dashboard access.'),
  flowStep(5, '**Director accounts** created by Admin via `/admin/add-user`. Invite link sent via Edge Function.'),
];

// ── Section 4: Database Schema
const sec4 = [
  ...sectionDivider('04', 'Database Schema', 'All 18 tables, columns, enums, foreign keys, RLS policies, and performance indexes'),
  h(HeadingLevel.HEADING_1, '4.1 Entity Relationship Overview'),
  ...code(`auth.users (Supabase Auth)
    └──► profiles
             │  id · email · role · status · territory_id · subscription_id
             ├──► territories
             │        id · state · city · director_id (FK → profiles)
             ├──► listings
             │        id · title · price · status · upgrade_type
             │        realtor_id (FK → profiles) · territory_id (FK → territories)
             ├──► leads
             │        id · status · score · attribution_expiry · lock_until
             │        assigned_realtor_id (FK) · assigned_director_id (FK)
             ├──► subscriptions
             │        id · plan · status · stripe_customer_id
             ├──► commissions
             │        id · amount · status · commission_type · recipient_user_id (FK)
             └──► payments
                      id · type · amount · status · stripe_payment_id`),
  spacer(),
  h(HeadingLevel.HEADING_2, '4.2 profiles Table'),
  makeTable(
    ['Column', 'Type', 'Notes'],
    [
      ['id', 'UUID PK', 'FK → auth.users.id'],
      ['email', 'TEXT UNIQUE', 'Mirrors Auth email'],
      ['role', 'ENUM', 'admin | director | realtor'],
      ['status', 'ENUM', 'active | pending | suspended'],
      ['territory_id', 'UUID FK', '→ territories.id'],
      ['assigned_director_id', 'UUID FK', '→ profiles.id (for Realtors)'],
      ['subscription_id', 'UUID FK', '→ subscriptions.id'],
      ['license_number / state / expiry', 'TEXT / DATE', 'Realtor licence info'],
    ],
    [3000, 2000, 4360]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, '4.3 listings Table'),
  makeTable(
    ['Column', 'Type', 'Notes'],
    [
      ['title, description', 'TEXT', ''],
      ['price', 'NUMERIC(12,2)', 'Asking price in USD'],
      ['status', 'ENUM', 'draft | pending | active | under_contract | sold | expired | rejected'],
      ['upgrade_type', 'ENUM', 'standard | featured | top'],
      ['images', 'TEXT[]', 'Array of image URLs'],
      ['realtor_id', 'UUID FK', '→ profiles.id'],
      ['territory_id', 'UUID FK', '→ territories.id'],
      ['approved_by / approved_at', 'UUID FK / TIMESTAMPTZ', 'Set when approved'],
      ['views_count', 'INT DEFAULT 0', 'Incremented on public detail page load'],
    ],
    [3200, 2200, 3960]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, '4.4 leads Table'),
  makeTable(
    ['Column', 'Type', 'Notes'],
    [
      ['source', 'ENUM', 'website | api | manual | referral | partner'],
      ['status', 'ENUM', 'new | assigned | contacted | showing | offer | converted | lost'],
      ['score', 'INT (0–100)', 'Lead quality score set at routing time'],
      ['contact_email / phone', 'TEXT', 'PII — masked for non-assigned agents'],
      ['contact_masked_email', 'TEXT', 'Pre-computed e.g. j***@domain.com'],
      ['attribution_expiry', 'TIMESTAMPTZ', 'Set to now() + 180 days on assignment'],
      ['lock_until', 'TIMESTAMPTZ', 'Prevents reassignment until this date'],
      ['crm_synced_at / crm_id', 'TIMESTAMPTZ / TEXT', 'CRM sync tracking'],
    ],
    [3200, 2200, 3960]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, '4.5 RLS Policy Summary'),
  makeTable(
    ['Table', 'SELECT Policy', 'INSERT/UPDATE'],
    [
      ['profiles', 'Own row only (auth.uid() = id)', 'Own row only'],
      ['listings', 'Realtor: own. Director: territory. Admin: all.', 'Realtor: own. Director: territory. Admin: all.'],
      ['leads', 'Realtor: assigned_realtor_id = uid. Director: territory. Admin: all.', 'New: authenticated. Updates: assigned agent or Admin.'],
      ['commissions', 'Realtor: own. Director: territory. Admin: all.', 'Admin only.'],
      ['subscriptions', 'Own (user_id = uid).', 'Edge Function (service role) only.'],
      ['audit_logs', 'Admin only.', 'Service role via RPC only.'],
      ['platform_settings', 'Authenticated (read). Admin: all.', 'Admin only.'],
    ],
    [2400, 3480, 3480]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, '4.6 Performance Indexes'),
  makeTable(
    ['Index', 'Table', 'Column(s)'],
    [
      ['idx_listings_status', 'listings', 'status'],
      ['idx_listings_realtor_id', 'listings', 'realtor_id'],
      ['idx_listings_territory_id', 'listings', 'territory_id'],
      ['idx_listings_upgrade_type', 'listings', 'upgrade_type'],
      ['idx_leads_status', 'leads', 'status'],
      ['idx_leads_assigned_realtor_id', 'leads', 'assigned_realtor_id'],
      ['idx_leads_territory_id', 'leads', 'territory_id'],
      ['idx_leads_score', 'leads', 'score DESC'],
      ['idx_profiles_role', 'profiles', 'role'],
      ['idx_profiles_status', 'profiles', 'status'],
      ['idx_territories_director_id', 'territories', 'director_id'],
      ['idx_commissions_recipient', 'commissions', 'recipient_user_id'],
    ],
    [3600, 2400, 3360]
  ),
];

// ── Section 5: Custom Hooks
const sec5 = [
  ...sectionDivider('05', 'Custom Hooks & State Management', 'All 16 custom React hooks — authentication, data fetching, dashboard analytics'),
  h(HeadingLevel.HEADING_1, '5.1 Authentication & RBAC Hooks'),
  h(HeadingLevel.HEADING_2, 'useAuth()'),
  p('Provided by `AuthContext.jsx`. Exposes current Supabase session, profile row, role, subscription status, and all auth action functions.'),
  makeTable(
    ['Value / Function', 'Type', 'Description'],
    [
      ['user', 'Object', 'Supabase Auth user object (id, email, metadata)'],
      ['profile', 'Object', 'Full profiles row for current user'],
      ['role', 'String', 'admin | director | realtor'],
      ['subscription', 'Object', 'Active subscription row (plan, status)'],
      ['loading', 'Boolean', 'True while session and profile are being resolved'],
      ['login(email, pwd)', 'Function', 'Sign in with email and password'],
      ['signup(email, pwd, meta)', 'Function', 'Create new account with profile metadata'],
      ['logout()', 'Function', 'Sign out, clear localStorage/sessionStorage'],
      ['updateProfile(data)', 'Function', 'Update own profiles row'],
    ],
    [3200, 1600, 4560]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, 'useRBAC()'),
  makeTable(
    ['Function', 'Signature', 'Returns'],
    [
      ['can', 'can(permission: string)', 'true if role has permission'],
      ['canAny', 'canAny(permissions: string[])', 'true if role has at least one'],
      ['canAll', 'canAll(permissions: string[])', 'true if role has all listed'],
      ['is', 'is(role: string)', 'true if current role matches'],
      ['permissions', 'Array', 'Full permission list for current role'],
    ],
    [2200, 3560, 3600]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '5.2 Core Data Hooks'),
  h(HeadingLevel.HEADING_2, 'useLeads()'),
  makeTable(
    ['Function / Value', 'Description'],
    [
      ['leads', 'Array of lead records scoped to current user\'s role'],
      ['createInquiry(data)', 'Submit a new buyer/seller lead from public form'],
      ['updateStatus(leadId, status)', 'Move lead through status pipeline'],
      ['reassignLead(leadId, realtorId)', 'Director/Admin only; enforces 180-day lock check'],
      ['addNote(leadId, note)', 'Append a note to the lead record'],
      ['fetchDirectorQueue()', 'Unassigned leads in Director\'s territory'],
      ['fetchAvailableRealtors(territoryId)', 'Eligible Realtors for manual assignment'],
    ],
    [3800, 5560]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, 'useListings()'),
  makeTable(
    ['Function / Value', 'Description'],
    [
      ['listings', 'Role-scoped array of listing records'],
      ['createListing(data)', 'Creates in draft status; validates plan listing limit'],
      ['updateListing(id, data)', 'Updates own listing fields'],
      ['submitForApproval(id)', 'Moves status draft → pending'],
      ['approveListing(id)', 'Admin/Director: moves pending → active'],
      ['rejectListing(id, reason)', 'Admin/Director: moves pending → rejected'],
      ['upgradeListingTier(id, type)', 'Initiates Stripe checkout for featured or top upgrade'],
    ],
    [3800, 5560]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, 'useCommissions() — Admin / Director'),
  makeTable(
    ['Function / Value', 'Description'],
    [
      ['commissions', 'All commissions scoped to role'],
      ['approve(id)', 'Moves pending → approved'],
      ['reject(id, reason)', 'Moves pending → rejected'],
      ['markPayable(id)', 'Moves approved → payable'],
      ['markPaid(id)', 'Moves payable → paid, sets paid_at'],
      ['overrideAmount(id, amount)', 'Sets override_amount for manual correction'],
      ['bulkApprove(ids[])', 'Batch approve multiple pending commissions'],
    ],
    [3800, 5560]
  ),
];

// ── Section 6: Services
const sec6 = [
  ...sectionDivider('06', 'Services Layer', 'CRM sync, lead routing engine, commission & payment services, notification & audit'),
  h(HeadingLevel.HEADING_1, '6.1 CRM Service (crm.service.ts)'),
  p('Handles all outbound and inbound communication with GoHighLevel and other webhook-based CRM providers. Features mock mode (90% success), persistent retry queue, exponential backoff, and bidirectional status mapping.'),
  makeTable(
    ['Function', 'Description'],
    [
      ['syncLead(leadId, provider)', 'Push full lead data to CRM Contacts API or webhook endpoint'],
      ['syncLeadStatus(leadId, status, provider)', 'Send status update event to CRM on lead pipeline change'],
      ['getWebhookConfig(provider)', 'Retrieve webhook URL and auth credentials from crm_configs table'],
      ['testConnection(provider)', 'Sends a test ping and returns success/failure with latency'],
      ['handleIncomingWebhook(payload, provider)', 'Process inbound CRM events — maps CRM statuses to platform statuses'],
      ['processRetryQueue()', 'Dequeue failed syncs from crm_sync_queue and retry with backoff'],
    ],
    [3800, 5560]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Retry Queue Architecture'),
  flowStep(1, '**Sync fails** — error caught inside `syncLead()`.'),
  flowStep(2, '**Record inserted** into `crm_sync_queue` with `status = pending`, `next_retry_at = now() + 5 min`.'),
  flowStep(3, '**processRetryQueue()** selects records where `next_retry_at <= now()`. Backoff: 5 min → 15 min → 45 min.'),
  flowStep(4, '**After 3 failed attempts**, status set to `failed` with `last_error` stored. Admin can re-trigger from Settings page.'),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Inbound Webhook Event Mapping'),
  makeTable(
    ['CRM Event', 'Platform Action'],
    [
      ['contact.updated', 'Update leads contact fields (name, phone)'],
      ['lead.status_changed', 'Map CRM status → platform status, call updateLeadStatus()'],
      ['deal.won', 'Set lead status to converted, trigger commission calculation'],
      ['closed (legacy status)', 'Remapped to converted (BUG-015 fix)'],
    ],
    [3600, 5760]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '6.2 Lead Routing Engine (routing.service.ts)'),
  p('When a new lead is created without an explicit Realtor assignment, `routeLead(context)` scores every eligible Realtor in the matching territory and assigns the lead to the highest scorer.'),
  makeTable(
    ['Factor', 'Score', 'Condition'],
    [
      ['Subscription: Dominator/Sponsor', '+40 pts', 'Highest commitment tier'],
      ['Subscription: Pro', '+30 pts', 'Mid tier'],
      ['Subscription: Starter', '+20 pts', 'Base tier'],
      ['Listing upgrade: Top', '+20 pts', 'Realtor paid for top placement'],
      ['Listing upgrade: Featured', '+10 pts', 'Realtor paid for featured'],
      ['Listing upgrade: Standard', '+5 pts', 'Free placement'],
      ['Territory Sponsor bonus', '+25 pts', 'Realtor holds Sponsor plan in this territory'],
      ['Open lead penalty', '-2 pts each', 'Per existing open lead, capped at -20 pts'],
    ],
    [3600, 1600, 4160]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '6.3 Commission Service (commission.service.ts)'),
  makeTable(
    ['Function', 'Description'],
    [
      ['calculateCommissions(transactionId, amount)', 'Creates Realtor (25%), Director (15%), Sponsor (10%) records'],
      ['approve(commissionId)', 'Moves pending → approved; records approved_by and approved_at'],
      ['reject(commissionId, reason)', 'Moves pending → rejected; stores reason'],
      ['markPayable(commissionId)', 'Moves approved → payable; ready for payout batch'],
      ['markPaid(commissionId)', 'Moves payable → paid; sets paid_at = now()'],
      ['bulkApprove(ids[])', 'Batch update — single DB round-trip for multiple approvals'],
      ['overrideAmount(id, amount)', 'Sets override_amount; takes precedence in payouts'],
    ],
    [4200, 5160]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '6.4 Notification Service (notification.service.ts)'),
  makeTable(
    ['Function', 'Trigger', 'Recipients'],
    [
      ['notifyNewLead(leadId, realtorId)', 'Lead assigned to Realtor', 'Assigned Realtor via email'],
      ['notifyDirectorLead(leadId, directorId)', 'Lead falls back to Director queue', 'Territory Director via email'],
      ['notifyListingApproval(listingId)', 'Admin/Director approves a listing', 'Listing\'s Realtor via email'],
      ['notifyListingRejection(listingId, reason)', 'Listing rejected', 'Listing\'s Realtor via email + in-app'],
      ['notifyRealtorApproval(userId)', 'Admin approves new Realtor signup', 'Newly approved Realtor via email'],
      ['createInAppNotification(userId, msg, link)', 'Any significant event', 'Target user\'s notification bell'],
    ],
    [3600, 2760, 3000]
  ),
];

// ── Section 7: Pages & Routes
const sec7 = [
  ...sectionDivider('07', 'Pages & Routes', 'Complete route registry — public pages, auth flows, and the three role-scoped dashboard areas'),
  h(HeadingLevel.HEADING_1, '7.1 Public Routes (No Auth Required)'),
  makeTable(
    ['Path', 'Component', 'Description'],
    [
      ['/', 'HomePage', 'Marketing landing page with hero, features, pricing CTA'],
      ['/browse', 'BrowseListings', 'Filterable listing grid using usePublicListings'],
      ['/map', 'MapPage', 'Leaflet map view of all active listings with popups'],
      ['/listing/:id', 'PublicListingDetail', 'SEO-friendly listing detail; includes lead inquiry form'],
      ['/pricing', 'PricingPage', 'Plan comparison table and Stripe Checkout CTAs'],
      ['/about', 'AboutPage', 'Company and platform overview'],
      ['/contact', 'ContactPage', 'Contact form → writes to contact_submissions'],
      ['/terms-of-service', 'TermsOfService', 'Legal terms (/terms redirects here)'],
      ['/privacy-policy', 'PrivacyPolicy', ''],
      ['/platform-rules', 'PlatformRules', ''],
    ],
    [2400, 2560, 4400]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '7.2 Admin Routes (role: admin)'),
  makeTable(
    ['Path', 'Page', 'Key Function'],
    [
      ['/admin/dashboard', 'AdminDashboard', 'KPI cards, charts, pending approvals count'],
      ['/admin/approvals', 'ApprovalsPage', 'Pending Realtor signups + listing submissions queue'],
      ['/admin/users', 'UsersPage', 'Full user management table'],
      ['/admin/add-user', 'AddUserPage', 'Create Director/Realtor accounts or send invite'],
      ['/admin/leads', 'LeadsPage', 'Platform-wide lead table with filters'],
      ['/admin/territories', 'TerritoriesPage', 'Territory CRUD + Director assignment'],
      ['/admin/subscriptions', 'SubscriptionsPage', 'All subscriptions, MRR stats'],
      ['/admin/commissions-admin', 'CommissionsAdminPage', 'Approve, reject, pay commissions; bulk ops'],
      ['/admin/audit', 'AuditLogPage', 'Full audit trail with filters and export'],
      ['/admin/pricing', 'AdminPricingPage', 'Edit subscription plan prices and upgrade costs'],
      ['/admin/settings', 'SettingsPage', 'CRM config, platform settings, feature flags'],
      ['/admin/disputes', 'DisputesPage', 'Commission/payment dispute resolution'],
      ['/admin/payouts', 'PayoutsPage', 'Payout request management'],
      ['/admin/enquiries', 'EnquiriesPage', 'Contact form submissions; convert to lead'],
    ],
    [3000, 2760, 3600]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '7.3 Director & Realtor Routes'),
  makeTable(
    ['Path', 'Page', 'Key Function'],
    [
      ['/director/dashboard', 'DirectorDashboard', 'Territory KPIs, lead queue, Realtor performance'],
      ['/director/listings', 'DirectorListingsPage', 'All listings in territory; approve/reject pending'],
      ['/director/leads', 'DirectorLeadsPage', 'Territory leads; assign to Realtors from drawer'],
      ['/director/realtors', 'DirectorRealtorsPage', 'Realtors under management; view performance'],
      ['/director/commissions', 'DirectorCommissionsPage', 'Territory commission records'],
      ['/director/reports', 'DirectorReportsPage', 'Territory analytics — listings, leads, revenue'],
      ['/realtor/dashboard', 'RealtorDashboard', 'Own listings, assigned leads, commission summary'],
      ['/realtor/listings', 'RealtorListingsPage', 'Own listings with create/edit/submit/upgrade actions'],
      ['/realtor/leads', 'RealtorLeadsPage', 'Assigned leads with Lead Drawer detail view'],
      ['/realtor/commissions', 'RealtorCommissionsPage', 'Own commission records and payout requests'],
      ['/realtor/billing', 'BillingPage', 'Subscription management, plan upgrade via Stripe'],
      ['/realtor/analytics', 'RealtorAnalyticsPage', 'Performance analytics — Pro plan and above only'],
    ],
    [3000, 2760, 3600]
  ),
];

// ── Section 8: Lead Management
const sec8 = [
  ...sectionDivider('08', 'Lead Management Workflows', 'Lead lifecycle, status pipeline, 180-day attribution lock, and Lead Drawer contact gating'),
  h(HeadingLevel.HEADING_1, '8.1 Lead Lifecycle & Status Pipeline'),
  h(HeadingLevel.HEADING_2, 'Complete Lead Journey'),
  flowStep(1, '**Enquiry submitted** — buyer fills the contact form. `useLeads.createInquiry()` inserts lead with `status = new`.'),
  flowStep(2, '**Auto-routing fires** — `routeLead()` scores eligible Realtors. Highest scorer wins. Attribution lock starts.'),
  flowStep(3, '**Status moves to `assigned`** — Realtor receives email notification and in-app alert.'),
  flowStep(4, '**Realtor contacts buyer** — moves status to `contacted`. CRM sync fires for Dominator/Sponsor plans.'),
  flowStep(5, '**Showing scheduled** — status moves to `showing`. Realtor can log notes from the Lead Drawer.'),
  flowStep(6, '**Offer made** — status moves to `offer`. Director notified; commission calculation initiated.'),
  flowStep(7, '**Converted or lost** — `converted` triggers commission records. `lost` archives the lead.'),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Status Transition Table'),
  makeTable(
    ['From Status', 'To Status', 'Who Can Transition', 'Trigger'],
    [
      ['new', 'assigned', 'System (auto-routing)', 'Lead created + routing completes'],
      ['new', 'assigned', 'Director / Admin', 'Manual assignment from queue'],
      ['assigned', 'contacted', 'Realtor', 'Realtor marks first contact'],
      ['contacted', 'showing', 'Realtor', 'Viewing/showing scheduled'],
      ['showing', 'offer', 'Realtor', 'Formal offer submitted'],
      ['offer', 'converted', 'Realtor / Director', 'Deal closes; commissions triggered'],
      ['Any active', 'lost', 'Realtor / Director / Admin', 'Lead withdraws or goes cold'],
    ],
    [1800, 1800, 2400, 3360]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '8.2 180-Day Attribution Lock'),
  p('When a lead is assigned to a Realtor, two timestamps are written: **`attribution_expiry`** and **`lock_until`** — both set to 180 days from assignment time. During this period, no other Realtor can be assigned the lead.'),
  callout('**Key invariant:** A lead\'s `assigned_realtor_id` cannot be changed while `lock_until > now()`. Only a Director or Admin can call `leads.release_lock` to break this protection early.', 'info'),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Lock Release Workflow'),
  flowStep(1, '**Director opens Lead Drawer** for a locked lead. Lock badge shows days remaining in amber.'),
  flowStep(2, '**Clicks "Release Lock"** — confirmation modal shown with reason field.'),
  flowStep(3, '**`reassignLead()` called with `force: true`** — sets `lock_until = now()` and logs to audit.'),
  flowStep(4, '**Reassign dropdown unlocks** — Director selects new Realtor, re-starting a fresh 180-day lock.'),
  spacer(),
  h(HeadingLevel.HEADING_1, '8.3 Lead Drawer & Contact Gating'),
  p('The **Lead Drawer** (`src/components/shared/LeadDrawer.jsx`) is a slide-in panel that opens when any lead row is clicked. Contact information is protected by a **contact gating** system that masks sensitive PII for non-assigned agents.'),
  makeTable(
    ['Field', 'Masked (non-assigned)', 'Unmasked (assigned / Director / Admin)'],
    [
      ['Email', 'j***@gmail.com', 'john.doe@gmail.com'],
      ['Phone', '(•••) •••-4567', '(555) 123-4567'],
      ['Full Name', 'Always visible', 'Always visible'],
      ['Budget range', 'Always visible', 'Always visible'],
      ['Notes', 'Hidden entirely', 'Full notes history'],
    ],
    [2000, 3000, 4360]
  ),
];

// ── Section 9: Commission & Payment
const sec9 = [
  ...sectionDivider('09', 'Commission & Payment System', 'Commission calculation, approval workflow, Stripe integration, listing upgrades, payout requests'),
  h(HeadingLevel.HEADING_1, '9.1 Commission Calculation Rules'),
  makeTable(
    ['Recipient', 'Type', 'Default Rate', 'Platform Setting Key'],
    [
      ['Realtor', 'realtor', '25%', 'commission_realtor_rate'],
      ['Territory Director', 'director', '15%', 'commission_director_rate'],
      ['Territory Sponsor', 'sponsor', '10%', 'commission_sponsor_rate'],
    ],
    [2400, 1600, 1800, 3560]
  ),
  callout('**Note:** Rates are read from `platform_settings` at calculation time. Admin can change rates in Settings without code deployment.', 'note'),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Commission Example ($29 Featured Upgrade)'),
  makeTable(
    ['Line Item', 'Value'],
    [
      ['Transaction Amount', '$29.00'],
      ['Realtor Commission (25%)', '$7.25'],
      ['Director Commission (15%)', '$4.35'],
      ['Sponsor Commission (10%)', '$2.90'],
      ['Total Commissions', '$14.50 (50% of transaction)'],
      ['Platform Retention', '$14.50 (50% of transaction)'],
    ],
    [4000, 5360]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Commission Status Workflow'),
  p('PENDING → APPROVED → PAYABLE → PAID   (or REJECTED at any step)'),
  makeTable(
    ['Status', 'Action Required', 'Who Acts', 'Side Effect'],
    [
      ['pending', 'Review commission record', 'Admin', '—'],
      ['approved', 'Mark as payable when ready', 'Admin', 'Records approved_by, approved_at'],
      ['payable', 'Process payout then mark paid', 'Admin', 'Included in payout batch export'],
      ['paid', '—', 'System', 'Sets paid_at = now()'],
      ['rejected', 'Optionally adjust and re-submit', 'Admin', 'Reason stored in audit log'],
    ],
    [1800, 2600, 1800, 3160]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '9.2 Stripe Payment Integration'),
  makeTable(
    ['Stripe Event', 'Handler Action'],
    [
      ['checkout.session.completed', 'Create/update subscriptions record, trigger commission calculation'],
      ['invoice.payment_succeeded', 'Record payment in payments table with status = succeeded'],
      ['invoice.payment_failed', 'Record payment as failed, update subscription status to expired'],
      ['customer.subscription.deleted', 'Set subscription status = cancelled'],
      ['payment_intent.succeeded', 'Record listing upgrade payment, call processListingUpgrade()'],
    ],
    [3600, 5760]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Stripe Checkout Session Flow'),
  flowStep(1, '**Realtor clicks Upgrade** — `useSubscriptions.createCheckoutSession(plan)` is called.'),
  flowStep(2, '**Edge Function invoked** — creates Stripe Checkout Session with correct `price_id`.'),
  flowStep(3, '**Browser redirected** to Stripe-hosted checkout page.'),
  flowStep(4, '**Payment success** — Stripe fires `checkout.session.completed` webhook to Edge Function.'),
  flowStep(5, '**Edge Function** creates/updates `subscriptions` record, calls `calculateCommissions()`.'),
  flowStep(6, '**Browser returns** to `/realtor/billing?success=true` and displays confirmation toast.'),
  spacer(),
  h(HeadingLevel.HEADING_1, '9.3 Listing Upgrade Tiers'),
  makeTable(
    ['Upgrade Type', 'Price', 'Routing Bonus', 'Display Priority'],
    [
      ['standard', '$0 (free)', '+5 pts', 'Default'],
      ['featured', '$29', '+10 pts', 'Highlighted badge'],
      ['top', '$79', '+20 pts', 'Top of search results'],
    ],
    [2400, 1600, 1800, 3560]
  ),
];

// ── Section 10: CRM Integration
const sec10 = [
  ...sectionDivider('10', 'CRM Integration', 'GoHighLevel webhook configuration, sync flow, retry queue, and Admin Settings UI'),
  h(HeadingLevel.HEADING_1, '10.1 Supported Providers'),
  p('GoHighLevel (ghl) · SalesPro (salespro) · Leap (leap) · Custom Webhook'),
  h(HeadingLevel.HEADING_2, 'Configuration Sources (Priority Order)'),
  flowStep(1, '**crm_configs table** (highest priority) — Admin saves credentials through Settings page.'),
  flowStep(2, '**Environment variables** (fallback) — `VITE_GHL_WEBHOOK_URL`, `VITE_GHL_API_KEY` etc.'),
  flowStep(3, '**Mock mode** (dev fallback) — when `VITE_USE_MOCK_CRM=true`. 90% mock success rate.'),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Admin Settings UI — CRM Section'),
  makeTable(
    ['Field', 'Input Type', 'Maps To'],
    [
      ['CRM Provider', 'Dropdown', 'crm_configs.provider'],
      ['Webhook URL', 'Text input', 'crm_configs.webhook_url'],
      ['Auth Header Name', 'Text input', 'crm_configs.auth_header (e.g. Authorization)'],
      ['Auth Value', 'Password input (masked)', 'crm_configs.auth_value'],
      ['Test Connection', 'Button', 'Calls crmService.testConnection(provider)'],
      ['Enable Mock Mode', 'Toggle', 'platform_settings.mock_crm_enabled'],
    ],
    [2600, 2400, 4360]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, 'GoHighLevel Payload Shape'),
  ...code(`{
  "firstName":    "John",
  "lastName":     "Doe",
  "email":        "john.doe@example.com",
  "phone":        "+15551234567",
  "source":       "website",
  "tags":         ["nlv-lead", "buyer"],
  "customFields": {
    "nlv_lead_id":      "uuid-here",
    "budget_min":       200000,
    "budget_max":       350000,
    "assigned_realtor": "Jane Smith"
  }
}`),
];

// ── Section 11: Admin Panel
const sec11 = [
  ...sectionDivider('11', 'Admin Panel', 'Complete reference for all admin pages — Approvals, User Management, Settings, Commissions, Audit Log'),
  h(HeadingLevel.HEADING_1, '11.1 Approvals Queue (/admin/approvals)'),
  p('The Approvals page presents two queues: pending Realtor signups and pending listing submissions. Both can be approved or rejected individually or in bulk.'),
  makeTable(
    ['Queue', 'Shows', 'Actions'],
    [
      ['Realtor Signups', 'Full name, email, phone, territory, sign-up date', 'Approve (status = active) or Reject with reason. Triggers welcome email.'],
      ['Listing Submissions', 'Title, address, price, property type, realtor, submitted date', 'Approve (status = active, records approved_by) or Reject with reason.'],
    ],
    [2000, 3560, 3800]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '11.2 Settings Page (/admin/settings)'),
  makeTable(
    ['Section', 'Fields', 'Stored In'],
    [
      ['CRM Configuration', 'Provider, Webhook URL, Auth header, Auth value, Test button, Mock mode toggle', 'crm_configs table'],
      ['Commission Settings', 'Realtor rate, Director rate, Sponsor rate, Attribution lock days', 'platform_settings keys'],
      ['Feature Flags', 'Require listing approval, Enable referral, Enable disputes, Enable payouts', 'platform_settings boolean keys'],
    ],
    [2400, 4360, 2600]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '11.3 Commissions Admin (/admin/commissions-admin)'),
  makeTable(
    ['UI Element', 'Description'],
    [
      ['Filter bar', 'Filter by status, recipient, date range, commission type'],
      ['Commission table', 'Recipient, type, transaction, calculated amount, override amount, status, dates'],
      ['Row actions', 'Approve, Reject, Mark Payable, Mark Paid, Override Amount'],
      ['Bulk operations', 'Select multiple → Bulk Approve / Bulk Mark Payable'],
      ['Export', 'Download CSV of filtered commissions for accounting'],
      ['Summary strip', 'Total pending, total payable, total paid (filtered period)'],
    ],
    [2800, 6560]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '11.4 Audit Log Page (/admin/audit)'),
  makeTable(
    ['Filter', 'Options'],
    [
      ['Category', 'listing, lead, user, commission, payment, crm, settings'],
      ['Actor', 'Searchable user dropdown'],
      ['Action', 'Free-text search (e.g. lead.assigned)'],
      ['Date range', 'From / To date pickers'],
      ['Entity ID', 'UUID search — show all events for one record'],
    ],
    [2800, 6560]
  ),
  callout('**Audit Action Taxonomy:** listing.created/approved/rejected/upgraded · lead.created/auto_assigned/reassigned/lock_released · user.invited/approved/suspended · commission.approved/rejected/paid · payment.succeeded/failed/refunded', 'note'),
];

// ── Section 12: Security
const sec12 = [
  ...sectionDivider('12', 'Security & Authentication', 'Auth flow, JWT lifecycle, RLS layers, PII masking, Edge Function privilege model'),
  h(HeadingLevel.HEADING_1, '12.1 Authentication System'),
  makeTable(
    ['Property', 'Value'],
    [
      ['Method', 'Email + password (Supabase native)'],
      ['Token Format', 'JWT (HS256). Issued by Supabase Auth, attached to every request.'],
      ['Token Lifetime', '3600 seconds (1 hour). Auto-refreshed before expiry.'],
      ['Session Storage', 'Supabase JS client persists to localStorage.'],
      ['Password Reset', 'Supabase sends reset link. Link opens /reset-password.'],
    ],
    [3000, 6360]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, 'onAuthStateChange Event Handling'),
  makeTable(
    ['Event', 'AuthContext Action'],
    [
      ['SIGNED_IN', 'Load profile from DB with retry + metadata recovery. Set user, profile, role, subscription state.'],
      ['SIGNED_OUT', 'Clear all auth state. Remove profile from localStorage. Redirect to /login.'],
      ['TOKEN_REFRESHED', 'Skip profile reload (already in memory). Only update user object.'],
      ['USER_UPDATED', 'Re-fetch profile row to pick up any admin-side changes.'],
    ],
    [2800, 6560]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '12.2 Security Layers Summary'),
  makeTable(
    ['Layer', 'Mechanism', 'Protects Against'],
    [
      ['Route Guard', '<ProtectedRoute> checks useAuth().role', 'Wrong-role UI access; unauthenticated navigation'],
      ['RBAC Hook', 'useRBAC().can() hides UI elements', 'Accidental action exposure'],
      ['Supabase RLS', 'Per-table policies using auth.uid()', 'Direct DB access, API abuse'],
      ['JWT Validation', 'Supabase verifies signature on every request', 'Token forgery, session hijacking'],
      ['Edge Function', 'Service-role key only in server env; CORS headers', 'Client-side escalation'],
      ['Stripe Webhook', 'Signature via STRIPE_WEBHOOK_SECRET', 'Fake payment confirmation payloads'],
      ['PII Masking', 'RLS + pre-computed masked columns', 'Lead contact data leakage'],
    ],
    [2400, 3360, 3600]
  ),
];

// ── Section 13: Deployment
const sec13 = [
  ...sectionDivider('13', 'Deployment & Environment', 'Environment variables, Supabase setup, Edge Functions, Stripe webhook, production checklist'),
  h(HeadingLevel.HEADING_1, '13.1 Environment Variables'),
  h(HeadingLevel.HEADING_2, 'Required Frontend Variables (VITE_)'),
  makeTable(
    ['Variable', 'Example Value', 'Required'],
    [
      ['VITE_SUPABASE_URL', 'https://abcxyz.supabase.co', 'Yes'],
      ['VITE_SUPABASE_ANON_KEY', 'eyJhbGc...', 'Yes'],
      ['VITE_APP_URL', 'https://yourdomain.com', 'Yes — for invite links & email redirects'],
      ['VITE_USE_MOCK_CRM', 'false', 'No — defaults false in production'],
    ],
    [3200, 3000, 3160]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Supabase Edge Function Secrets'),
  makeTable(
    ['Secret Name', 'Purpose'],
    [
      ['STRIPE_SECRET_KEY', 'Stripe API secret key (sk_live_...)'],
      ['STRIPE_WEBHOOK_SECRET', 'Stripe webhook signing secret (whsec_...)'],
      ['STRIPE_STARTER_PRICE_ID', 'Stripe Price ID for Starter plan'],
      ['STRIPE_PRO_PRICE_ID', 'Stripe Price ID for Pro plan'],
      ['STRIPE_DOMINATOR_PRICE_ID', 'Stripe Price ID for Dominator plan'],
      ['STRIPE_SPONSOR_PRICE_ID', 'Stripe Price ID for Sponsor plan'],
      ['SUPABASE_SERVICE_ROLE_KEY', 'Service-role key for privileged DB operations'],
    ],
    [4000, 5360]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '13.2 Supabase Setup Steps'),
  flowStep(1, '**Create project** at supabase.com. Note the Project URL and anon key.'),
  flowStep(2, '**Apply schema** — run `supabase/schema.sql` in the Supabase SQL Editor.'),
  flowStep(3, '**Apply migrations** — run each `supabase/migrations_*.sql` file in order.'),
  flowStep(4, '**Seed demo data** (optional) — run `supabase/seed_demo.sql` for test accounts.'),
  flowStep(5, '**Set Edge Function secrets** — use `supabase secrets set KEY=value`.'),
  flowStep(6, '**Deploy Edge Functions** — use `supabase functions deploy <function-name>`.'),
  flowStep(7, '**Register Stripe webhook** — point to Edge Function URL, subscribe to 5 events.'),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Edge Functions Reference'),
  makeTable(
    ['Function Name', 'Trigger', 'Key Operation'],
    [
      ['create-user', 'Called by admin.service.ts', 'Creates Supabase Auth user + profile atomically'],
      ['delete-user', 'Called by admin.service.ts', 'Deletes Auth user; cascades profile soft-delete'],
      ['stripe-webhook', 'Stripe HTTP webhook POST', 'Validates signature, handles checkout/payment events'],
      ['create-checkout-session', 'Called by useSubscriptions', 'Creates Stripe Checkout Session'],
      ['send-invite', 'Called by admin.service.ts', 'Creates invite token, sends email with accept link'],
      ['send-notification', 'Called by notification.service.ts', 'Dispatches transactional emails'],
    ],
    [3000, 2760, 3600]
  ),
  spacer(),
  h(HeadingLevel.HEADING_1, '13.3 Production Launch Checklist'),
  makeTable(
    ['Item', 'Status'],
    [
      ['Supabase project created (Production tier)', 'Required'],
      ['schema.sql and all migrations applied', 'Required'],
      ['All 6 Edge Functions deployed', 'Required'],
      ['All Edge Function secrets configured', 'Required'],
      ['Stripe webhook endpoint registered and active', 'Required'],
      ['HTTPS / SSL certificate active on custom domain', 'Required'],
      ['VITE_USE_MOCK_CRM set to false', 'Required'],
      ['Admin account created with strong password', 'Required'],
      ['At least one territory created', 'Required'],
      ['First Director account created via /admin/add-user', 'Recommended'],
      ['Commission rates confirmed in /admin/settings', 'Recommended'],
      ['End-to-end smoke test completed', 'Recommended'],
    ],
    [6560, 2800]
  ),
];

// ── Sign-Off Page
const signOff = [
  br(),
  new Paragraph({
    children: [new TextRun({ text: 'ACCEPTANCE SIGN-OFF', font: 'Arial', size: 36, bold: true, color: DARK, allCaps: true })],
    spacing: { before: 240, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PURPLE } }
  }),
  spacer(),
  p('By signing below, the associated stakeholders confirm that this documentation has been reviewed, is structurally accurate, is technically sound, and is approved as the authoritative operating manual for the **New Leaf Listings Platform**.'),
  spacer(),
  makeTable(
    ['Property', 'Value'],
    [
      ['Platform Name', 'New Leaf Listings Platform'],
      ['Document Version', '1.0'],
      ['Prepared By', 'Shreyansh — Digital Marketing Heroes'],
      ['Publication Date', 'April 2026'],
    ],
    [3000, 6360]
  ),
  spacer(),
  h(HeadingLevel.HEADING_2, 'Authorisation Signatures'),
  ...['Product Owner', 'Tech Lead', 'Security Admin', 'Engineering Lead', 'Client Sponsor'].map(role =>
    new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [2800, 4560, 1200, 800],
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            borders: { bottom: { style: BorderStyle.NONE, size: 0 }, top: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
            children: [new Paragraph({ children: [new TextRun({ text: `${role}:`, font: 'Arial', size: 22, bold: true })] })]
          }),
          new TableCell({
            width: { size: 4560, type: WidthType.DXA },
            borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '666666' }, top: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
            children: [new Paragraph({ children: [new TextRun('')] })]
          }),
          new TableCell({
            width: { size: 1200, type: WidthType.DXA },
            borders: { bottom: { style: BorderStyle.NONE, size: 0 }, top: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
            children: [new Paragraph({ children: [new TextRun({ text: 'Date:', font: 'Arial', size: 22, bold: true })] })]
          }),
          new TableCell({
            width: { size: 800, type: WidthType.DXA },
            borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '666666' }, top: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
            children: [new Paragraph({ children: [new TextRun('')] })]
          }),
        ]
      })]
    })
  ),
  spacer(),
  callout('**Note:** A counter-signed copy of this page must be retained in the project archive as the formal acceptance artefact. Any subsequent revisions require a fresh sign-off on the amended sections.', 'note'),
  spacer(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '"We Launch Brands in New Orbits" — digitalheroes.co.in', font: 'Arial', size: 20, italics: true, color: GRAY })],
    spacing: { before: 480 }
  }),
];

// ── Assemble Document ─────────────────────────────────────────────────────────
const allChildren = [
  ...coverContent,
  br(),
  // TOC heading
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: 'Table of Contents', font: 'Arial', size: 36, bold: true, color: DARK })],
    spacing: { before: 240, after: 200 }
  }),
  new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  ...sec1,
  ...sec2,
  ...sec3,
  ...sec4,
  ...sec5,
  ...sec6,
  ...sec7,
  ...sec8,
  ...sec9,
  ...sec10,
  ...sec11,
  ...sec12,
  ...sec13,
  ...signOff,
];

const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '\u2022',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      }]
    }]
  },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22 } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: PURPLE },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'New Leaf Listings Platform', font: 'Arial', size: 18, color: PURPLE, bold: true }),
              new TextRun({ text: '\t\tTechnical Documentation v1.0', font: 'Arial', size: 18, color: GRAY }),
            ],
            tabStops: [{ type: 'right', position: 8640 }],
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: PURPLE } },
            spacing: { after: 80 }
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: '"We Launch Brands in New Orbits" — digitalheroes.co.in', font: 'Arial', size: 16, italics: true, color: GRAY }),
              new TextRun({ text: '\t\tPage ', font: 'Arial', size: 16, color: GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: PURPLE, bold: true }),
            ],
            tabStops: [{ type: 'right', position: 8640 }],
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } },
            spacing: { before: 80 }
          })
        ]
      })
    },
    children: allChildren
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = 'C:\\Users\\Vikram Gondane\\OneDrive\\Desktop\\Asmit\\cluade projects\\newproject 28_03\\NewLeafListings_Documentation.docx';
  fs.writeFileSync(outPath, buffer);
  console.log('SUCCESS: ' + outPath);
}).catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
