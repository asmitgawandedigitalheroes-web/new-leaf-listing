import { supabase } from '../src/lib/supabase';
import { auditService } from './audit.service';

export type CrmProvider = 'ghl' | 'salespro' | 'leap';

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
    .single();

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

  if (!url) {
    // If in dev and we explicitly want mock, or just no config found in dev
    if (isMockMode || import.meta.env.DEV) {
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
 * Make a POST webhook call to a CRM provider.
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

  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = (supabase as any).supabaseUrl as string;

  const res = await fetch(`${supabaseUrl}/functions/v1/crm-retry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({
      provider,
      lead_id: leadId ?? null,
      payload,
      attempts: nextAttempt,
      last_error: error,
      status: nextAttempt >= 3 ? 'failed' : 'pending',
      next_retry_at: nextRetryAt,
    }),
  });

  if (!res.ok) {
    console.error(`[CrmService] queueForRetry Edge Function failed: ${res.status}`);
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
      .select('id, source, territory, status, assigned_realtor_id, contact_name, contact_masked_email, created_at')
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

    const payload = {
      event: 'lead.created',
      provider,
      timestamp: new Date().toISOString(),
      lead: {
        id: lead.id,
        source: lead.source,
        territory: lead.territory,
        status: lead.status,
        assigned_realtor_id: lead.assigned_realtor_id,
        contact_name: lead.contact_name,
        contact_masked_email: lead.contact_masked_email,
        created_at: lead.created_at,
      },
    };

    const result = await postWebhook(config, payload, provider);

    if (!result.success) {
      // Queue for retry — don't let a CRM outage block the routing flow
      await queueForRetry(provider, leadId, payload, result.error ?? `HTTP ${result.status_code}`).catch(console.error);
    }

    // Audit the sync
    await auditService.log(
      'system',
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
      'system',
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
   * Handle an incoming webhook event from a CRM provider.
   * Maps CRM events back to NLVListings lead/status updates.
   * @param payload - the raw webhook body from the CRM
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
        const leadId = payload.lead_id ?? payload.contact_id;
        const newStatus = payload.status;

        if (leadId && newStatus) {
          // Validate against the DB CHECK constraint before writing.
          // An invalid value from the CRM would cause a silent DB error.
          if (!VALID_LEAD_STATUSES.has(newStatus)) {
            console.warn(`[CrmService] Ignoring invalid lead status from CRM: "${newStatus}"`);
            return { handled: false };
          }

          await supabase
            .from('leads')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', leadId);

          await auditService.log(
            'system',
            'lead.status_changed',
            'lead',
            leadId,
            { provider, source: 'crm_webhook', new_status: newStatus }
          );
        }

        return { handled: true, action: 'lead.status_updated' };
      }

      case 'deal.won': {
        const leadId = payload.lead_id ?? payload.contact_id;
        if (leadId) {
          // BUG-015 fix: 'closed' is not a valid leads.status value.
          // The DB CHECK constraint allows: new, assigned, contacted, showing,
          // offer, converted, lost. A won deal maps to 'converted'.
          await supabase
            .from('leads')
            .update({ status: 'converted', updated_at: new Date().toISOString() })
            .eq('id', leadId);

          await auditService.log(
            'system',
            'lead.converted',
            'lead',
            leadId,
            { provider, source: 'crm_webhook' }
          );
        }
        return { handled: true, action: 'lead.converted' };
      }

      default:
        console.log(`[CrmService] Unhandled CRM event: ${event}`);
        return { handled: false };
    }
  },
};
