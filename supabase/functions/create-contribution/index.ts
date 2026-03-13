import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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
      return _json({ error: "not_authenticated" }, 401);
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;

    const body = await req.json();
    const tripId = body.trip_id;
    const amountDollars = body.amount;

    if (!tripId) return _json({ error: "trip_id is required" }, 400);
    if (!amountDollars || typeof amountDollars !== "number" || amountDollars <= 0) {
      return _json({ error: "amount must be a positive number (dollars)" }, 400);
    }

    const amountCents = Math.round(amountDollars * 100);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Validate membership
    const { data: membership } = await admin
      .from("trip_members")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return _json({ error: "You are not a member of this trip" }, 403);
    }

    // Validate remaining balance
    const { data: funding } = await admin
      .from("trip_member_funding")
      .select("amount_remaining, per_person_cost")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();

    const perPersonCost = Number(funding?.per_person_cost ?? 0);
    const remainingDollars = Number(funding?.amount_remaining ?? 0);

    if (perPersonCost > 0 && amountDollars > remainingDollars) {
      return _json({ error: `Amount exceeds remaining balance ($${remainingDollars.toFixed(2)})` }, 400);
    }

    // Lookup organizer's Connect account
    const { data: organizer } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", tripId)
      .eq("role", "organizer")
      .maybeSingle();

    let connectAccountId: string | null = null;
    if (organizer) {
      const { data: connectAcct } = await admin
        .from("stripe_connect_accounts")
        .select("stripe_account_id, charges_enabled")
        .eq("user_id", organizer.user_id)
        .maybeSingle();

      if (connectAcct?.charges_enabled && connectAcct.stripe_account_id) {
        connectAccountId = connectAcct.stripe_account_id;
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for stored payment method
    const { data: storedPM } = await admin
      .from("user_payment_methods")
      .select("stripe_customer_id, stripe_payment_method_id")
      .eq("user_id", userId)
      .maybeSingle();

    const hasStoredPM = storedPM?.stripe_customer_id && storedPM?.stripe_payment_method_id;

    // Build PaymentIntent params
    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: "usd",
      metadata: {
        trip_id: tripId,
        user_id: userId,
        organizer_id: organizer?.user_id ?? "",
      },
    };

    if (connectAccountId) {
      piParams.application_fee_amount = Math.round(amountCents * 0.025);
      piParams.transfer_data = { destination: connectAccountId };
    }

    if (hasStoredPM) {
      piParams.customer = storedPM.stripe_customer_id!;
      piParams.payment_method = storedPM.stripe_payment_method_id!;
      piParams.off_session = true;
      piParams.confirm = true;
    } else {
      // Need customer for client_secret flow
      const customers = await stripe.customers.list({ email: userEmail!, limit: 1 });
      if (customers.data.length > 0) {
        piParams.customer = customers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({ email: userEmail! });
        piParams.customer = newCustomer.id;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams);

    // Insert pending contribution
    await admin.from("contributions").insert({
      trip_id: tripId,
      user_id: userId,
      amount: amountDollars,
      status: "pending",
      stripe_payment_intent_id: paymentIntent.id,
    });

    if (hasStoredPM) {
      return _json({
        status: "confirmed",
        payment_intent_id: paymentIntent.id,
      });
    }

    return _json({
      status: "requires_action",
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    console.error("create-contribution error:", error);
    return _json({ error: (error as Error).message }, 500);
  }
});

function _json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
