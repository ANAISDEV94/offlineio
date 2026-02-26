import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const { trip_id, generated_plan_json } = await req.json();
    if (!trip_id || !generated_plan_json) {
      return new Response(JSON.stringify({ error: "trip_id and generated_plan_json are required" }), {
        status: 400, headers: corsHeaders,
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify membership
    const { count } = await adminClient
      .from("trip_members")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", trip_id)
      .eq("user_id", userId);

    if (!count || count === 0) {
      return new Response(JSON.stringify({ error: "Not a trip member" }), { status: 403, headers: corsHeaders });
    }

    // Delete existing drafts (idempotent)
    await adminClient
      .from("trip_plan_items")
      .delete()
      .eq("trip_id", trip_id)
      .eq("status", "draft");

    const items: any[] = [];

    // Budget breakdown items
    if (generated_plan_json.budget_breakdown) {
      for (const b of generated_plan_json.budget_breakdown) {
        items.push({
          trip_id,
          category: b.category,
          title: `${b.category.charAt(0).toUpperCase() + b.category.slice(1)} Budget`,
          description: b.notes,
          est_cost: b.amount,
          status: "draft",
          created_by: userId,
        });
      }
    }

    // Itinerary items
    if (generated_plan_json.itinerary_days) {
      for (const day of generated_plan_json.itinerary_days) {
        for (const act of day.activities) {
          items.push({
            trip_id,
            category: "experiences",
            title: act.title,
            description: act.description,
            est_cost: act.est_cost,
            day_number: day.day_number,
            time_block: act.time_block,
            status: "draft",
            created_by: userId,
          });
        }
      }
    }

    if (items.length > 0) {
      const { error: insertError } = await adminClient.from("trip_plan_items").insert(items);
      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save plan items" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, items_saved: items.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("save-trip-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
