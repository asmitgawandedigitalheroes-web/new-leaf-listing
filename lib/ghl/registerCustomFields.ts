/**
 * lib/ghl/registerCustomFields.ts
 *
 * One-time setup script: registers all required NLV custom fields in GHL
 * for the configured location (VITE_GHL_LOCATION_ID).
 *
 * Run this once after initial GHL configuration:
 *   npx tsx lib/ghl/registerCustomFields.ts
 *
 * Safe to re-run — duplicate field names are silently skipped.
 */

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/** All custom fields NLVListings writes to GHL contacts */
const FIELDS_TO_REGISTER = [
  { name: 'nlv_lead_id',           dataType: 'TEXT',     placeholder: 'NLV Lead UUID' },
  { name: 'nlv_listing_id',        dataType: 'TEXT',     placeholder: 'NLV Listing UUID' },
  { name: 'nlv_territory',         dataType: 'TEXT',     placeholder: 'Territory ID' },
  { name: 'nlv_lead_status',       dataType: 'TEXT',     placeholder: 'new|assigned|contacted|showing|offer|converted|lost' },
  { name: 'nlv_assigned_to',       dataType: 'TEXT',     placeholder: 'Assigned Realtor ID' },
  { name: 'nlv_assigned_director', dataType: 'TEXT',     placeholder: 'Assigned Director ID' },
  { name: 'nlv_attribution_flag',  dataType: 'TEXT',     placeholder: 'platform|organic|referral' },
  { name: 'nlv_attribution_expiry',dataType: 'DATE',     placeholder: 'Attribution window expiry' },
  { name: 'nlv_commission_type',   dataType: 'TEXT',     placeholder: 'deal|subscription|referral' },
  { name: 'nlv_platform_lead',     dataType: 'CHECKBOX', placeholder: 'True if originated on NLV' },
] as const;

interface RegisterResult {
  field: string;
  status: 'created' | 'skipped' | 'error';
  id?: string;
  error?: string;
}

/**
 * Register all NLV custom fields in the GHL location.
 *
 * @returns Array of results per field — useful for logging in the admin UI
 */
export async function registerCustomFields(): Promise<RegisterResult[]> {
  const apiKey     = import.meta?.env?.VITE_GHL_API_KEY ?? '';
  const locationId = import.meta?.env?.VITE_GHL_LOCATION_ID ?? '';

  if (!apiKey || !locationId) {
    throw new Error('VITE_GHL_API_KEY and VITE_GHL_LOCATION_ID must be set');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${apiKey}`,
    Version:        '2021-07-28',
  };

  // Fetch existing fields to avoid duplicates
  const existingRes = await fetch(
    `${GHL_API_BASE}/locations/${locationId}/customFields`,
    { headers }
  );
  const existingBody = await existingRes.json().catch(() => ({ customFields: [] }));
  const existingNames = new Set<string>(
    (existingBody.customFields ?? []).map((f: any) => f.name as string)
  );

  const results: RegisterResult[] = [];

  for (const field of FIELDS_TO_REGISTER) {
    if (existingNames.has(field.name)) {
      results.push({ field: field.name, status: 'skipped' });
      continue;
    }

    try {
      const res = await fetch(
        `${GHL_API_BASE}/locations/${locationId}/customFields`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name:        field.name,
            dataType:    field.dataType,
            placeholder: field.placeholder,
            model:       'contact',
          }),
        }
      );

      const body = await res.json().catch(() => null);

      if (res.ok) {
        const fieldId = body?.customField?.id ?? body?.id;
        results.push({ field: field.name, status: 'created', id: fieldId });
        console.info(`[registerCustomFields] Created: ${field.name} (${fieldId})`);
      } else {
        // GHL returns 422 for duplicate names in some API versions — treat as skip
        if (res.status === 422 || body?.message?.toLowerCase().includes('duplicate')) {
          results.push({ field: field.name, status: 'skipped' });
        } else {
          results.push({ field: field.name, status: 'error', error: body?.message ?? `HTTP ${res.status}` });
        }
      }
    } catch (err: any) {
      results.push({ field: field.name, status: 'error', error: err.message });
    }
  }

  const created  = results.filter(r => r.status === 'created').length;
  const skipped  = results.filter(r => r.status === 'skipped').length;
  const errored  = results.filter(r => r.status === 'error').length;
  console.info(`[registerCustomFields] Done — created: ${created}, skipped: ${skipped}, errors: ${errored}`);

  return results;
}
