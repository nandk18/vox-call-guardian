import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { compileAgentPrompt } from '../_shared/compilePrompt.ts'
import { bolnaFetch } from '../_shared/bolna.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agent_id } = await req.json()

    // 1. Fetch agent + knowledge
    const { data: agent, error: agentErr } = await supabaseAdmin
      .from('agents')
      .select('*, knowledge(*)')
      .eq('id', agent_id)
      .single()

    if (agentErr || !agent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const knowledge = agent.knowledge?.[0] || agent.knowledge || null

    // 2. Compile prompt
    const compiled_prompt = compileAgentPrompt(agent, knowledge)

    // 3. Determine voice ID (nova = female, echo = male)
    const voiceId = agent.voice === 'male' ? 'echo' : 'nova'

    // 4. Map language to Bolna language code
    const langCodeMap: Record<string, string> = {
      hindi: 'hi', english: 'en', tamil: 'ta', telugu: 'te',
      kannada: 'kn', malayalam: 'ml', marathi: 'mr', bengali: 'bn',
      gujarati: 'gu', punjabi: 'pa', odia: 'or'
    }
    const langCode = langCodeMap[agent.language_primary] || 'hi'

    // 5. POST to Bolna to create agent
    const { ok: createOk, data: bolnaAgent } = await bolnaFetch('/v2/agent', {
      method: 'POST',
      body: JSON.stringify({
        agent_config: {
          agent_name: `${agent.business_name} - Vox`,
          agent_type: 'IVR',
          agent_welcome_message: agent.greeting,
          tasks: [{
            task_type: 'conversation',
            toolchain: {
              execution: 'parallel',
              pipelines: [['transcriber', 'llm', 'synthesizer']]
            },
            tools_config: {
              input: { format: 'pcm', provider: 'default' },
              output: { format: 'pcm', provider: 'default' },
              synthesizer: {
                provider: 'openai',
                provider_config: { voice: voiceId, model: 'tts-1' },
                stream: true,
                buffer_size: 200
              },
              llm_agent: {
                max_tokens: 150,
                agent_flow_type: 'streaming',
                provider: 'openai',
                model: 'gpt-4o-mini',
                temperature: 0.3,
                request_json: false
              },
              transcriber: {
                provider: 'deepgram',
                model: 'nova-2',
                language: langCode,
                stream: true
              }
            },
            task_config: {
              hangup_after_silence: 10,
              call_cancellation_prompt: null
            }
          }]
        },
        agent_prompts: {
          task_1: { system_prompt: compiled_prompt }
        }
      })
    })

    if (!createOk || !bolnaAgent?.agent_id) {
      console.error('Bolna create failed:', bolnaAgent)
      await supabaseAdmin.from('agents').update({
        status: 'error', onboarding_complete: true, compiled_prompt
      }).eq('id', agent_id)

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create AI agent. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const bolna_agent_id = bolnaAgent.agent_id

    // 6. Set webhook URL on Bolna agent
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-call-webhook`
    await bolnaFetch(`/v2/agent/${bolna_agent_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ webhook_url: webhookUrl })
    })

    // 7. Save bolna_agent_id + compiled_prompt
    await supabaseAdmin.from('agents').update({
      bolna_agent_id, compiled_prompt, onboarding_complete: true, status: 'provisioning'
    }).eq('id', agent_id)

    // 8. Provision phone number
    const provisionRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/provision-vox-number`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ agent_id, bolna_agent_id })
      }
    )

    const provisionData = await provisionRes.json()

    return new Response(
      JSON.stringify({
        success: true,
        bolna_agent_id,
        vox_number: provisionData.vox_number || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('create-bolna-agent error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
