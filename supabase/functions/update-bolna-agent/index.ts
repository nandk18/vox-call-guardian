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
    console.log('update-bolna-agent: Starting for agent_id:', agent_id)

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
        JSON.stringify({ success: false, error: 'No bolna_agent_id — run resync first' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const knowledge = Array.isArray(agent.knowledge)
      ? agent.knowledge[0] || {}
      : agent.knowledge || {}

    const compiled_prompt = compileAgentPrompt(agent, knowledge)

    const { synthesizer } = getProviderConfig(
      agent.language_primary || 'english',
      agent.voice || 'female'
    )

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const webhookUrl = `${supabaseUrl}/functions/v1/handle-call-webhook`

    console.log('update-bolna-agent: Starting for:', agent.bolna_agent_id)
    console.log('update-bolna-agent: Language:', agent.language_primary)
    console.log('update-bolna-agent: Voice:', agent.voice, '→', synthesizer.provider_config.voice)

    // PATCH 1 — prompt, greeting, webhook
    const patch1 = await bolnaFetch(`/v2/agent/${agent.bolna_agent_id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        agent_name: `${agent.business_name} - Vox`,
        agent_welcome_message: agent.greeting,
        webhook_url: webhookUrl,
        agent_prompts: {
          task_1: { system_prompt: compiled_prompt }
        }
      })
    })

    console.log('update-bolna-agent: PATCH 1 (prompt/greeting):', JSON.stringify({
      ok: patch1.ok,
      status: patch1.status
    }))

    // PATCH 2 — synthesizer/voice
    const patch2 = await bolnaFetch(`/v2/agent/${agent.bolna_agent_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ synthesizer })
    })

    console.log('update-bolna-agent: PATCH 2 (synthesizer/voice):', JSON.stringify({
      ok: patch2.ok,
      status: patch2.status
    }))

    console.log('update-bolna-agent: NOTE: Transcriber language cannot be updated via PATCH. If language was changed, user must click Resync to recreate the agent with new language.')

    // Update compiled_prompt in Supabase
    await supabaseAdmin.from('agents').update({ compiled_prompt }).eq('id', agent_id)

    return new Response(
      JSON.stringify({
        success: patch1.ok,
        prompt_updated: patch1.ok,
        voice_updated: patch2.ok,
        language_note: 'Language change requires Resync to take effect'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('update-bolna-agent error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
