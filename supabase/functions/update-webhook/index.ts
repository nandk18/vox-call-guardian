import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { bolnaFetch } from '../_shared/bolna.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agent_id } = await req.json()

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('bolna_agent_id')
      .eq('id', agent_id)
      .single()

    if (!agent?.bolna_agent_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'No bolna_agent_id found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const webhookUrl = `${supabaseUrl}/functions/v1/handle-call-webhook`

    console.log('update-webhook agent:', agent.bolna_agent_id)
    console.log('update-webhook URL:', webhookUrl)

    // Try format 1 — top level
    const res1 = await bolnaFetch(
      `/v2/agent/${agent.bolna_agent_id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ webhook_url: webhookUrl })
      }
    )
    console.log('Format 1:', JSON.stringify(res1))

    // Try format 2 — inside agent_config
    const res2 = await bolnaFetch(
      `/v2/agent/${agent.bolna_agent_id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ agent_config: { webhook_url: webhookUrl } })
      }
    )
    console.log('Format 2:', JSON.stringify(res2))

    // GET current state to verify
    const getRes = await bolnaFetch(
      `/v2/agent/${agent.bolna_agent_id}`,
      { method: 'GET' }
    )
    console.log('Current state:', JSON.stringify(getRes).slice(0, 2000))

    return new Response(
      JSON.stringify({
        success: true,
        webhook_url: webhookUrl,
        format1: res1,
        format2: res2,
        current_agent: JSON.stringify(getRes).slice(0, 500)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('update-webhook error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
