import { supabase } from '../src/lib/supabase';
import { auditService } from './audit.service';
import { triggerFollowUp } from '../lib/ghl/triggerFollowUp';

export type CrmProvider = 'ghl';

// Must match the DB CHECK constraint on leads.status exactly.
const VALID_LEAD_STATUSES = new Set(['new', 'assigned', 'contacted', 'showing', 'offer', 'converted', 'lost']);

export interface WebhookConfig {
  url: string;
  auth_header: string;
  auth_value: string;
  is_mock?: boolean;
}

export interface CrmSyncResult {
  success: boolean;
  provider: CrmProvider;
  status_code?: number;
  response?: any;
  error?: string;
}

/**
 * Retrieve the webhook configuration for a CRM provider.
 * Reads from Supabase settings table or falls back to env vars.
 */
const getWebhookConfig = async (provider: CrmProvider): Promise<WebhookConfig | null> => {
  const isMockMode = import.meta.env.VITE_USE_MOCK_CRM === 'true';

  // Try fetching from supabase crm_configs table first
  const { data } = await supabase
    .from('crm_configs')
    .select('webhook_url, auth_header, auth_value')
    .eq('provider', provider)
    .maybeSingle();

  if (data) {
    return {
      url: data.webhook_url,
      auth_header: data.auth_header ?? 'Authorization',
      auth_value: data.auth_value,
      is_mock: isMockMode,
    };
  }

  // Fallback to environment variables
  const envPrefix = provider.toUpperCase();
  const url = import.meta?.env?.[`VITE_${envPrefix}_WEBHOOK_URL`] ?? null;
  const authValue = import.meta?.env?.[`VITE_${envPrefix}_API_KEY`] ?? null;

  // If we have an API key, the direct GHL API doesn't need a webhook URL
  if (!url && authValue && !isMockMode) {
    return {
      url: '',
      auth_header: 'Authorization',
      auth_value: `Bearer ${authValue}`,
      is_mock: false,
    };
  }

  if (!url) {
    if (isMockMode) {
      console.info(`[CrmService] Using MOCK configuration for ${provider}`);
      return {
        url: `https://mock-crm.api/${provider}`,
        auth_header: 'Authorization',
        auth_value: 'mock-key',
        is_mock: true,
      };
    }
    return null;
  }

  return {
    url,
    auth_header: 'Authorization',
    auth_value: authValue ? `Bearer ${authValue}` : '',
    is_mock: isMockMode,
  };
};

/**
 * Call the GHL Contacts API to create or update a contact.
 * PIT tokens (pit-...) use the v2 LeadConnector API.
 * Legacy agency keys use the v1 REST API.
 */
const syncToGhlApi = async (
  apiKey: string,
  lead: Record<string, any>
): Promise<CrmSyncResult & { provider: CrmProvider }> => {
  const isPit = apiKey.startsWith('pit-');

  // v2 uses customFields (array of {id, field_value}); v1 uses customField with fieldValue
  const locationId = import.meta?.env?.VITE_GHL_LOCATION_ID ?? null;

  // PIT tokens → v2 LeadConnector API; agency keys → v1
  // Agency-level PIT tokens require locationId as a query param (body causes 422, missing causes 403)
  const baseUrl = isPit
    ? 'https://services.leadconnectorhq.com/contacts/'
    : 'https://rest.gohighlevel.com/v1/contacts/';
  const url = isPit && locationId
    ? `${baseUrl}?locationId=${locationId}`
    : baseUrl;

  const nameParts = (lead.contact_name ?? 'Lead').split(' ');
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(' ') || undefined;

  // 180-day attribution expiry timestamp (ISO string)
  const attributionExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  const contactPayload: Record<string, any> = {
    firstName,
    lastName,
    email:  lead.contact_email ?? lead.contact_masked_email ?? undefined,
    phone:  lead.contact_phone ?? undefined,
    source: lead.source ?? 'NLV Listings',
    tags:   ['nlv-lead', 'platform_lead', lead.territory_id ?? 'unassigned'].filter(Boolean),
    ...(isPit
      ? {
          customFields: [
            { id: 'nlv_lead_id',            field_value: lead.id },
            { id: 'nlv_listing_id',         field_value: lead.listing_id ?? '' },
            { id: 'nlv_territory',          field_value: lead.territory_id ?? '' },
            { id: 'nlv_lead_status',        field_value: lead.status ?? 'new' },
            { id: 'nlv_assigned_to',        field_value: lead.assigned_realtor_id ?? '' },
            { id: 'nlv_assigned_director',  field_value: lead.assigned_director_id ?? '' },
            { id: 'nlv_attribution_flag',   field_value: 'platform' },
            { id: 'nlv_attribution_expiry', field_value: attributionExpiry },
            { id: 'nlv_commission_type',    field_value: lead.lead_type ?? 'deal' },
            { id: 'nlv_platform_lead',      field_value: 'true' },
          ],
        }
      : {
          customField: [
            { id: 'nlv_lead_id',            fieldValue: lead.id },
            { id: 'nlv_territory',          fieldValue: lead.territory_id ?? '' },
            { id: 'nlv_lead_status',        fieldValue: lead.status ?? 'new' },
            { id: 'nlv_assigned_to',        fieldValue: lead.assigned_realtor_id ?? '' },
            { id: 'nlv_assigned_director',  fieldValue: lead.assigned_director_id ?? '' },
            { id: 'nlv_attribution_flag',   fieldValue: 'platform' },
            { id: 'nlv_attribution_expiry', fieldValue: attributionExpiry },
            { id: 'nlv_platform_lead',      fieldValue: 'true' },
          ],
        }),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (isPit) headers['Version'] = '2021-07-28';

  try {
    let response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(contactPayload),
    });

    let responseBody = await response.json().catch(() => null);

    // GHL blocks duplicate contacts — find existing by email and update instead
    if (!response.ok && response.status === 400 && responseBody?.message?.includes('duplicat')) {
      const email = contactPayload.email;
      if (email && isPit && locationId) {
        const searchRes = await fetch(
          `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email)}`,
          { headers }
        );
        const searchBody = await searchRes.json().catch(() => null);
        const existingId = searchBody?.contact?.id;

        if (existingId) {
          const putUrl = locationId
            ? `https://services.leadconnectorhq.com/contacts/${existingId}?locationId=${locationId}`
            : `https://services.leadconnectorhq.com/contacts/${existingId}`;
          response = await fetch(putUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(contactPayload),
          });
          responseBody = await response.json().catch(() => null);
        }
      }
    }

    if (!response.ok) {
      console.error('[CrmService] GHL API error:', responseBody);
    }

    return {
      success: response.ok,
      provider: 'ghl',
      status_code: response.status,
      response: responseBody,
    };
  } catch (err: any) {
    console.error('[CrmService] GHL API call failed:', err);
    return { success: false, provider: 'ghl', error: err.message };
  }
};

/**
 * Make a POST webhook call to a CRM provider.
 * Used for status updates and test pings (not lead creation).
 */
const postWebhook = async (
  config: WebhookConfig,
  payload: Record<string, any>,
  provider: CrmProvider
): Promise<CrmSyncResult & { provider: CrmProvider }> => {
  if (config.is_mock) {
    const isSuccess = Math.random() > 0.1; // 90% success rate in mock mode
    console.log(`[CrmService] [MOCK] Sending to ${provider}:`, payload);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (isSuccess) {
      return {
        success: true,
        provider,
        status_code: 200,
        response: { message: 'Mock success', id: `mock-${Date.now()}` },
      };
    } else {
      console.warn(`[CrmService] [MOCK] Simulated network failure for ${provider}`);
      return {
        success: false,
        provider,
        status_code: 500,
        error: 'Simulated mock network error',
      };
    }
  }

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [config.auth_header]: config.auth_value,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json().catch(() => null);

    return {
      success: response.ok,
      provider,
      status_code: response.status,
      response: responseBody,
    };
  } catch (err: any) {
    console.error('[CrmService] Webhook error:', err);
    return { success: false, provider, error: err.message };
  }
};

/**
 * Queue a failed CRM sync for retry via the crm-retry Edge Function.
 *
 * Direct client-side inserts into crm_sync_queue are intentionally blocked
 * (the RLS INSERT policy for authenticated users was dropped in
 * migrations_architecture_fixes.sql) because any authenticated user could
 * otherwise trigger outbound HTTP calls to arbitrary CRM webhook URLs.
 *
 * The retry entry is recorded via the crm-retry Edge Function which runs
 * under service_role and therefore bypasses RLS safely.
 */
const queueForRetry = async (
  provider: CrmProvider,
  leadId: string | undefined,
  payload: Record<string, any>,
  error: string,
  existingAttempts = 0
): Promise<void> => {
  const nextAttempt = existingAttempts + 1;
  // Exponential backoff: 5 min, 15 min, 45 min
  const backoffMinutes = Math.pow(3, nextAttempt) * 5;
  const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

  const { error: invokeError } = await supabase.functions.invoke('crm-retry', {
    body: {
      provider,
      lead_id: leadId ?? null,
      payload,
      attempts: nextAttempt,
      last_error: error,
      status: nextAttempt >= 3 ? 'failed' : 'pending',
      next_retry_at: nextRetryAt,
    },
  });

  if (invokeError) {
    console.error('[CrmService] queueForRetry Edge Function failed:', invokeError.message);
  }
};

export const crmService = {
  /**
   * BUG-014 fix: Accept a leadId string (matching all call sites) and fetch
   * the lead row internally. The previous signature `lead: Partial<Lead>`
   * caused a type mismatch — routing.service passes only the ID string.
   *
   * Push a lead to the configured CRM provider via webhook.
   * On failure, enqueues to crm_sync_queue for retry (up to 3 attempts).
   * Defaults to 'ghl' if no provider override given.
   */
  syncLead: async (leadId: string, provider: CrmProvider = 'ghl'): Promise<CrmSyncResult> => {
    // Fetch the full lead row so the payload contains real data
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, source, territory_id, status, assigned_realtor_id, assigned_director_id, listing_id, lead_type, contact_name, contact_email, contact_phone, contact_masked_email, created_at')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead) {
      console.error(`[CrmService] Could not fetch lead ${leadId}:`, fetchError?.message);
      return { success: false, provider, error: `Lead not found: ${leadId}` };
    }

    const config = await getWebhookConfig(provider);

    if (!config) {
      console.warn(`[CrmService] No webhook config found for provider: ${provider}`);
      return { success: false, provider, error: 'No webhook configuration found' };
    }

    // For GHL: use the direct Contacts API (no premium workflow trigger needed).
    // Falls back to webhook POST for mock mode or other providers.
    const payload = {
      event: 'lead.created',
      provider,
      timestamp: new Date().toISOString(),
      lead: {
        id: lead.id,
        source: lead.source,
        territory_id: lead.territory_id,
        status: lead.status,
        assigned_realtor_id: lead.assigned_realtor_id,
        contact_name: lead.contact_name,
        contact_masked_email: lead.contact_masked_email,
        created_at: lead.created_at,
      },
    };

    let result: CrmSyncResult & { provider: CrmProvider };
    if (provider === 'ghl' && !config.is_mock && config.auth_value) {
      // Strip 'Bearer ' prefix if the stored value already includes it
      const apiKey = config.auth_value.replace(/^Bearer\s+/i, '');
      result = await syncToGhlApi(apiKey, lead);
    } else {
      result = await postWebhook(config, payload, provider);
    }

    if (result.success) {
      // Write back sync status and GHL contact ID so the UI can show acknowledgment
      const ghlContactId = result.response?.contact?.id ?? result.response?.id ?? null;
      await supabase
        .from('leads')
        .update({
          crm_sync_status: 'synced',
          ...(ghlContactId ? { ghl_contact_id: ghlContactId } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      // Enroll in GHL follow-up workflow (fire-and-forget)
      if (ghlContactId && provider === 'ghl') {
        triggerFollowUp(ghlContactId, lead).catch(err =>
          console.warn('[CrmService] Follow-up trigger failed (non-fatal):', err)
        );
      }
    } else {
      // Queue for retry — don't let a CRM outage block the routing flow
      await queueForRetry(provider, leadId, payload, result.error ?? `HTTP ${result.status_code}`).catch(console.error);
    }

    // Audit the sync
    await auditService.log(
      null,
      'lead.assigned',
      'crm_sync',
      leadId,
      { 
        provider, 
        success: result.success, 
        status_code: result.status_code,
        is_mock: config.is_mock 
      }
    );

    return result;
  },

  /**
   * Send a lead status update to the CRM.
   */
  syncLeadStatus: async (leadId: string, status: string, provider: CrmProvider = 'ghl'): Promise<CrmSyncResult> => {
    const config = await getWebhookConfig(provider);

    if (!config) {
      return { success: false, provider, error: 'No webhook configuration found' };
    }

    const payload = {
      event: 'lead.status_changed',
      provider,
      timestamp: new Date().toISOString(),
      lead_id: leadId,
      status,
    };

    const result = await postWebhook(config, payload, provider);

    await auditService.log(
      null,
      'lead.status_changed',
      'crm_sync',
      leadId,
      { 
        provider, 
        status, 
        success: result.success,
        is_mock: config.is_mock
      }
    );

    return result;
  },

  /**
   * Retrieve webhook config for a given provider (useful for UI settings page).
   */
  getWebhookConfig,

  /**
   * Test connectivity to a CRM provider by sending a ping payload.
   */
  testConnection: async (provider: CrmProvider): Promise<CrmSyncResult> => {
    const config = await getWebhookConfig(provider);

    if (!config) {
      return { success: false, provider, error: 'No webhook configuration found' };
    }

    const payload = {
      event: 'ping',
      provider,
      timestamp: new Date().toISOString(),
    };

    const result = await postWebhook(config, payload, provider);
    return result;
  },

  /**
   * Verify a GHL inbound webhook signature using HMAC-SHA256.
   * GHL signs the raw request body with GHL_WEBHOOK_SECRET.
   *
   * @param rawBody   - The raw string body from the request
   * @param signature - Value of the x-ghl-signature header
   * @returns true if the signature matches, false otherwise
   */
  verifyWebhookSignature: async (rawBody: string, signature: string): Promise<boolean> => {
    const secret = import.meta?.env?.VITE_GHL_WEBHOOK_SECRET ?? '';
    if (!secret) {
      console.warn('[CrmService] VITE_GHL_WEBHOOK_SECRET not set — skipping signature check');
      return true; // Permissive in dev; tighten in production
    }
    try {
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', keyMaterial, encoder.encode(rawBody));
      const computed = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return computed === signature.replace(/^sha256=/, '');
    } catch (err) {
      console.error('[CrmService] Signature verification error:', err);
      return false;
    }
  },

  /**
   * Handle an incoming webhook event from a CRM provider.
   * Maps CRM events back to NLVListings lead/status/listing updates.
   * @param payload  - the raw webhook body from the CRM
   * @param provider - which CRM sent the event
   */
  handleIncomingWebhook: async (
    payload: Record<string, any>,
    provider: CrmProvider
  ): Promise<{ handled: boolean; action?: string }> => {
    console.log(`[CrmService] Incoming webhook from ${provider}:`, payload);

    const event = payload.event ?? payload.type ?? 'unknown';

    switch (event) {
      case 'contact.updated':
      case 'lead.status_changed': {
        const leadId  = payload.lead_id ?? payload.contact_id;
        const newStatus = payload.status;

        if (leadId && newStatus) {
          if (!VALID_LEAD_STATUSES.has(newStatus)) {
            console.warn(`[CrmService] Ignoring invalid lead status from CRM: "${newStatus}"`);
            return { handled: false };
          }
          await supabase
            .from('leads')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', leadId);
          await auditService.log(null, 'lead.status_changed', 'lead', leadId,
            { provider, source: 'crm_webhook', new_status: newStatus });
        }
        return { handled: true, action: 'lead.status_updated' };
      }

      case 'opportunity.stageChanged': {
        // Mirror the GHL pipeline stage back to the NLV listing status
        const listingId = payload.customField?.nlv_listing_id ?? payload.listing_id;
        const ghlStage  = payload.stage?.id ?? payload.stageId ?? '';

        // Reverse-map GHL stage → NLV status
        const GHL_TO_NLV: Record<string, string> = {
          stage_new_lead:         'draft',
          stage_qualifying:       'pending',
          stage_active_listing:   'active',
          stage_under_contract:   'under_contract',
          stage_closed_won:       'sold',
          stage_closed_lost:      'expired',
        };
        const nlvStatus = GHL_TO_NLV[ghlStage];

        if (listingId && nlvStatus) {
          await supabase
            .from('listings')
            .update({ status: nlvStatus, updated_at: new Date().toISOString() })
            .eq('id', listingId);
          await auditService.log(null, 'listing.status_changed', 'listing', listingId,
            { provider, source: 'crm_webhook', ghl_stage: ghlStage, new_status: nlvStatus });
        }
        return { handled: true, action: 'listing.stage_synced' };
      }

      case 'opportunity.statusChanged': {
        // If GHL marks an opportunity as "won", trigger commission approval flow
        const listingId = payload.customField?.nlv_listing_id ?? payload.listing_id;
        const oppStatus = payload.status ?? '';

        if (oppStatus === 'won' && listingId) {
          await supabase
            .from('listings')
            .update({ status: 'sold', updated_at: new Date().toISOString() })
            .eq('id', listingId);
          await auditService.log(null, 'listing.sold', 'listing', listingId,
            { provider, source: 'crm_webhook', trigger: 'opportunity.statusChanged' });
        }
        return { handled: true, action: 'listing.marked_sold' };
      }

      case 'deal.won': {
        const leadId = payload.lead_id ?? payload.contact_id;
        if (leadId) {
          await supabase
            .from('leads')
            .update({ status: 'converted', updated_at: new Date().toISOString() })
            .eq('id', leadId);
          await auditService.log(null, 'lead.converted', 'lead', leadId,
            { provider, source: 'crm_webhook' });
        }
        return { handled: true, action: 'lead.converted' };
      }

      default:
        console.log(`[CrmService] Unhandled CRM event: ${event}`);
        return { handled: false };
    }
  },
};
