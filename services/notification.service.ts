import { supabase } from '../src/lib/supabase';
import { adminApi } from '../lib/api';

export type NotificationType = 'lead' | 'listing' | 'payment' | 'commission' | 'system';

export interface InAppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  entity_id: string | null;
  read: boolean;
  created_at: string;
}

/**
 * Send an email via the send-email Edge Function.
 * Returns true if the email was accepted by the mail server, false otherwise.
 */
const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = (supabase as any).supabaseUrl as string;

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ to, subject, html }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[NotificationService] sendEmail failed:', text);
      return false;
    }

    console.log(`[NotificationService] Email sent successfully to ${to}`);
    return true;
  } catch (err: any) {
    console.error('[NotificationService] sendEmail failed:', err.message);
    return false;
  }
};

export const notificationService = {
  /** Low-level email sender (exposed for direct use or testing). */
  sendEmail,

  /**
   * Notify a realtor and director that a new lead has been assigned.
   */
  notifyNewLead: async (leadId: string, realtorId: string, directorId: string | null): Promise<void> => {
    // Fetch realtor email
    const { data: realtor } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', realtorId)
      .single();

    if (realtor?.email) {
      await sendEmail(
        realtor.email,
        'New Lead Assigned to You',
        `<p>Hi ${realtor.full_name ?? 'there'},</p>
         <p>A new lead has been assigned to you on NLVListings. Please log in to view and contact the lead.</p>
         <p><strong>Lead ID:</strong> ${leadId}</p>`
      );

      await notificationService.createInAppNotification(
        realtorId,
        'New Lead Assigned',
        `A new lead (${leadId}) has been routed to you.`,
        'lead',
        leadId
      );
    }

    // Notify director if present
    if (directorId) {
      const { data: director } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', directorId)
        .single();

      if (director?.email) {
        await sendEmail(
          director.email,
          'Lead Routed in Your Territory',
          `<p>Hi ${director.full_name ?? 'there'},</p>
           <p>A new lead has been routed to a realtor in your territory.</p>
           <p><strong>Lead ID:</strong> ${leadId}</p>`
        );

        await notificationService.createInAppNotification(
          directorId,
          'Lead Routed in Territory',
          `Lead (${leadId}) was routed to a realtor in your territory.`,
          'lead',
          leadId
        );
      }
    }
  },

  /**
   * Notify a realtor that their listing has been approved.
   */
  notifyListingApproved: async (listingId: string, realtorId: string): Promise<void> => {
    const { data: realtor } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', realtorId)
      .single();

    if (realtor?.email) {
      await sendEmail(
        realtor.email,
        'Your Listing Has Been Approved',
        `<p>Hi ${realtor.full_name ?? 'there'},</p>
         <p>Your listing has been reviewed and approved. It is now live on NLVListings.</p>
         <p><strong>Listing ID:</strong> ${listingId}</p>`
      );
    }

    await notificationService.createInAppNotification(
      realtorId,
      'Listing Approved',
      `Your listing (${listingId}) is now live.`,
      'listing',
      listingId
    );
  },

  /**
   * Notify a realtor that their listing has been rejected, with a reason.
   */
  notifyListingRejected: async (listingId: string, realtorId: string, reason: string): Promise<void> => {
    const { data: realtor } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', realtorId)
      .single();

    if (realtor?.email) {
      await sendEmail(
        realtor.email,
        'Your Listing Was Not Approved',
        `<p>Hi ${realtor.full_name ?? 'there'},</p>
         <p>Unfortunately, your listing could not be approved at this time.</p>
         <p><strong>Reason:</strong> ${reason}</p>
         <p>Please update your listing and resubmit.</p>`
      );
    }

    await notificationService.createInAppNotification(
      realtorId,
      'Listing Rejected',
      `Your listing (${listingId}) was rejected: ${reason}`,
      'listing',
      listingId
    );
  },

  /**
   * Notify a user that their payment succeeded.
   */
  notifyPaymentSucceeded: async (userId: string, amount: number, type: string): Promise<void> => {
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (user?.email) {
      await sendEmail(
        user.email,
        'Payment Successful',
        `<p>Hi ${user.full_name ?? 'there'},</p>
         <p>We received your payment of <strong>$${amount.toFixed(2)}</strong> for ${type}.</p>
         <p>Thank you for using NLVListings!</p>`
      );
    }

    await notificationService.createInAppNotification(
      userId,
      'Payment Received',
      `Your payment of $${amount.toFixed(2)} for ${type} was successful.`,
      'payment',
      null
    );
  },

  /**
   * Notify a commission recipient about a status change on their commission.
   */
  notifyCommissionUpdate: async (commissionId: string, recipientId: string, status: string): Promise<void> => {
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', recipientId)
      .single();

    if (user?.email) {
      await sendEmail(
        user.email,
        `Commission Status Updated: ${status}`,
        `<p>Hi ${user.full_name ?? 'there'},</p>
         <p>Your commission (ID: ${commissionId}) status has been updated to <strong>${status}</strong>.</p>
         <p>Log in to NLVListings to view the details.</p>`
      );
    }

    await notificationService.createInAppNotification(
      recipientId,
      `Commission ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `Your commission (${commissionId}) is now ${status}.`,
      'commission',
      commissionId
    );
  },

  /**
   * Notify a director that a lead has been assigned to them.
   * The director will then assign it to one of their realtors.
   */
  notifyDirectorLead: async (leadId: string, directorId: string): Promise<void> => {
    // Fetch director and lead details
    const { data: director } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', directorId)
      .single();

    const { data: lead } = await supabase
      .from('leads')
      .select('contact_name, contact_email, budget_min, budget_max, interest_type')
      .eq('id', leadId)
      .single();

    if (director?.email) {
      const budgetRange = lead?.budget_min || lead?.budget_max
        ? `$${(lead?.budget_min ?? 0).toLocaleString()} - $${(lead?.budget_max ?? 0).toLocaleString()}`
        : 'Not specified';

      await sendEmail(
        director.email,
        'New Lead Assigned to Your Queue',
        `<p>Hi ${director.full_name ?? 'there'},</p>
         <p>A new lead has been assigned to you and is waiting for assignment to one of your realtors.</p>
         <p><strong>Lead Contact:</strong> ${lead?.contact_name ?? 'Not provided'}</p>
         <p><strong>Contact Email:</strong> ${lead?.contact_email ?? 'Not provided'}</p>
         <p><strong>Budget Range:</strong> ${budgetRange}</p>
         <p><strong>Interest Type:</strong> ${lead?.interest_type ?? 'Not specified'}</p>
         <p>Log in to NLVListings to view and assign this lead to a realtor in your territory.</p>`
      );

      await notificationService.createInAppNotification(
        directorId,
        'New Lead in Your Queue',
        `Lead (${lead?.contact_name || leadId}) is waiting for realtor assignment.`,
        'lead',
        leadId
      );
    }
  },

  /**
   * Store an in-app notification via the notify Edge Function (service_role).
   *
   * Direct client-side inserts into the notifications table are blocked after
   * the BUG-037 security fix (migrations_security_fixes.sql dropped all
   * authenticated INSERT policies to prevent inbox flooding). The notify Edge
   * Function runs as service_role — which bypasses RLS — and is the only safe
   * insert path for non-admin callers such as the routing and listing services.
   */
  createInAppNotification: async (
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    entityId: string | null
  ): Promise<{ data: InAppNotification | null; error: Error | null }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ user_id: userId, title, message, type, entity_id: entityId }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { data: null, error: new Error(text || 'notify Edge Function failed') };
      }

      return { data: null, error: null };
    } catch (err: any) {
      console.error('[NotificationService] createInAppNotification failed:', err.message);
      return { data: null, error: err };
    }
  },

  /**
   * Notify all admin users that a new realtor has signed up and needs approval.
   */
  notifyAdminsNewSignup: async (profile: {
    id: string;
    full_name?: string;
    email?: string;
    company?: string;
    city?: string;
    state?: string;
  }): Promise<void> => {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'admin')
      .eq('status', 'active');

    if (!admins || admins.length === 0) return;

    const location = [profile.city, profile.state].filter(Boolean).join(', ') || '—';

    for (const admin of admins) {
      if (admin.email) {
        await sendEmail(
          admin.email,
          'New Realtor Account Pending Approval',
          `<p>Hi ${admin.full_name ?? 'Admin'},</p>
           <p>A new realtor has signed up and is waiting for your approval.</p>
           <p><strong>Name:</strong> ${profile.full_name ?? '—'}</p>
           <p><strong>Email:</strong> ${profile.email ?? '—'}</p>
           <p><strong>Company:</strong> ${profile.company ?? '—'}</p>
           <p><strong>Location:</strong> ${location}</p>
           <p>Please log in to the admin panel and go to <strong>Approvals</strong> to review their application.</p>`
        );
      }

      await notificationService.createInAppNotification(
        admin.id,
        'New Realtor Pending Approval',
        `${profile.full_name ?? 'A new realtor'} (${profile.email ?? ''}) has signed up and is awaiting approval.`,
        'system',
        profile.id
      );
    }
  },

  /**
   * Notify a realtor that their account has been approved by an admin.
   * Returns true if the approval email was sent successfully.
   */
  notifyRealtorApproved: async (realtorId: string): Promise<boolean> => {
    const { data: realtor } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', realtorId)
      .single();

    let emailSent = false;

    if (realtor?.email) {
      const appUrl = import.meta.env.VITE_APP_URL ?? 'https://nlvlistings.com';
      const loginUrl = `${appUrl}/login`;
      emailSent = await sendEmail(
        realtor.email,
        'Your NLVListings Account Has Been Approved',
        `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111111;">
           <img src="${appUrl}/logo.png" alt="NLV Listings" style="height:48px;margin-bottom:24px;" />
           <h2 style="color:#1F4D3A;margin-bottom:8px;">Your Account Has Been Approved!</h2>
           <p style="font-size:15px;line-height:1.6;">Hi ${realtor.full_name ?? 'there'},</p>
           <p style="font-size:15px;line-height:1.6;">Great news! Your NLVListings account has been approved. You can now log in and start using the platform.</p>
           <div style="text-align:center;margin:32px 0;">
             <a href="${loginUrl}"
                style="display:inline-block;background-color:#1F4D3A;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;">
               Log In to Your Dashboard
             </a>
           </div>
           <p style="font-size:13px;color:#6B7280;">If the button above doesn't work, copy and paste this link into your browser:<br/>
             <a href="${loginUrl}" style="color:#1F4D3A;">${loginUrl}</a>
           </p>
           <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
           <p style="font-size:12px;color:#9CA3AF;text-align:center;">New Leaf Vision Inc. &mdash; NLVListings Platform</p>
         </div>`
      );
    }

    await notificationService.createInAppNotification(
      realtorId,
      'Account Approved',
      'Your account has been approved. Welcome to NLVListings!',
      'system',
      null
    );

    return emailSent;
  },

  /**
   * Notify all active admins (in-app) that a director has signed their contract.
   * Email is handled separately by sendContractSignedEmail in email.js.
   */
  notifyAdminsContractSigned: async (director: {
    id: string;
    full_name?: string;
    email?: string;
    entityName: string;
  }): Promise<void> => {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('status', 'active');

    if (!admins || admins.length === 0) return;

    await Promise.all(
      admins.map((admin) =>
        notificationService.createInAppNotification(
          admin.id,
          'Director Signed Contract',
          `${director.full_name ?? 'A director'} (${director.email ?? ''}) signed as "${director.entityName}".`,
          'system',
          director.id
        )
      )
    );
  },

  /**
   * Fetch all in-app notifications for a user, newest first.
   */
  getNotifications: async (userId: string) => {
    return adminApi.request<InAppNotification[]>(
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }) as any
    );
  },

  /**
   * Mark a single in-app notification as read.
   */
  markAsRead: async (notificationId: string) => {
    return adminApi.request<InAppNotification>(
      supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .select()
        .single() as any
    );
  },
};
