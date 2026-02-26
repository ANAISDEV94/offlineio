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

    const { trip_id, answers_json } = await req.json();
    if (!trip_id) {
      return new Response(JSON.stringify({ error: "trip_id is required" }), { status: 400, headers: corsHeaders });
    }

    // Use service role to pull trip context
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: trip, error: tripError } = await adminClient
      .from("trips")
      .select("destination, start_date, end_date, total_cost, vibe, group_size")
      .eq("id", trip_id)
      .single();

    if (tripError || !trip) {
      return new Response(JSON.stringify({ error: "Trip not found" }), { status: 404, headers: corsHeaders });
    }

    // Verify membership
    const { count } = await adminClient
      .from("trip_members")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", trip_id)
      .eq("user_id", userId);

    if (!count || count === 0) {
      return new Response(JSON.stringify({ error: "Not a trip member" }), { status: 403, headers: corsHeaders });
    }

    // Get actual member count
    const { count: memberCount } = await adminClient
      .from("trip_members")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", trip_id);

    // Calculate trip duration
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    const tripDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    const totalBudget = Number(trip.total_cost) || 0;

    const systemPrompt = `You are a trip planning assistant. Generate a complete trip plan based on user preferences.

Trip details:
- Destination: ${trip.destination}
- Dates: ${trip.start_date} to ${trip.end_date} (${tripDays} days)
- Total budget: $${totalBudget}
- Number of travelers: ${memberCount || trip.group_size}
- Vibe: ${trip.vibe}

User preferences:
- Accommodation style: ${answers_json.accommodation || "Not specified"}
- Activity interests: ${Array.isArray(answers_json.activities) ? answers_json.activities.join(", ") : "Not specified"}
- Trip pace: ${answers_json.pace || "Not specified"}
- Dietary needs / food preferences: ${answers_json.dietaryNeeds || "None specified"}
- Must-see / must-do: ${answers_json.mustSee || "None specified"}
- Special requests: ${answers_json.specialRequests || "None"}

IMPORTANT RULES:
- The budget_breakdown amounts MUST sum to exactly $${totalBudget}
- Generate itinerary for exactly ${tripDays} days
- Include realistic estimated costs
- For search_url, use Google search URLs like: https://www.google.com/search?q=<encoded query>
- Categories must be one of: flights, stay, experiences, shared, buffer
- time_block must be one of: morning, afternoon, evening`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the trip plan now." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_trip_plan",
              description: "Create a complete trip plan with budget breakdown, daily itinerary, and suggested options.",
              parameters: {
                type: "object",
                properties: {
                  budget_breakdown: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["flights", "stay", "experiences", "shared", "buffer"] },
                        amount: { type: "number" },
                        notes: { type: "string" },
                      },
                      required: ["category", "amount", "notes"],
                      additionalProperties: false,
                    },
                  },
                  itinerary_days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day_number: { type: "integer" },
                        activities: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              time_block: { type: "string", enum: ["morning", "afternoon", "evening"] },
                              title: { type: "string" },
                              description: { type: "string" },
                              est_cost: { type: "number" },
                            },
                            required: ["time_block", "title", "description", "est_cost"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["day_number", "activities"],
                      additionalProperties: false,
                    },
                  },
                  suggested_options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        est_cost_low: { type: "number" },
                        est_cost_high: { type: "number" },
                        search_url: { type: "string" },
                      },
                      required: ["category", "title", "description", "est_cost_low", "est_cost_high", "search_url"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["budget_breakdown", "itinerary_days", "suggested_options"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_trip_plan" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiResult));
      return new Response(JSON.stringify({ error: "Failed to generate plan" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generatedPlan = JSON.parse(toolCall.function.arguments);

    // Save session
    await adminClient.from("trip_plan_sessions").insert({
      trip_id,
      user_id: userId,
      answers_json,
      generated_plan_json: generatedPlan,
    });

    return new Response(JSON.stringify(generatedPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-trip-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
