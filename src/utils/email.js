import { supabase } from '../lib/supabase';

function buildInviteEmailHtml({ fullName, role, inviteUrl, territory, isDetailedInvite }) {
  const roleLabel = role === 'director' ? 'Regional Director' : 'Realtor';
  const greeting  = fullName ? `Hi ${fullName},` : 'Hi there,';
  const action    = isDetailedInvite
    ? 'Click the button below to set your password and activate your account immediately — no approval needed.'
    : 'Click the button below to create your account. Your role and territory are already pre-assigned — just fill in your details.';

  const territoryLine = territory
    ? `<p style="margin:0 0 20px;font-size:13px;color:#6B7280;">Territory: <strong>${territory}</strong></p>`
    : '';

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#1F4D3A;padding:28px 32px;text-align:center;">
          <span style="color:#D4AF37;font-size:22px;font-weight:900;letter-spacing:-0.5px;">NLV Listings</span>
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:15px;color:#111;">${greeting}</p>
          <p style="margin:0 0 20px;font-size:14px;color:#4B5563;line-height:1.6;">
            You've been invited to join <strong>NLV Listings</strong> as a <strong>${roleLabel}</strong>.
          </p>
          ${territoryLine}
          <p style="margin:0 0 28px;font-size:14px;color:#4B5563;line-height:1.6;">${action}</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td align="center" style="background:#D4AF37;border-radius:10px;">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;color:#111;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
                ${isDetailedInvite ? 'Set Password & Activate Account' : 'Create Your Account'}
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;">Or copy this link:</p>
          <p style="margin:0 0 28px;font-size:11px;color:#6B7280;word-break:break-all;background:#F3F4F6;padding:10px 14px;border-radius:8px;">${inviteUrl}</p>
          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
            Questions? Email <a href="mailto:support@nlvlistings.com" style="color:#1F4D3A;">support@nlvlistings.com</a>
          </p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:18px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">© NLV Listings — Premium Real Estate Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send an invite email via the send-email Supabase edge function.
 * @param {object} opts
 * @param {string} opts.to          - Recipient email
 * @param {string} [opts.fullName]  - Recipient name
 * @param {string} opts.role        - 'realtor' | 'director'
 * @param {string} opts.inviteUrl   - The signup/accept-invite URL
 * @param {string} [opts.territory] - Territory name (shown in email body)
 * @param {boolean} [opts.isDetailedInvite] - true = accept-invite flow, false = signup flow
 * @returns {Promise<{sent: boolean, error: string|null}>}
 */
export async function sendInviteEmail({ to, fullName, role, inviteUrl, territory, isDetailedInvite = false }) {
  const roleLabel = role === 'director' ? 'Regional Director' : 'Realtor';
  const subject   = isDetailedInvite
    ? `You've been invited to join NLV Listings as a ${roleLabel}`
    : `Your invite to join NLV Listings as a ${roleLabel}`;

  const html = buildInviteEmailHtml({ fullName, role, inviteUrl, territory, isDetailedInvite });

  // Use refreshSession to guarantee a non-expired access token.
  // getSession() can return a stale token if the background refresh hasn't
  // completed yet, causing the edge function to reject with 401.
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  const session = refreshData?.session;

  if (refreshError || !session?.access_token) {
    // Fall back to the existing session if refresh fails (e.g. offline)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const fallbackSession = sessionData?.session;
    if (sessionError || !fallbackSession?.access_token) {
      return { sent: false, error: 'Not authenticated. Please log in again.' };
    }
    supabase.functions.setAuth(fallbackSession.access_token);
  } else {
    // Explicitly push the fresh token into the Functions client so it is always
    // present in the Authorization header — regardless of SDK auto-injection timing.
    supabase.functions.setAuth(session.access_token);
  }

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, html },
  });

  if (error) return { sent: false, error: error.message };
  if (data?.error) return { sent: false, error: data.error };
  return { sent: true, error: null };
}
