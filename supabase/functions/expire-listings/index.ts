import { serve } from "http/server.ts";
import { createClient } from "supabase";

/**
 * expire-listings — Scheduled Edge Function
 *
 * Finds all standard listings that have been active for more than 180 days and
 * marks them as 'expired'. Designed to be invoked via a Supabase cron schedule
 * (pg_cron or external scheduler calling the function URL with a service-role key).
 *
 * Schedule suggestion (pg_cron):
 *   SELECT cron.schedule('expire-listings', '0 2 * * *', $$
 *     SELECT net.http_post(
 *       url := '<SUPABASE_FUNCTION_URL>/expire-listings',
 *       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
 *     );
 *   $$);
 */

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

serve(async (req: Request) => {
  // Allow POST or GET (cron callers may use either)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // Calculate the cutoff: 180 days ago
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    const cutoffIso = cutoffDate.toISOString();

    // Find and expire qualifying listings
    const { data: expired, error } = await supabaseAdmin
      .from("listings")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "active")
      .eq("upgrade_type", "standard")
      .lt("created_at", cutoffIso)
      .select("id, title, realtor_id");

    if (error) {
      console.error("[expire-listings] DB update error:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const count = expired?.length ?? 0;
    console.log(`[expire-listings] Expired ${count} listings (cutoff: ${cutoffIso})`);

    // Optionally notify each realtor whose listing just expired
    if (expired && expired.length > 0) {
      const notifications = expired.map((listing: any) => ({
        user_id: listing.realtor_id,
        title: "Listing Expired",
        message: `Your listing "${listing.title}" has been automatically expired after 180 days. Upgrade to a Featured or Top tier to extend visibility.`,
        type: "system",
        entity_id: listing.id,
        read: false,
        created_at: new Date().toISOString(),
      })).filter((n: any) => n.user_id); // only notify if realtor_id is set

      if (notifications.length > 0) {
        const { error: notifError } = await supabaseAdmin
          .from("notifications")
          .insert(notifications);
        if (notifError) {
          console.error("[expire-listings] Notification insert error:", notifError.message);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, expired_count: count, cutoff: cutoffIso }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("[expire-listings] Unexpected error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
