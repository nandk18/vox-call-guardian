import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

function formatPhone(num: string): string {
  if (!num) return 'Unknown'
  const clean = num.replace(/\D/g, '')
  if (clean.startsWith('1') && clean.length === 11) {
    return `+1 ${clean.slice(1,4)} ${clean.slice(4,7)} ${clean.slice(7)}`
  }
  if (clean.startsWith('91') && clean.length === 12) {
    const n = clean.slice(2)
    return `+91 ${n.slice(0,5)} ${n.slice(5)}`
  }
  if (clean.length === 10) {
    return `+91 ${clean.slice(0,5)} ${clean.slice(5)}`
  }
  return num
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

async function processWebhook(payload: any) {
  console.log('WEBHOOK PROCESS: Starting for agent_id:', payload.agent_id)

  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, user_id, business_name, owner_whatsapp, owner_mobile, notification_whatsapp, notification_sms, notification_email')
    .eq('bolna_agent_id', payload.agent_id)
    .single()

  if (!agent) {
    console.error('WEBHOOK: Agent not found for bolna_agent_id:', payload.agent_id)
    return
  }

  console.log('WEBHOOK: Found agent:', agent.id, agent.business_name)

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

  const transcript = (payload.transcript || []).map((t: any, i: number) => ({
    speaker: t.role === 'assistant' ? 'vox' : 'caller',
    text: t.content || '',
    timestamp: formatTimestamp(i * 5)
  }))

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
    console.error('WEBHOOK: Failed to insert call:', insertErr)
    return
  }

  console.log('WEBHOOK: Call inserted:', call.id)

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
  console.log('WEBHOOK HIT:', req.method, req.url)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let payload: any = null
  try {
    const bodyText = await req.text()
    console.log('WEBHOOK RAW BODY:', bodyText.slice(0, 500))
    payload = JSON.parse(bodyText)
  } catch (e) {
    console.log('WEBHOOK: Could not parse body:', e)
    return new Response('ok', { status: 200 })
  }

  console.log('WEBHOOK PAYLOAD:', JSON.stringify({
    status: payload?.status,
    agent_id: payload?.agent_id,
    call_id: payload?.call_id,
    from_number: payload?.from_number,
    duration: payload?.duration
  }))

  const skipStatuses = ['queued', 'initiated', 'ringing', 'in_progress', 'in-progress']
  if (skipStatuses.includes(payload?.status?.toLowerCase())) {
    console.log('WEBHOOK: Skipping status:', payload?.status)
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    )
  }

  processWebhook(payload).catch(
    (e) => console.error('WEBHOOK PROCESS ERROR:', e)
  )

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200 }
  )
})
