// supabase/functions/create-checkout/index.ts
// POST { trip_id, amount_cents } → { url, session_id }
// Requires Supabase JWT (Authorization: Bearer <token>)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "";

serve(async (req) => {
  // ---- CORS preflight ----
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- 1. Authenticate the calling user from JWT ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return _json({ error: "Missing Authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return _json({ error: "Invalid or expired token" }, 401);
    }

    // ---- 2. Parse & validate body ----
    const body = await req.json();
    const trip_id = body.trip_id ?? body.tripId;
    const amount_cents = body.amount_cents ?? (body.amount ? Math.round(body.amount * 100) : null);

    if (!trip_id || typeof trip_id !== "string") {
      return _json({ error: "trip_id is required" }, 400);
    }
    if (!amount_cents || typeof amount_cents !== "number" || amount_cents <= 0) {
      return _json({ error: "amount_cents must be a positive integer" }, 400);
    }
    if (!Number.isInteger(amount_cents)) {
      return _json({ error: "amount_cents must be a whole number (cents)" }, 400);
    }

    // ---- 3. Service-role client for server-side lookups ----
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ---- 4. Validate user is a member of this trip ----
    const { data: membership, error: memErr } = await admin
      .from("trip_members")
      .select("id")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) {
      console.error("Membership check failed:", memErr);
      return _json({ error: "Failed to verify membership" }, 500);
    }
    if (!membership) {
      return _json({ error: "You are not a member of this trip" }, 403);
    }

    // ---- 5. Validate amount does not exceed remaining balance ----
    const { data: funding, error: fundErr } = await admin
      .from("trip_member_funding")
      .select("amount_remaining, per_person_cost")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fundErr) {
      console.error("Funding check failed:", fundErr);
      return _json({ error: "Failed to check funding status" }, 500);
    }

    // amount_remaining is in dollars in the DB view
    const remainingDollars = Number(funding?.amount_remaining ?? 0);
    const remainingCents = Math.round(remainingDollars * 100);

    if (amount_cents > remainingCents) {
      return _json(
        { error: `Amount exceeds remaining balance. You owe $${remainingDollars.toFixed(2)}.` },
        400,
      );
    }

    // ---- 6. Fetch trip name for Stripe receipt ----
    const { data: tripData } = await admin
      .from("trips")
      .select("name")
      .eq("id", trip_id)
      .single();
    const tripName = tripData?.name || "Trip";

    // ---- 7. Create Stripe Checkout Session ----
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || SITE_URL;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
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
        user_id: user.id,
      },
      success_url: `${origin}/trip/${trip_id}?payment=success`,
      cancel_url: `${origin}/trip/${trip_id}?payment=cancelled`,
    });

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
