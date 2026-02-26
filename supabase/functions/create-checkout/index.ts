// supabase/functions/create-checkout/index.ts
// POST { trip_id, amount_cents } → { url, session_id }
// verify_jwt = false in config.toml; we validate JWT in code via getClaims()

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "";

// Phase 2 — Startup env var check
console.log("[create-checkout] STRIPE_SECRET_KEY set:", !!Deno.env.get("STRIPE_SECRET_KEY"));
console.log("[create-checkout] SUPABASE_URL set:", !!Deno.env.get("SUPABASE_URL"));
console.log("[create-checkout] SUPABASE_ANON_KEY set:", !!Deno.env.get("SUPABASE_ANON_KEY"));
console.log("[create-checkout] SUPABASE_SERVICE_ROLE_KEY set:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Phase 2 — Env var guard
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      return _json({ error: "STRIPE_SECRET_KEY not configured" }, 500);
    }

    // Phase 3 — Authenticate via getClaims()
    const authHeader = req.headers.get("Authorization");
    console.log("[create-checkout] Authorization header present:", !!authHeader);
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[create-checkout] No Authorization header");
      return _json({ error: "not_authenticated" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);

    if (claimsErr || !claimsData?.claims) {
      console.error("[create-checkout] getClaims failed:", claimsErr);
      return _json({ error: "not_authenticated" }, 401);
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;
    console.log("[create-checkout] authenticated userId:", userId);

    // ---- Parse & validate body ----
    const body = await req.json();
    const trip_id = body.trip_id ?? body.tripId;
    const amount_cents = body.amount_cents ?? (body.amount ? Math.round(body.amount * 100) : null);

    console.log("[create-checkout] trip_id:", trip_id, "amount_cents:", amount_cents);

    if (!trip_id || typeof trip_id !== "string") {
      return _json({ error: "trip_id is required" }, 400);
    }
    if (!amount_cents || typeof amount_cents !== "number" || amount_cents <= 0) {
      return _json({ error: "amount_cents must be a positive integer" }, 400);
    }
    if (!Number.isInteger(amount_cents)) {
      return _json({ error: "amount_cents must be a whole number (cents)" }, 400);
    }

    // ---- Service-role client for server-side lookups ----
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ---- Validate user is a member of this trip ----
    const { data: membership, error: memErr } = await admin
      .from("trip_members")
      .select("id")
      .eq("trip_id", trip_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (memErr) {
      console.error("Membership check failed:", memErr);
      return _json({ error: "Failed to verify membership" }, 500);
    }
    if (!membership) {
      return _json({ error: "You are not a member of this trip" }, 403);
    }

    // ---- Validate amount does not exceed remaining balance ----
    const { data: funding, error: fundErr } = await admin
      .from("trip_member_funding")
      .select("amount_remaining, per_person_cost")
      .eq("trip_id", trip_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (fundErr) {
      console.error("Funding check failed:", fundErr);
      return _json({ error: "Failed to check funding status" }, 500);
    }

    const remainingDollars = Number(funding?.amount_remaining ?? 0);
    const remainingCents = Math.round(remainingDollars * 100);

    if (amount_cents > remainingCents) {
      return _json(
        { error: `Amount exceeds remaining balance. You owe $${remainingDollars.toFixed(2)}.` },
        400,
      );
    }

    // ---- Fetch trip name for Stripe receipt ----
    const { data: tripData } = await admin
      .from("trips")
      .select("name")
      .eq("id", trip_id)
      .single();
    const tripName = tripData?.name || "Trip";

    // ---- Create Stripe Checkout Session ----
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: userEmail!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || SITE_URL;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail!,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${tripName} — Payment`,
              description: `Trip contribution — $${(amount_cents / 100).toFixed(2)}`,
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        trip_id,
        user_id: userId,
      },
      success_url: `${origin}/trip/${trip_id}?payment=success`,
      cancel_url: `${origin}/trip/${trip_id}?payment=cancelled`,
    });

    console.log("[create-checkout] Stripe session created:", session.id);
    return _json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("create-checkout error:", error);
    return _json({ error: (error as Error).message }, 500);
  }
});

function _json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
