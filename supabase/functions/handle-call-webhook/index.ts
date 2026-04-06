import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

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

function generateSummary(transcript: any[], callerNumber: string): string {
  if (!transcript?.length) {
    return `Call from ${callerNumber}. No conversation recorded.`
  }
  const callerLines = transcript
    .filter(t => t.speaker === 'caller')
    .map(t => t.text)
    .filter(t => t?.length > 0)
  if (!callerLines.length) {
    return `Call from ${callerNumber}. Caller did not speak.`
  }
  return `Call from ${callerNumber}. Customer: "${callerLines.slice(0, 3).join('. ')}"`
}

async function processWebhook(payload: any) {
  console.log('processWebhook: Starting', JSON.stringify({
    id: payload?.id,
    agent_id: payload?.agent_id,
    status: payload?.status,
    duration: payload?.conversation_duration
  }))

  const bolnaAgentId = payload?.agent_id
  if (!bolnaAgentId) {
    console.error('No agent_id in payload')
    return
  }

  const duration = Math.floor(payload?.conversation_duration || payload?.duration || 0)
  const recordingUrl = payload?.recording_url || null

  // Parse transcript — Bolna sends plain string "assistant: Hello\nuser: Hi..."
  const transcriptRaw = payload?.transcript || ''
  let formattedTranscript: any[] = []

  if (typeof transcriptRaw === 'string' && transcriptRaw.trim().length > 0) {
    const lines = transcriptRaw.split('\n').filter((l: string) => l.trim().length > 0)
    formattedTranscript = lines.map((line: string, i: number) => {
      const isAssistant = line.toLowerCase().startsWith('assistant:')
      const text = line.replace(/^assistant:\s*/i, '').replace(/^user:\s*/i, '').trim()
      return {
        speaker: isAssistant ? 'vox' : 'caller',
        text,
        timestamp: formatTimestamp(i * 5)
      }
    })
  } else if (Array.isArray(transcriptRaw)) {
    formattedTranscript = transcriptRaw.map((t: any, i: number) => ({
      speaker: t.role === 'assistant' || t.role === 'agent' ? 'vox' : 'caller',
      text: t.content || t.text || '',
      timestamp: t.timestamp || formatTimestamp(i * 5)
    }))
  }

  console.log('processWebhook: Transcript:', formattedTranscript.length, 'lines')

  // Extraction data
  const extracted = payload?.extracted_data || payload?.extractions || {}
  const callerName = extracted?.caller_name || null
  const callerNeed = extracted?.caller_need || null
  const urgency = extracted?.urgency || 'low'
  const preferredTime = extracted?.preferred_time || null
  const isSpam = extracted?.is_spam === true

  // Summary
  const callerNumber = payload?.customer_number || payload?.from_number || payload?.caller_number || 'Unknown'
  const summary = payload?.summary || generateSummary(formattedTranscript, callerNumber)

  // Outcome
  const outcome = isSpam ? 'spam' :
    duration > 5 ? 'answered' :
    formattedTranscript.length > 1 ? 'answered' : 'missed'

  // Find agent
  const { data: agent, error: agentErr } = await supabaseAdmin
    .from('agents')
    .select('id, user_id, business_name, owner_whatsapp, owner_mobile, notification_whatsapp, notification_sms, notification_email')
    .eq('bolna_agent_id', bolnaAgentId)
    .maybeSingle()

  if (agentErr || !agent) {
    console.error('processWebhook: Agent not found:', bolnaAgentId, agentErr)
    return
  }

  console.log('processWebhook: Agent:', agent.id, agent.business_name)

  // Insert call
  const { data: call, error: insertErr } = await supabaseAdmin
    .from('calls')
    .insert({
      agent_id: agent.id,
      caller_number: callerNumber,
      duration_secs: duration,
      outcome,
      transcript: formattedTranscript,
      summary,
      caller_name: callerName,
      caller_need: callerNeed,
      caller_urgency: urgency,
      preferred_callback_time: preferredTime,
      recording_url: recordingUrl,
      is_read: false,
      notification_sent: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (insertErr) {
    console.error('processWebhook: Insert error:', insertErr)
    return
  }

  console.log('processWebhook: Inserted:', call.id)

  // Send notifications
  try {
    const res = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-call-summary`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ call_id: call.id, agent_id: agent.id })
      }
    )
    const d = await res.json()
    console.log('processWebhook: Notifications:', JSON.stringify(d))
  } catch (e) {
    console.error('processWebhook: Notification error:', e)
  }
}

Deno.serve(async (req) => {
  console.log('WEBHOOK HIT:', req.method, req.url)

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    })
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'webhook active', timestamp: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let payload: any = null
  try {
    const bodyText = await req.text()
    console.log('WEBHOOK BODY:', bodyText.slice(0, 1000))
    payload = JSON.parse(bodyText)
  } catch (e) {
    console.log('WEBHOOK non-JSON:', e)
    return new Response('ok', { status: 200 })
  }

  console.log('WEBHOOK PARSED:', JSON.stringify({
    status: payload?.status,
    agent_id: payload?.agent_id,
    call_id: payload?.id,
    from: payload?.customer_number || payload?.from_number,
    duration: payload?.conversation_duration || payload?.duration
  }))

  const skipStatuses = ['queued', 'initiated', 'ringing', 'in_progress', 'in-progress']
  if (payload?.status && skipStatuses.includes(payload.status.toLowerCase())) {
    console.log('WEBHOOK skip:', payload.status)
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  processWebhook(payload).catch((e) => console.error('WEBHOOK PROCESS ERROR:', e))

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
