import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { compileAgentPrompt } from "../_shared/compilePrompt.ts";
import { getProviderConfig } from "../_shared/providers.ts";
import { bolnaFetch } from "../_shared/bolna.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { agent_id } = await req.json();

    const { data: agent } = await supabaseAdmin.from("agents").select("*, knowledge(*)").eq("id", agent_id).single();

    if (!agent) {
      return new Response(JSON.stringify({ success: false, error: "Agent not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Cal.com integration
    const { data: calIntegration } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("agent_id", agent_id)
      .eq("type", "calcom")
      .maybeSingle();

    const hasCalcom = !!calIntegration?.api_key;

    console.log("create-bolna-agent: Cal.com integration:", hasCalcom ? calIntegration.event_type_name : "none");

    const knowledge = Array.isArray(agent.knowledge) ? agent.knowledge[0] || {} : agent.knowledge || {};

    const compiled_prompt = compileAgentPrompt(agent, knowledge, hasCalcom);

    const { transcriber, synthesizer } = getProviderConfig(
      agent.language_primary || "english",
      agent.voice || "female",
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const webhookUrl = `${supabaseUrl}/functions/v1/handle-call-webhook`;

    // Dynamic phone number from agents table
    const voxNumber = agent.vox_number || "+16813033721";
    const phoneNumberId = agent.bolna_phone_number_id || "58cf9c77-e784-423f-9cb5-48bcf655fe25";

    console.log("create-bolna-agent: business:", agent.business_name);
    console.log("create-bolna-agent: language:", agent.language_primary);
    console.log("create-bolna-agent: voice:", agent.voice, "→", synthesizer.provider_config.voice);
    console.log("create-bolna-agent: transcriber:", JSON.stringify(transcriber));
    console.log("create-bolna-agent: vox_number:", voxNumber);
    console.log("create-bolna-agent: phone_number_id:", phoneNumberId);

    // Build tools_config
    const toolsConfig: any = {
      input: { format: "wav", provider: "twilio" },
      output: { format: "wav", provider: "twilio" },
      transcriber,
      synthesizer,
      llm_agent: {
        agent_type: "simple_llm_agent",
        llm_config: {
          model: "gpt-4o-mini",
          provider: "openai",
          max_tokens: 150,
          temperature: 0.1,
          request_json: false,
          agent_flow_type: "streaming",
          summarization_details:
            "Summarize this customer call in 2-3 sentences for the business owner. Include why they called, what they need, and any appointment or timing details.",
          extraction_details:
            "caller_name: Full name of caller. null if not given. caller_need: What the caller needs in one sentence. preferred_time: Preferred time or date. null if not mentioned. urgency: high medium or low. is_spam: true if spam or robocall. false otherwise.",
        },
        agent_flow_type: "streaming",
      },
    };

    // Add Cal.com api_tools if connected — point to proxy edge functions
    if (hasCalcom) {
      toolsConfig.api_tools = {
        tools: [
          {
            key: "check_availability_of_slots",
            name: "check_availability_of_slots",
            description:
              "Fetch the available free slots of appointment booking before booking the appointment. Always call this before booking.",
            parameters: {
              type: "object",
              required: ["startTime", "endTime"],
              properties: {
                startTime: {
                  type: "string",
                  description:
                    "Start of time range in ISO 8601 format with Z suffix. For 9am IST use T03:30:00Z. Example for today: 2026-04-10T03:30:00Z Example for tomorrow: 2026-04-11T03:30:00Z",
                },
                endTime: {
                  type: "string",
                  description:
                    "End of time range in ISO 8601 format with Z suffix. For 5pm IST use T11:30:00Z. Example for today: 2026-04-10T11:30:00Z Example for tomorrow: 2026-04-11T11:30:00Z",
                },
              },
            },
            pre_call_message: "Just give me a moment, I will check availability for you.",
          },
          {
            key: "book_appointment",
            name: "book_appointment",
            description:
              "Book an appointment after the caller confirms a specific time slot. Only call AFTER caller has confirmed the time. Use exact slot time from check_availability_of_slots.",
            parameters: {
              type: "object",
              required: ["name", "start"],
              properties: {
                name: {
                  type: "string",
                  description: "Full name of the caller.",
                },
                start: {
                  type: "string",
                  description:
                    "Exact start time in UTC ISO 8601 format with Z suffix. Use the exact value returned by check_availability_of_slots. Example: 2026-04-10T04:30:00Z",
                },
              },
            },
            pre_call_message: "Perfect, let me book that for you right now.",
          },
        ],
        tools_params: {
          check_availability_of_slots: {
            url: `${supabaseUrl}/functions/v1/calcom-slots-proxy`,
            param: {
              startTime: "%(startTime)s",
              endTime: "%(endTime)s",
              eventTypeId: calIntegration.event_type_id,
              agent_id: "{{agent_id}}",
            },
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            api_token: null,
          },
          book_appointment: {
            url: `${supabaseUrl}/functions/v1/calcom-book-proxy`,
            param: {
              name: "%(name)s",
              start: "%(start)s",
              agent_id: "{{agent_id}}",
            },
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            api_token: null,
          },
        },
      };
    }

    const createBody = {
      agent_config: {
        agent_name: `${agent.business_name} - Vox`,
        agent_type: "IVR",
        agent_welcome_message:
          agent.greeting || `Thank you for calling ${agent.business_name}, how can I help you today?`,
        webhook_url: webhookUrl,
        tasks: [
          {
            task_type: "conversation",
            toolchain: {
              execution: "parallel",
              pipelines: [["transcriber", "llm", "synthesizer"]],
            },
            tools_config: toolsConfig,
            task_config: {
              hangup_after_silence: 30,
              incremental_delay: 200,
              optimize_latency: true,
              hangup_after_LLMCall: false,
              number_of_words_for_interruption: 2,
              check_if_user_online: true,
              check_user_online_message: "Hey, are you still there?",
            },
          },
        ],
      },
      agent_prompts: {
        task_1: { system_prompt: compiled_prompt },
      },
    };

    console.log("create-bolna-agent: FULL POST body:", JSON.stringify(createBody));

    const createRes = await bolnaFetch("/v2/agent", {
      method: "POST",
      body: JSON.stringify(createBody),
    });

    console.log(
      "create-bolna-agent: POST result:",
      JSON.stringify({
        ok: createRes.ok,
        status: createRes.status,
        data: JSON.stringify(createRes.data).slice(0, 300),
      }),
    );

    if (!createRes.ok || !createRes.data?.agent_id) {
      console.error("create-bolna-agent: Failed:", JSON.stringify(createRes.data));
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create agent", details: createRes.data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bolna_agent_id = createRes.data.agent_id;
    console.log("create-bolna-agent: Created:", bolna_agent_id);

    // Handle missing phone number — skip phone linking
    if (!phoneNumberId) {
      console.log("create-bolna-agent: No phone number ID — skipping link. Run provision-vox-number first.");

      await supabaseAdmin
        .from("agents")
        .update({
          bolna_agent_id,
          compiled_prompt,
          status: "provisioning",
          onboarding_complete: true,
          last_rebuilt_language: agent.language_primary,
          last_rebuilt_voice: agent.voice,
        })
        .eq("id", agent_id);

      if (hasCalcom) {
        await supabaseAdmin
          .from("integrations")
          .update({ is_active: true })
          .eq("agent_id", agent_id)
          .eq("type", "calcom");
      }

      return new Response(
        JSON.stringify({
          success: true,
          bolna_agent_id,
          vox_number: null,
          phone_linked: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const PHONE_NUMBER_ID = phoneNumberId;
    console.log("create-bolna-agent: Linking number:", PHONE_NUMBER_ID);

    const linkRes = await bolnaFetch("/inbound/setup", {
      method: "POST",
      body: JSON.stringify({
        agent_id: bolna_agent_id,
        phone_number_id: PHONE_NUMBER_ID,
      }),
    });

    console.log(
      "create-bolna-agent: Phone link:",
      JSON.stringify({
        ok: linkRes.ok,
        status: linkRes.status,
        data: JSON.stringify(linkRes.data).slice(0, 200),
      }),
    );

    await supabaseAdmin
      .from("agents")
      .update({
        bolna_agent_id,
        compiled_prompt,
        vox_number: voxNumber,
        status: linkRes.ok ? "active" : "provisioning",
        onboarding_complete: true,
        last_rebuilt_language: agent.language_primary,
        last_rebuilt_voice: agent.voice,
      })
      .eq("id", agent_id);

    // Mark Cal.com integration as active after successful agent creation
    if (hasCalcom) {
      await supabaseAdmin
        .from("integrations")
        .update({ is_active: true })
        .eq("agent_id", agent_id)
        .eq("type", "calcom");
    }

    console.log("create-bolna-agent: Supabase updated:", bolna_agent_id);

    return new Response(
      JSON.stringify({
        success: true,
        bolna_agent_id,
        vox_number: voxNumber,
        phone_linked: linkRes.ok,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-bolna-agent error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
