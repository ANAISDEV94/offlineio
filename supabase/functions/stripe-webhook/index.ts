import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { tripId, userId, amount } = session.metadata || {};

      if (tripId && userId && amount) {
        const paymentAmount = parseFloat(amount);

        // Get current payment
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("amount_paid, amount")
          .eq("trip_id", tripId)
          .eq("user_id", userId)
          .single();

        if (payment) {
          const newAmountPaid = Math.min(
            Number(payment.amount_paid) + paymentAmount,
            Number(payment.amount)
          );
          const newStatus = newAmountPaid >= Number(payment.amount) ? "paid" : "partial";

          await supabaseAdmin
            .from("payments")
            .update({
              amount_paid: newAmountPaid,
              status: newStatus,
            })
            .eq("trip_id", tripId)
            .eq("user_id", userId);

          console.log(`Payment updated: user=${userId} trip=${tripId} amount=${paymentAmount} total=${newAmountPaid}`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
