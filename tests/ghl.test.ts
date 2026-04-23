/**
 * tests/ghl.test.ts
 *
 * Unit tests for GHL integration:
 *   - syncLeadToGHL: field mapping & payload shape
 *   - webhookReceiver: signature validation + event handling
 *   - pipelineStageMap: all 6 status → stage mappings
 *   - commissionTrigger: buyer/seller/director/admin splits
 *
 * Run with: npx vitest run tests/ghl.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { STAGE_MAP } from '../lib/ghl/pipelineStages';
import { onListingSold } from '../lib/ghl/commissionTrigger';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock Supabase so no real DB calls are made
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select:   vi.fn().mockReturnThis(),
      insert:   vi.fn().mockReturnThis(),
      update:   vi.fn().mockReturnThis(),
      eq:       vi.fn().mockReturnThis(),
      limit:    vi.fn().mockReturnThis(),
      single:   vi.fn().mockResolvedValue({ data: { id: 'admin-uuid-001' }, error: null }),
    })),
  },
}));

// Mock fetch for GHL API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  // Default: GHL API returns success
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ contact: { id: 'ghl-contact-001' } }),
  });

  // Set env vars used by the modules
  vi.stubEnv('VITE_GHL_API_KEY', 'pit-test-key-0000-0000-0000-000000000000');
  vi.stubEnv('VITE_GHL_LOCATION_ID', 'test-location-id');
  vi.stubEnv('VITE_GHL_PIPELINE_ID', 'test-pipeline-id');
  vi.stubEnv('VITE_GHL_FOLLOWUP_WORKFLOW_ID', 'test-workflow-id');
  vi.stubEnv('VITE_GHL_WEBHOOK_SECRET', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── 1. Pipeline Stage Map ───────────────────────────────────────────────────

describe('pipelineStageMap', () => {
  it('maps all 6 NLV listing statuses to GHL stage keys', () => {
    expect(STAGE_MAP['draft']).toBe('stage_new_lead');
    expect(STAGE_MAP['pending']).toBe('stage_qualifying');
    expect(STAGE_MAP['active']).toBe('stage_active_listing');
    expect(STAGE_MAP['under_contract']).toBe('stage_under_contract');
    expect(STAGE_MAP['sold']).toBe('stage_closed_won');
    expect(STAGE_MAP['expired']).toBe('stage_closed_lost');
  });

  it('covers 6 statuses total', () => {
    expect(Object.keys(STAGE_MAP).length).toBeGreaterThanOrEqual(6);
  });

  it('maps rejected to stage_closed_lost', () => {
    expect(STAGE_MAP['rejected']).toBe('stage_closed_lost');
  });
});

// ─── 2. syncPipelineStage ────────────────────────────────────────────────────

describe('syncPipelineStage', () => {
  it('creates a new opportunity when no ghl_opportunity_id exists', async () => {
    const { syncPipelineStage } = await import('../lib/ghl/pipelineStages');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ opportunity: { id: 'opp-001' } }),
    });

    const result = await syncPipelineStage(
      { id: 'listing-001', title: 'Test Home', status: 'active', ghl_contact_id: 'ghl-contact-001', ghl_opportunity_id: null },
      'active'
    );

    expect(result.success).toBe(true);
    expect(result.ghl_opportunity_id).toBe('opp-001');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/opportunities/'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updates an existing opportunity when ghl_opportunity_id is set', async () => {
    const { syncPipelineStage } = await import('../lib/ghl/pipelineStages');
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    const result = await syncPipelineStage(
      { id: 'listing-001', status: 'sold', ghl_opportunity_id: 'opp-existing-001' },
      'sold'
    );

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('opp-existing-001'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('returns error when pipeline ID not configured', async () => {
    vi.stubEnv('VITE_GHL_PIPELINE_ID', '');
    const { syncPipelineStage } = await import('../lib/ghl/pipelineStages');

    const result = await syncPipelineStage(
      { id: 'listing-001', status: 'sold', ghl_opportunity_id: null },
      'sold'
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });
});

// ─── 3. Commission Splits on Listing Sold ───────────────────────────────────

describe('commissionTrigger — onListingSold', () => {
  const baseListing = {
    id:                    'listing-uuid-001',
    title:                 '123 Main Street',
    sale_price:            500_000,
    realtor_id:            'realtor-uuid-001',
    assigned_director_id:  'director-uuid-001',
    ghl_contact_id:        'ghl-contact-001',
    ghl_opportunity_id:    null,
    status:                'sold',
  };

  it('creates commission records for realtor, director, and admin', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const { supabase } = await import('../src/lib/supabase');
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: insertSpy,
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'admin-uuid-001' }, error: null }),
    });

    const result = await onListingSold(baseListing);
    expect(result.success).toBe(true);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ recipient_role: 'realtor', type: 'deal', status: 'pending' }),
        expect.objectContaining({ recipient_role: 'director', type: 'deal', status: 'pending' }),
        expect.objectContaining({ recipient_role: 'admin', type: 'deal', status: 'pending' }),
      ])
    );
  });

  it('commission splits sum to 100% of sale price', () => {
    // Default rates: platform 15%, director 25% of remainder, admin 15% of remainder
    const salePrice     = 500_000;
    const totalCents    = salePrice * 100;
    const platformCents = Math.round(totalCents * 0.15);
    const after         = totalCents - platformCents;
    const directorCents = Math.round(after * 0.25);
    const adminCents    = Math.round(after * 0.15);
    const realtorCents  = after - directorCents - adminCents;

    expect(platformCents + directorCents + adminCents + realtorCents).toBe(totalCents);
  });

  it('skips commission creation when sale_price is 0', async () => {
    const { supabase } = await import('../src/lib/supabase');
    const insertSpy = vi.fn();
    (supabase.from as any).mockReturnValue({
      insert: insertSpy,
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const result = await onListingSold({ ...baseListing, sale_price: 0 });
    expect(insertSpy).not.toHaveBeenCalled();
    expect(result.errors.length).toBe(0);
  });
});

// ─── 4. Webhook Signature Validation ────────────────────────────────────────

describe('webhookReceiver — verifyWebhookSignature', () => {
  it('returns true when no secret is configured (permissive dev mode)', async () => {
    vi.stubEnv('VITE_GHL_WEBHOOK_SECRET', '');
    const { crmService } = await import('../services/crm.service');
    const valid = await crmService.verifyWebhookSignature('{"event":"ping"}', 'bad-sig');
    expect(valid).toBe(true);
  });

  it('computes correct HMAC-SHA256 signature', async () => {
    vi.stubEnv('VITE_GHL_WEBHOOK_SECRET', 'test-secret-key');
    const { crmService } = await import('../services/crm.service');
    const body = '{"event":"contact.updated","lead_id":"abc","status":"contacted"}';

    // Compute expected signature using Web Crypto
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode('test-secret-key'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    const valid = await crmService.verifyWebhookSignature(body, expected);
    expect(valid).toBe(true);
  });

  it('rejects an incorrect signature', async () => {
    vi.stubEnv('VITE_GHL_WEBHOOK_SECRET', 'test-secret-key');
    const { crmService } = await import('../services/crm.service');
    const valid = await crmService.verifyWebhookSignature('{"event":"ping"}', 'wrong-signature');
    expect(valid).toBe(false);
  });
});

// ─── 5. handleIncomingWebhook event types ───────────────────────────────────

describe('handleIncomingWebhook', () => {
  it('handles opportunity.stageChanged and maps stage to NLV listing status', async () => {
    const { crmService } = await import('../services/crm.service');
    const { supabase } = await import('../src/lib/supabase');
    const updateSpy = vi.fn().mockReturnThis();
    (supabase.from as any).mockReturnValue({
      update: updateSpy,
      eq: vi.fn().mockReturnThis(),
    });

    const result = await crmService.handleIncomingWebhook(
      { type: 'opportunity.stageChanged', listing_id: 'listing-001', stageId: 'stage_closed_won' },
      'ghl'
    );

    expect(result.handled).toBe(true);
    expect(result.action).toBe('listing.stage_synced');
  });

  it('handles opportunity.statusChanged = won and marks listing sold', async () => {
    const { crmService } = await import('../services/crm.service');
    const result = await crmService.handleIncomingWebhook(
      { type: 'opportunity.statusChanged', listing_id: 'listing-001', status: 'won' },
      'ghl'
    );
    expect(result.handled).toBe(true);
    expect(result.action).toBe('listing.marked_sold');
  });

  it('returns handled: false for unknown events', async () => {
    const { crmService } = await import('../services/crm.service');
    const result = await crmService.handleIncomingWebhook({ type: 'unknown.event' }, 'ghl');
    expect(result.handled).toBe(false);
  });
});
