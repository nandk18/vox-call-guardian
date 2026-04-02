import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

function formatPhone(num: string): string {
  if (!num) return 'Unknown'
  const clean = num.replace(/\D/g, '').replace(/^91/, '').slice(-10)
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`
  }
  return num
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

async function processWebhook(payload: any) {
  // 1. Find agent by bolna_agent_id
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, user_id, business_name, owner_whatsapp, owner_mobile, notification_whatsapp, notification_sms, notification_email')
    .eq('bolna_agent_id', payload.agent_id)
    .single()

  if (!agent) {
    console.error('Agent not found for bolna_agent_id:', payload.agent_id)
    return
  }

  // 2. Determine outcome
  const duration = payload.duration || 0
  const hasTranscript = payload.transcript?.length > 0

  let outcome = 'no_response'
  if (duration > 5 || hasTranscript) {
    outcome = 'answered'
  } else if (duration === 0 && !hasTranscript) {
    outcome = 'missed'
  }

  if (payload.extracted_data?.spam === true || payload.extracted_data?.is_spam === true) {
    outcome = 'spam'
  }

  // 3. Format transcript
  const transcript = (payload.transcript || []).map((t: any, i: number) => ({
    speaker: t.role === 'assistant' ? 'vox' : 'caller',
    text: t.content || '',
    timestamp: formatTimestamp(i * 5)
  }))

  // 4. Insert call
  const { data: call, error: insertErr } = await supabaseAdmin
    .from('calls')
    .insert({
      agent_id: agent.id,
      caller_number: payload.from_number || 'Unknown',
      duration_secs: duration,
      outcome,
      transcript,
      summary: payload.summary || '',
      caller_name: payload.extracted_data?.caller_name || null,
      caller_need: payload.extracted_data?.caller_need || null,
      caller_urgency: payload.extracted_data?.urgency || 'low',
      preferred_callback_time: payload.extracted_data?.preferred_time || null,
      recording_url: payload.recording_url || null,
      is_read: false,
      notification_sent: false
    })
    .select()
    .single()

  if (insertErr) {
    console.error('Failed to insert call:', insertErr)
    return
  }

  // 5. Trigger send-call-summary
  await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-call-summary`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({ call_id: call.id, agent_id: agent.id })
    }
  ).catch((e) => console.error('send-call-summary trigger failed:', e))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    // Only process completed calls
    if (payload.status !== 'completed') {
      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    // Process async — return 200 immediately
    processWebhook(payload).catch(e => console.error('Webhook processing error:', e))

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    console.error('handle-call-webhook error:', err)
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }
})
