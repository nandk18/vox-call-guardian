import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

async function analyzeTranscript(
  transcript: any[],
  businessName: string,
  callerNumber: string
): Promise<{
  summary: string
  callerName: string | null
  callerNeed: string | null
  urgency: string
  preferredTime: string | null
}> {
  if (!transcript || transcript.length < 2) {
    return {
      summary: `Call from ${callerNumber}. No conversation recorded.`,
      callerName: null,
      callerNeed: null,
      urgency: 'low',
      preferredTime: null
    }
  }

  const transcriptText = transcript
    .map(t => `${t.speaker === 'vox' ? 'Agent' : 'Caller'}: ${t.text}`)
    .join('\n')

  try {
    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: `You are analyzing a call transcript for a business called "${businessName}".

Extract the following from this transcript and respond ONLY with a JSON object, no other text:

{
  "summary": "2-3 sentence summary of the call for the business owner. Include what the caller needed and any important details.",
  "caller_name": "full name if mentioned, null if not",
  "caller_need": "one sentence describing what they need, null if unclear",
  "urgency": "high if urgent/emergency, medium if soon, low if general",
  "preferred_time": "preferred appointment or callback time if mentioned, null if not"
}

Transcript:
${transcriptText}`
            }
          ]
        })
      }
    )

    const data = await response.json()
    const text = data?.content?.[0]?.text || ''
    console.log('analyzeTranscript: Claude response:', text.slice(0, 200))

    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      summary: parsed.summary || `Call from ${callerNumber}.`,
      callerName: parsed.caller_name || null,
      callerNeed: parsed.caller_need || null,
      urgency: parsed.urgency || 'low',
      preferredTime: parsed.preferred_time || null
    }
  } catch (e) {
    console.error('analyzeTranscript error:', e)
    const callerLines = transcript
      .filter(t => t.speaker === 'caller')
      .map(t => t.text)
      .filter(t => t?.length > 0)

    return {
      summary: callerLines.length > 0
        ? `Call from ${callerNumber}. Customer said: "${callerLines.slice(0, 2).join('. ')}"`
        : `Call from ${callerNumber}.`,
      callerName: null,
      callerNeed: null,
      urgency: 'low',
      preferredTime: null
    }
  }
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
    console.error('processWebhook: No agent_id')
    return
  }

  // Deduplicate by call_id
  const bolnaCallId = payload?.id || payload?.call_id
  if (bolnaCallId) {
    const { data: existing } = await supabaseAdmin
      .from('calls')
      .select('id')
      .eq('bolna_call_id', bolnaCallId)
      .maybeSingle()

    if (existing) {
      console.log('processWebhook: Duplicate, skipping:', bolnaCallId)
      return
    }
  }

  // Get fields from correct locations
  const callerNumber =
    payload?.telephony_data?.from_number ||
    payload?.from_number ||
    payload?.customer_number ||
    'Unknown'

  const recordingUrl =
    payload?.telephony_data?.recording_url ||
    payload?.recording_url ||
    null

  const duration = Math.floor(
    payload?.conversation_duration ||
    payload?.duration ||
    0
  )

  console.log('processWebhook: Fields:', {
    bolnaCallId, callerNumber, duration, hasRecording: !!recordingUrl
  })

  // Parse transcript from plain string
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
  }

  console.log('processWebhook: Transcript lines:', formattedTranscript.length)

  // Find agent by bolna_agent_id
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

  // Determine outcome
  const isSpam = payload?.extracted_data?.is_spam === true
  const outcome = isSpam ? 'spam' :
    duration > 5 ? 'answered' :
    formattedTranscript.length > 1 ? 'answered' : 'missed'

  // Analyze transcript with Claude
  console.log('processWebhook: Analyzing transcript with Claude...')
  const analysis = await analyzeTranscript(
    formattedTranscript,
    agent.business_name || 'the business',
    callerNumber
  )

  console.log('processWebhook: Analysis:', JSON.stringify({
    summary: analysis.summary.slice(0, 100),
    callerName: analysis.callerName,
    callerNeed: analysis.callerNeed,
    urgency: analysis.urgency
  }))

  // Insert call record
  const { data: call, error: insertErr } = await supabaseAdmin
    .from('calls')
    .insert({
      agent_id: agent.id,
      bolna_call_id: bolnaCallId,
      caller_number: callerNumber,
      duration_secs: duration,
      outcome,
      transcript: formattedTranscript,
      summary: analysis.summary,
      caller_name: analysis.callerName,
      caller_need: analysis.callerNeed,
      caller_urgency: analysis.urgency,
      preferred_callback_time: analysis.preferredTime,
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
    from: payload?.telephony_data?.from_number || payload?.from_number,
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
