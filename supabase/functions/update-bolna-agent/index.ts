import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { compileAgentPrompt } from '../_shared/compilePrompt.ts'
import { bolnaFetch } from '../_shared/bolna.ts'
import { getProviderConfig } from '../_shared/providers.ts'

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

    const { transcriber, synthesizer } = getProviderConfig(
      agent.language_primary || 'hindi',
      agent.voice || 'female'
    )

    const { ok, data } = await bolnaFetch(`/v2/agent/${agent.bolna_agent_id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        agent_welcome_message: agent.greeting,
        agent_prompts: { task_1: { system_prompt: compiled_prompt } },
        synthesizer,
        transcriber
      })
    })

    console.log('UPDATE-BOLNA-AGENT: Bolna PATCH result:', JSON.stringify({ ok, data }))

    if (!ok) console.error('Bolna PATCH failed:', data)

    // Also set webhook after every update
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const webhookUrl = `${supabaseUrl}/functions/v1/handle-call-webhook`
    await bolnaFetch(`/v2/agent/${agent.bolna_agent_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ webhook_url: webhookUrl })
    })

    await supabaseAdmin.from('agents').update({ compiled_prompt }).eq('id', agent_id)

    return new Response(
      JSON.stringify({ success: ok }),
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
