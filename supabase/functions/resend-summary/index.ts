import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { call_id } = await req.json()

    const { data: call } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single()

    if (!call) {
      return new Response(
        JSON.stringify({ success: false, error: 'Call not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call send-call-summary
    const res = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-call-summary`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ call_id: call.id, agent_id: call.agent_id })
      }
    )

    const result = await res.json()

    return new Response(
      JSON.stringify({ success: result.success }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('resend-summary error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
