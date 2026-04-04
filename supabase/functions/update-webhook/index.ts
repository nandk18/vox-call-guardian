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

    console.log('Setting webhook:', webhookUrl)
    console.log('On Bolna agent:', agent.bolna_agent_id)

    const { ok, data } = await bolnaFetch(
      `/v2/agent/${agent.bolna_agent_id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ webhook_url: webhookUrl })
      }
    )

    console.log('Bolna PATCH:', { ok, data })

    return new Response(
      JSON.stringify({ success: ok, webhook_url: webhookUrl, bolna_response: data }),
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
