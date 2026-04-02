import { serve } from "http/server.ts";
import Stripe from "stripe";
import { createClient } from "supabase";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

// Service-role client used only to look up prices server-side (BUG-031).
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
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
    // Verify caller is authenticated. Without this check any anonymous request
    // could create a checkout session attributed to an arbitrary userId — after
    // payment the webhook would activate that target account (BUG-034 class).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body = await req.json();
    const origin = req.headers.get("origin") || "";

    // Callers may only create sessions for themselves unless they are admin.
    const requestedUserId = body.userId as string | undefined;
    if (requestedUserId && requestedUserId !== caller.id) {
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .single();
      if (callerProfile?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: cannot create a checkout session for another user" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    // ── Listing upgrade (one-time payment) ─────────────────────────────────────
    if (body.type === "listing_upgrade") {
      // BUG-031 fix: priceAmount is no longer accepted from the client.
      // The price is always resolved server-side so a client cannot fabricate
      // an arbitrary charge amount. Resolution order:
      //   1. listing_prices table (authoritative, set by admins)
      //   2. STRIPE_LISTING_<TYPE>_PRICE_CENTS env var (fallback)
      const { listingId, upgradeType, userId, userEmail } = body;

      if (!listingId || !upgradeType || !userId) {
        throw new Error("Missing required parameters: listingId, upgradeType, userId");
      }

      // Validate upgradeType to prevent injection into the env-var key below
      const validUpgradeTypes = ["standard", "featured", "top"];
      if (!validUpgradeTypes.includes(upgradeType)) {
        throw new Error(`Invalid upgradeType: ${upgradeType}`);
      }

      // 1. Look up price from DB
      let unitAmount: number | null = null;
      const { data: priceRow } = await supabaseAdmin
        .from("listing_prices")
        .select("price")
        .eq("type", upgradeType)
        .eq("is_active", true)
        .maybeSingle();

      if (priceRow?.price != null && priceRow.price > 0) {
        unitAmount = Math.round(Number(priceRow.price) * 100); // dollars → cents
      } else {
        // 2. Fall back to env var
        const envKey = `STRIPE_LISTING_${upgradeType.toUpperCase()}_PRICE_CENTS`;
        const envVal = Deno.env.get(envKey);
        unitAmount = envVal ? parseInt(envVal, 10) : null;
      }

      if (!unitAmount || unitAmount <= 0) {
        throw new Error(`Could not determine price for upgrade type: ${upgradeType}`);
      }

      // HP-10: If caller is on the 'starter' plan, apply 50% discount on listing upgrades
      const { data: callerSub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan")
        .eq("user_id", caller.id)
        .eq("status", "active")
        .maybeSingle();

      if (callerSub?.plan === "starter") {
        unitAmount = Math.round(unitAmount * 0.5); // 50% discount
      }

      const TIER_LABELS: Record<string, string> = {
        top: "Top Pick",
        featured: "Featured",
        standard: "Standard",
      };
      const tierLabel = TIER_LABELS[upgradeType] ?? upgradeType;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: unitAmount,
              product_data: {
                name: `${tierLabel} Listing Upgrade`,
                description: `Upgrade your listing to ${tierLabel} tier for increased visibility`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/app/listings?upgrade=success&listing=${listingId}`,
        cancel_url: `${origin}/app/listings?upgrade=cancelled`,
        customer_email: userEmail,
        metadata: {
          type: "listing_upgrade",
          listingId,
          upgradeType,
          userId,
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── Subscription checkout (existing flow) ──────────────────────────────────
    const { planId, planKey, userId, userEmail } = body;

    let priceId = planId;

    if (!priceId && planKey) {
      const key = planKey.toUpperCase();
      priceId = Deno.env.get(`STRIPE_${key}_PRICE_ID`);
    }

    if (!priceId) {
      throw new Error(`Price ID not found for plan: ${planKey || planId}`);
    }

    if (!userId) {
      throw new Error("Missing required parameter: userId");
    }

    // HP-10: For starter plan, record 12-month minimum commitment in metadata
    const isStarterPlan = (planKey || "").toLowerCase() === "starter";
    const subscriptionMeta: Record<string, string> = {
      userId,
      planKey: planKey || "custom",
    };
    if (isStarterPlan) {
      subscriptionMeta["minimum_commitment_months"] = "12";
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/realtor/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${origin}/realtor/billing?status=cancelled`,
      customer_email: userEmail,
      metadata: {
        userId,
        planKey: planKey || "custom",
        ...(isStarterPlan ? { minimum_commitment_months: "12" } : {}),
      },
      subscription_data: {
        metadata: subscriptionMeta,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[Checkout Session Error] ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
