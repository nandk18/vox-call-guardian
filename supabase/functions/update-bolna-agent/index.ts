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
    const voiceId = agent.voice === 'male' ? 'echo' : 'nova'

    const { ok, data } = await bolnaFetch(`/v2/agent/${agent.bolna_agent_id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        agent_welcome_message: agent.greeting,
        agent_prompts: { task_1: { system_prompt: compiled_prompt } },
        synthesizer: {
          provider: 'openai',
          provider_config: { voice: voiceId, model: 'tts-1' }
        }
      })
    })

    if (!ok) console.error('Bolna PATCH failed:', data)

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
