import { serve } from "http/server.ts";
import Stripe from "stripe";
import { createClient } from "supabase";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// BUG-034: Replace wildcard CORS with an explicit allowlist.
// Set ALLOWED_ORIGINS env var to a comma-separated list of permitted origins.
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) throw new Error("Unauthorized");

    const { action, subscriptionId, subscriptionDbId } = await req.json();

    if (!action || !subscriptionId) {
      throw new Error("Missing required parameters: action, subscriptionId");
    }

    // 2. Fetch subscription to verify ownership
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, id")
      .or(`id.eq.${subscriptionDbId}, stripe_subscription_id.eq.${subscriptionId}`)
      .single();

    if (subError || !subscription) throw new Error("Subscription not found");

    // 3. Verify Authorization: Owner or Admin
    if (subscription.user_id !== caller.id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .single();

      if (profile?.role !== "admin") {
        throw new Error("You do not have permission to manage this subscription");
      }
    }

    let stripeResult: Stripe.Subscription | null = null;
    let dbUpdate: Record<string, string | null> = { updated_at: new Date().toISOString() };

    if (action === "cancel") {
      // Cancel at period end: Stripe keeps the subscription active until the billing
      // cycle ends, then fires customer.subscription.deleted. The stripe-webhook
      // handler (customer.subscription.deleted) is the authoritative place to set
      // status = 'cancelled'. Setting it here immediately would revoke access while
      // the user has already paid for the remaining period.
      //
      // Fix: record cancelled_at (signals pending cancellation to the UI) but keep
      // status = 'active' so the user retains access until Stripe fires the deletion event.
      stripeResult = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      dbUpdate = {
        // status intentionally omitted — remains 'active' until customer.subscription.deleted
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log(`[ManageSubscription] Scheduled cancellation for Stripe subscription: ${subscriptionId}`);
    } else if (action === "reactivate") {
      // Remove the cancel_at_period_end flag to reactivate
      stripeResult = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
      dbUpdate = {
        status: "active",
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      };
      console.log(`[ManageSubscription] Reactivated Stripe subscription: ${subscriptionId}`);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // Sync DB state — update by stripe_subscription_id OR by db record id
    if (subscriptionDbId) {
      await supabaseAdmin
        .from("subscriptions")
        .update(dbUpdate)
        .eq("id", subscriptionDbId);
    } else {
      await supabaseAdmin
        .from("subscriptions")
        .update(dbUpdate)
        .eq("stripe_subscription_id", subscriptionId);
    }

    return new Response(
      JSON.stringify({ success: true, status: stripeResult?.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const error = err as Error;
    console.error(`[ManageSubscription Error] ${error.message}`);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
