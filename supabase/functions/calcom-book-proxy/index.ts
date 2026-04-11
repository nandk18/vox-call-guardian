import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const { name, start, agent_id: agentId, agentId: agentId2 } = body;
    const finalAgentId = agentId || agentId2;

    console.log("calcom-book-proxy:", { name, start, agentId: finalAgentId });

    if (!name || !start) {
      return new Response(
        JSON.stringify({ error: "name and start are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!finalAgentId) {
      return new Response(
        JSON.stringify({ error: "agent_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get agent and Cal.com integration
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("bolna_agent_id", finalAgentId)
      .maybeSingle();

    if (!agent) {
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("api_key, event_type_id")
      .eq("agent_id", agent.id)
      .eq("type", "calcom")
      .maybeSingle();

    if (!integration?.api_key) {
      return new Response(
        JSON.stringify({ error: "Cal.com not connected" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call Cal.com v2 bookings
    const bookingBody = {
      eventTypeId: parseInt(integration.event_type_id),
      start,
      attendee: {
        name,
        email: "booking@tushietrials.ca",
        timeZone: "Asia/Kolkata",
        language: "en",
      },
      metadata: {},
    };

    console.log("Booking:", JSON.stringify(bookingBody));

    const calRes = await fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.api_key}`,
        "cal-api-version": "2024-08-13",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingBody),
    });

    const calData = await calRes.json();

    console.log("Cal.com booking response:", JSON.stringify(calData).slice(0, 300));

    return new Response(JSON.stringify(calData), {
      status: calRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("calcom-book-proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
