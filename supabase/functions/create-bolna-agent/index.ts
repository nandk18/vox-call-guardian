import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { compileAgentPrompt } from '../_shared/compilePrompt.ts'
import { getProviderConfig } from '../_shared/providers.ts'
import { bolnaFetch } from '../_shared/bolna.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agent_id } = await req.json()

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('*, knowledge(*)')
      .eq('id', agent_id)
      .single()

    if (!agent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const knowledge = Array.isArray(agent.knowledge)
      ? agent.knowledge[0] || {}
      : agent.knowledge || {}

    const compiled_prompt = compileAgentPrompt(agent, knowledge)

    const { transcriber, synthesizer } = getProviderConfig(
      agent.language_primary || 'english',
      agent.voice || 'female'
    )

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const webhookUrl = `${supabaseUrl}/functions/v1/handle-call-webhook`

    console.log('create-bolna-agent: business:', agent.business_name)
    console.log('create-bolna-agent: language:', agent.language_primary)
    console.log('create-bolna-agent: voice:', agent.voice, '→', synthesizer.provider_config.voice)
    console.log('create-bolna-agent: transcriber:', JSON.stringify(transcriber))

    const createBody = {
      agent_config: {
        agent_name: `${agent.business_name} - Vox`,
        agent_type: 'IVR',
        agent_welcome_message: agent.greeting || `Thank you for calling ${agent.business_name}, how can I help you today?`,
        webhook_url: webhookUrl,
        tasks: [
          {
            task_type: 'conversation',
            toolchain: {
              execution: 'parallel',
              pipelines: [['transcriber', 'llm', 'synthesizer']]
            },
            tools_config: {
              input: { format: 'wav', provider: 'twilio' },
              output: { format: 'wav', provider: 'twilio' },
              transcriber,
              synthesizer,
              llm_agent: {
                agent_type: 'simple_llm_agent',
                llm_config: {
                  model: 'gpt-4o-mini',
                  provider: 'openai',
                  max_tokens: 150,
                  temperature: 0.1,
                  request_json: false,
                  agent_flow_type: 'streaming',
                  summarization_details: 'Summarize this customer call in 2-3 sentences for the business owner. Include why they called, what they need, and any appointment or timing details.',
                  extraction_details: 'caller_name: Full name of caller. null if not given. caller_need: What the caller needs in one sentence. preferred_time: Preferred time or date. null if not mentioned. urgency: high medium or low. is_spam: true if spam or robocall. false otherwise.'
                },
                agent_flow_type: 'streaming'
              }
            },
            task_config: {
              hangup_after_silence: 30,
              incremental_delay: 200,
              optimize_latency: true,
              hangup_after_LLMCall: false,
              number_of_words_for_interruption: 2,
              check_if_user_online: true,
              check_user_online_message: 'Hey, are you still there?'
            }
          }
        ]
      },
      agent_prompts: {
        task_1: { system_prompt: compiled_prompt }
      }
    }

    console.log('create-bolna-agent: POST body (first 500):', JSON.stringify(createBody).slice(0, 500))

    const createRes = await bolnaFetch('/v2/agent', {
      method: 'POST',
      body: JSON.stringify(createBody)
    })

    console.log('create-bolna-agent: POST result:', JSON.stringify({
      ok: createRes.ok,
      status: createRes.status,
      data: JSON.stringify(createRes.data).slice(0, 300)
    }))

    if (!createRes.ok || !createRes.data?.agent_id) {
      console.error('create-bolna-agent: Failed:', JSON.stringify(createRes.data))
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create agent', details: createRes.data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const bolna_agent_id = createRes.data.agent_id
    console.log('create-bolna-agent: Created:', bolna_agent_id)

    const PHONE_NUMBER_ID = '58cf9c77-e784-423f-9cb5-48bcf655fe25'
    console.log('create-bolna-agent: Linking number:', PHONE_NUMBER_ID)

    const linkRes = await bolnaFetch('/inbound/setup', {
      method: 'POST',
      body: JSON.stringify({
        agent_id: bolna_agent_id,
        phone_number_id: PHONE_NUMBER_ID
      })
    })

    console.log('create-bolna-agent: Phone link:', JSON.stringify({
      ok: linkRes.ok,
      status: linkRes.status,
      data: JSON.stringify(linkRes.data).slice(0, 200)
    }))

    await supabaseAdmin
      .from('agents')
      .update({
        bolna_agent_id,
        compiled_prompt,
        vox_number: '+16813033721',
        status: linkRes.ok ? 'active' : 'provisioning',
        onboarding_complete: true,
        last_rebuilt_language: agent.language_primary,
        last_rebuilt_voice: agent.voice
      })
      .eq('id', agent_id)

    console.log('create-bolna-agent: Supabase updated:', bolna_agent_id)

    return new Response(
      JSON.stringify({
        success: true,
        bolna_agent_id,
        vox_number: '+16813033721',
        phone_linked: linkRes.ok
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('create-bolna-agent error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
