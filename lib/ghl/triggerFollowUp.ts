/**
 * lib/ghl/triggerFollowUp.ts
 *
 * Enrolls a GHL contact in the configured follow-up workflow on lead creation.
 * Uses the GHL Workflows API (v2 LeadConnector).
 *
 * Called after a lead is created and synced to GHL (contact ID must exist).
 */

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/** Build shared GHL v2 headers */
function ghlHeaders(): Record<string, string> {
  const apiKey = import.meta?.env?.VITE_GHL_API_KEY ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${apiKey}`,
    Version:        '2021-07-28',
  };
}

/**
 * Enroll a GHL contact in the platform follow-up workflow.
 *
 * Tags passed to GHL allow the workflow to branch by territory and source.
 *
 * @param ghlContactId - The GHL contact UUID returned by syncLead()
 * @param lead         - Partial lead row used to build tags
 */
export async function triggerFollowUp(
  ghlContactId: string,
  lead: {
    territory_id?: string | null;
    source?: string | null;
    id?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const workflowId = import.meta?.env?.VITE_GHL_FOLLOWUP_WORKFLOW_ID ?? '';
  const locationId = import.meta?.env?.VITE_GHL_LOCATION_ID ?? '';

  if (!workflowId) {
    console.warn('[triggerFollowUp] VITE_GHL_FOLLOWUP_WORKFLOW_ID not set — skipping workflow enroll');
    return { success: false, error: 'Workflow ID not configured' };
  }

  const tags = [
    'platform_lead',
    lead.territory_id  ? `territory_${lead.territory_id}`  : null,
    lead.source        ? lead.source.toLowerCase()          : null,
  ].filter(Boolean) as string[];

  try {
    // Step 1 — Apply tags to the contact so workflow branching works
    if (tags.length) {
      await fetch(`${GHL_API_BASE}/contacts/${ghlContactId}/tags`, {
        method: 'POST',
        headers: ghlHeaders(),
        body: JSON.stringify({ tags }),
      });
    }

    // Step 2 — Enroll in the follow-up workflow
    const res = await fetch(
      `${GHL_API_BASE}/contacts/${ghlContactId}/workflow/${workflowId}`,
      {
        method: 'POST',
        headers: ghlHeaders(),
        body: JSON.stringify({ locationId }),
      }
    );

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('[triggerFollowUp] Workflow enroll failed:', body);
      return { success: false, error: body?.message ?? `HTTP ${res.status}` };
    }

    console.info(`[triggerFollowUp] Contact ${ghlContactId} enrolled in workflow ${workflowId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[triggerFollowUp] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}
