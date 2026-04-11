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
    const url = new URL(req.url);
    const startTime = url.searchParams.get("startTime");
    const endTime = url.searchParams.get("endTime");
    const eventTypeId = url.searchParams.get("eventTypeId");
    const agentId = url.searchParams.get("agent_id") || url.searchParams.get("agentId");

    console.log("calcom-slots-proxy:", { startTime, endTime, eventTypeId, agentId });

    if (!startTime || !endTime) {
      return new Response(
        JSON.stringify({ error: "startTime and endTime are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: "agent_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up agent by bolna_agent_id
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("bolna_agent_id", agentId)
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
        JSON.stringify({ error: "Cal.com not connected for this agent" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const finalEventTypeId = eventTypeId || integration.event_type_id;

    // Call Cal.com v2 slots with correct start/end params
    const calUrl = new URL("https://api.cal.com/v2/slots");
    calUrl.searchParams.set("start", startTime);
    calUrl.searchParams.set("end", endTime);
    calUrl.searchParams.set("eventTypeId", finalEventTypeId || "");

    console.log("Calling Cal.com:", calUrl.toString());

    const calRes = await fetch(calUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${integration.api_key}`,
        "cal-api-version": "2024-09-04",
        "Content-Type": "application/json",
      },
    });

    const calData = await calRes.json();

    console.log("Cal.com response:", JSON.stringify(calData).slice(0, 300));

    return new Response(JSON.stringify(calData), {
      status: calRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("calcom-slots-proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
