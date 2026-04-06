import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { compileAgentPrompt } from '../_shared/compilePrompt.ts'
import { getProviderConfig } from '../_shared/providers.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agent_id } = await req.json()
    console.log('CREATE-BOLNA-AGENT: Starting for agent_id:', agent_id)

    const { data: agent, error: agentErr } = await supabaseAdmin
      .from('agents')
      .select('*, knowledge(*)')
      .eq('id', agent_id)
      .single()

    if (agentErr || !agent) {
      console.error('CREATE-BOLNA-AGENT: Agent not found:', agentErr)
      return new Response(
        JSON.stringify({ success: false, error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const knowledge = agent.knowledge?.[0] || agent.knowledge || null
    console.log('CREATE-BOLNA-AGENT: Agent loaded:', { business_name: agent.business_name, industry: agent.industry, language: agent.language_primary, voice: agent.voice })

    const compiled_prompt = compileAgentPrompt(agent, knowledge)
    console.log('CREATE-BOLNA-AGENT: Prompt compiled, length:', compiled_prompt.length)

    // Language config
    const indianLanguages = [
      'hindi', 'tamil', 'telugu', 'kannada',
      'malayalam', 'marathi', 'bengali',
      'gujarati', 'punjabi', 'odia'
    ]
    const isIndian = indianLanguages.includes(agent.language_primary)
    const langCodeMap: Record<string, string> = {
      english: 'en', hindi: 'hi', tamil: 'ta', telugu: 'te',
      kannada: 'kn', malayalam: 'ml', marathi: 'mr', bengali: 'bn',
      gujarati: 'gu', punjabi: 'pa', odia: 'or'
    }
    const langCode = langCodeMap[agent.language_primary] || 'en'

    const transcriber = isIndian
      ? { provider: 'deepgram', model: 'nova-2', language: 'multi', stream: true, sampling_rate: 16000, encoding: 'linear16', endpointing: 100 }
      : { provider: 'deepgram', model: 'nova-2', language: langCode, stream: true, sampling_rate: 16000, encoding: 'linear16', endpointing: 100 }

    const voiceStr = (agent.voice || '').toLowerCase()
    const isMale = voiceStr.includes('male') && !voiceStr.includes('female')
    const voiceId = isMale ? 'echo' : 'nova'

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const webhookUrl = `${supabaseUrl}/functions/v1/handle-call-webhook`

    const BOLNA_API_KEY = Deno.env.get('BOLNA_API_KEY') ?? ''
    const BOLNA_API_URL = Deno.env.get('BOLNA_API_URL') ?? 'https://api.bolna.ai'
    const createUrl = `${BOLNA_API_URL}/v2/agent`
    const createBody = {
      agent_config: {
        agent_name: `${agent.business_name} - Vox`,
        agent_type: 'IVR',
        agent_welcome_message: agent.greeting,
        webhook_url: webhookUrl,
        agent_hangup_prompt: `End the call when ALL are true: 1. You understand what caller needs 2. You have their name 3. You confirmed callback number 4. You told them team will follow up 5. Caller said goodbye or is done. Do NOT hang up if caller is still talking or asking questions.`,
        tasks: [{
          task_type: 'conversation',
          toolchain: { execution: 'parallel', pipelines: [['transcriber', 'llm', 'synthesizer']] },
          tools_config: {
            input: { format: 'pcm', provider: 'default' },
            output: { format: 'pcm', provider: 'default' },
            transcriber,
            synthesizer: {
              provider: 'openai',
              provider_config: { voice: voiceId, model: 'tts-1' },
              stream: true,
              buffer_size: 100
            },
            llm_agent: {
              agent_type: 'simple_llm_agent',
              llm_config: {
                model: 'gpt-4o-mini',
                provider: 'openai',
                max_tokens: 100,
                temperature: 0.1,
                request_json: false,
                max_input_tokens: 2000,
                stream: true,
                summarization_details: 'Summarize this customer call in 2-3 clear sentences for the business owner. Include: 1) Why the customer called 2) What they need or want 3) Any appointment or timing details 4) Any specific requests. Write as if briefing the business owner who will follow up with this customer.',
                extraction_details: 'caller_name: Full name of the caller. Return null if not mentioned. caller_need: One sentence describing what the caller needs. preferred_time: Preferred date or time for appointment. Return null if not mentioned. urgency: high if emergency or urgent. medium if they need it soon. low for general enquiry. is_spam: true if robocall or spam. false for genuine callers. callback_number: Different callback number if mentioned. null otherwise.'
              },
              max_tokens: 100,
              agent_flow_type: 'streaming',
              provider: 'openai',
              model: 'gpt-4o-mini',
              temperature: 0.1,
              request_json: false
            }
          },
          task_config: {
            hangup_after_silence: 8,
            incremental_delay: 100,
            number_of_words_for_interruption: 2,
            call_cancellation_prompt: `Caller has been silent too long. Say: Thank you for calling. If you need help please call us back. Have a great day. Then hang up.`
          }
        }]
      },
      agent_prompts: {
        task_1: { system_prompt: compiled_prompt }
      }
    }

    console.log('BOLNA REQUEST:', { url: createUrl, method: 'POST', body: JSON.stringify(createBody).slice(0, 500) })

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createBody)
    })

    const createData = await createRes.json().catch(() => null)
    console.log('BOLNA RESPONSE:', { status: createRes.status, ok: createRes.ok, body: JSON.stringify(createData) })

    if (!createRes.ok || !createData?.agent_id) {
      const errorDetail = JSON.stringify(createData)
      console.error('CREATE-BOLNA-AGENT: Bolna create failed:', errorDetail)
      await supabaseAdmin.from('agents').update({
        status: 'error',
        onboarding_complete: true,
        compiled_prompt
      }).eq('id', agent_id)

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create AI agent', bolna_error: createData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const bolna_agent_id = createData.agent_id
    console.log('CREATE-BOLNA-AGENT: Agent created with bolna_agent_id:', bolna_agent_id)

    // Set webhook URL — try both formats
    console.log('Setting webhook:', webhookUrl)
    const wh1Res = await fetch(`${BOLNA_API_URL}/v2/agent/${bolna_agent_id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${BOLNA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook_url: webhookUrl })
    })
    const wh1Data = await wh1Res.json().catch(() => null)
    console.log('Webhook format 1:', JSON.stringify({ ok: wh1Res.ok, data: wh1Data }))

    const wh2Res = await fetch(`${BOLNA_API_URL}/v2/agent/${bolna_agent_id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${BOLNA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_config: { webhook_url: webhookUrl } })
    })
    const wh2Data = await wh2Res.json().catch(() => null)
    console.log('Webhook format 2:', JSON.stringify({ ok: wh2Res.ok, data: wh2Data }))

    // Verify
    const verifyRes = await fetch(`${BOLNA_API_URL}/v2/agent/${bolna_agent_id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${BOLNA_API_KEY}` }
    })
    const verifyData = await verifyRes.json().catch(() => null)
    console.log('Agent after webhook set:', JSON.stringify(verifyData).slice(0, 2000))

    // Save bolna_agent_id + compiled_prompt
    await supabaseAdmin.from('agents').update({
      bolna_agent_id, compiled_prompt, onboarding_complete: true, status: 'provisioning'
    }).eq('id', agent_id)

    // Provision phone number
    console.log('CREATE-BOLNA-AGENT: Triggering number provisioning...')
    const provisionRes = await fetch(
      `${supabaseUrl}/functions/v1/provision-vox-number`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ agent_id, bolna_agent_id })
      }
    )

    const provisionData = await provisionRes.json().catch(() => null)
    console.log('CREATE-BOLNA-AGENT: Provision result:', JSON.stringify(provisionData))

    return new Response(
      JSON.stringify({
        success: true,
        bolna_agent_id,
        vox_number: provisionData?.vox_number || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('create-bolna-agent error:', err, err instanceof Error ? err.stack : '')
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
