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
    console.log('UPDATE-BOLNA-AGENT: Starting for agent_id:', agent_id)

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

    if (!agent.bolna_agent_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bolna agent not created yet' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const knowledge = agent.knowledge?.[0] || agent.knowledge || null
    const compiled_prompt = compileAgentPrompt(agent, knowledge)

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

    // Voice detection
    const voiceStr = (agent.voice || '').toLowerCase()
    const isMale = voiceStr.includes('male') && !voiceStr.includes('female')
    const voiceId = isMale ? 'echo' : 'nova'

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const webhookUrl = `${supabaseUrl}/functions/v1/handle-call-webhook`

    const putBody = {
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

    console.log('UPDATE-BOLNA-AGENT: PUT body:', JSON.stringify(putBody).slice(0, 500))

    const putRes = await bolnaFetch(`/v2/agent/${agent.bolna_agent_id}`, {
      method: 'PUT',
      body: JSON.stringify(putBody)
    })

    console.log('UPDATE-BOLNA-AGENT: PUT result:', JSON.stringify({ ok: putRes.ok, status: putRes.status, data: JSON.stringify(putRes.data).slice(0, 300) }))

    if (!putRes.ok) {
      console.log('PUT failed, trying PATCH for supported fields only')
      await bolnaFetch(`/v2/agent/${agent.bolna_agent_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          agent_welcome_message: agent.greeting,
          webhook_url: webhookUrl,
          synthesizer: {
            provider: 'openai',
            provider_config: { voice: voiceId, model: 'tts-1' },
            stream: true,
            buffer_size: 100
          },
          agent_prompts: {
            task_1: { system_prompt: compiled_prompt }
          }
        })
      })
    }

    await supabaseAdmin.from('agents').update({ compiled_prompt }).eq('id', agent_id)

    return new Response(
      JSON.stringify({ success: putRes.ok }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('update-bolna-agent error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
