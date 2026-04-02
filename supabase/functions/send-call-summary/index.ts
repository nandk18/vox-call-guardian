import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

function formatPhone(num: string): string {
  if (!num) return 'Unknown'
  const clean = num.replace(/\D/g, '').replace(/^91/, '').slice(-10)
  if (clean.length === 10) return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`
  return num
}

function cleanPhone(num: string): string {
  return num.replace(/\D/g, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { call_id, agent_id } = await req.json()

    const { data: call } = await supabaseAdmin.from('calls').select('*').eq('id', call_id).single()
    if (!call) return new Response(JSON.stringify({ success: false, error: 'Call not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: agent } = await supabaseAdmin.from('agents').select('*').eq('id', agent_id).single()
    if (!agent) return new Response(JSON.stringify({ success: false, error: 'Agent not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Build message
    const callerDisplay = call.caller_name ? `${call.caller_name} (${formatPhone(call.caller_number)})` : formatPhone(call.caller_number)
    const durationDisplay = call.duration_secs > 0 ? `${Math.floor(call.duration_secs / 60)}m ${call.duration_secs % 60}s` : 'No answer'
    const urgencyEmoji: Record<string, string> = { high: '🔴 ', medium: '🟡 ', low: '🟢 ' }
    const urgency = call.caller_urgency || 'low'
    const urgencyIcon = urgencyEmoji[urgency] || '🟢 '

    const summaryMessage = `
📞 New call — ${agent.business_name}
👤 Caller: ${callerDisplay}
⏱ Duration: ${durationDisplay}
📋 Status: ${call.outcome}
🔧 What they need:
${call.caller_need || 'Not captured'}
⏰ Preferred callback time:
${call.preferred_callback_time || 'Not specified'}
${urgencyIcon} Urgency: ${urgency}
📝 Summary:
${call.summary || 'No summary available'}
View in Vox:
${Deno.env.get('VOX_APP_URL') || 'https://vox-reach-ai.lovable.app'}/app/inbox
    `.trim()

    let whatsappSent = false
    let smsSent = false
    let emailSent = false

    // 4. WhatsApp via WATI
    if (agent.notification_whatsapp && agent.owner_whatsapp) {
      const watiUrl = Deno.env.get('WATI_API_URL')
      const watiToken = Deno.env.get('WATI_ACCESS_TOKEN')
      if (watiUrl && watiToken) {
        try {
          const watiRes = await fetch(`${watiUrl}/api/v1/sendSessionMessage/${cleanPhone(agent.owner_whatsapp)}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${watiToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageText: summaryMessage })
          })
          whatsappSent = watiRes.ok
          if (!watiRes.ok) console.error('WATI failed:', await watiRes.text())
        } catch (e) { console.error('WhatsApp error:', e) }
      } else {
        console.log('WATI not configured, skipping WhatsApp')
      }
    }

    // 5. SMS via MSG91
    if (agent.notification_sms && agent.owner_mobile) {
      const msg91Key = Deno.env.get('MSG91_AUTH_KEY')
      if (msg91Key) {
        try {
          const smsBody = new URLSearchParams({
            authkey: msg91Key,
            mobiles: cleanPhone(agent.owner_mobile),
            message: `Vox: New call from ${formatPhone(call.caller_number)}. Need: ${call.caller_need || 'General enquiry'}. View: ${Deno.env.get('VOX_APP_URL') || 'https://vox-reach-ai.lovable.app'}/app/inbox`,
            sender: Deno.env.get('MSG91_SENDER_ID') || 'VOXAI',
            route: '4'
          })
          const smsRes = await fetch(`https://api.msg91.com/api/sendhttp.php?${smsBody.toString()}`)
          smsSent = smsRes.ok
          if (!smsRes.ok) console.error('MSG91 failed:', await smsRes.text())
        } catch (e) { console.error('SMS error:', e) }
      } else {
        console.log('MSG91 not configured, skipping SMS')
      }
    }

    // 6. Email via Resend
    if (agent.notification_email) {
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (resendKey) {
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(agent.user_id)
          const userEmail = userData?.user?.email
          if (userEmail) {
            const transcript = Array.isArray(call.transcript) ? call.transcript : []
            const transcriptHtml = transcript.length > 0
              ? transcript.map((t: any) => `<tr><td style="padding:4px 8px;font-weight:bold">${t.speaker === 'vox' ? 'VOX' : 'CALLER'}</td><td style="padding:4px 8px">${t.text}</td><td style="padding:4px 8px;color:#666">${t.timestamp}</td></tr>`).join('')
              : '<tr><td colspan="3" style="padding:8px;color:#666">No transcript available</td></tr>'

            const emailHtml = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px">
  <h2 style="color:#00e5a0">Vox Call Summary</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:8px;font-weight:bold">Business</td><td>${agent.business_name}</td></tr>
    <tr><td style="padding:8px;font-weight:bold">Caller</td><td>${callerDisplay}</td></tr>
    <tr><td style="padding:8px;font-weight:bold">Duration</td><td>${durationDisplay}</td></tr>
    <tr><td style="padding:8px;font-weight:bold">Urgency</td><td>${urgencyIcon} ${urgency}</td></tr>
  </table>
  <h3>✨ What they need</h3><p>${call.caller_need || 'Not captured'}</p>
  ${call.preferred_callback_time ? `<p>⏰ Preferred time: ${call.preferred_callback_time}</p>` : ''}
  <h3>📝 Summary</h3><p>${call.summary || 'No summary available'}</p>
  ${transcript.length > 0 ? `<h3>📋 Transcript</h3><table style="width:100%;border-collapse:collapse">${transcriptHtml}</table>` : ''}
  <p style="margin-top:24px"><a href="${Deno.env.get('VOX_APP_URL') || 'https://vox-reach-ai.lovable.app'}/app/inbox" style="background:#00e5a0;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View in Vox Inbox →</a></p>
  <p style="color:#999;font-size:12px;margin-top:24px">Sent by Vox AI · Your AI phone receptionist</p>
</div>`

            const emailRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'Vox <notifications@voxai.in>',
                to: userEmail,
                subject: `📞 New call from ${formatPhone(call.caller_number)} — ${agent.business_name}`,
                html: emailHtml
              })
            })
            emailSent = emailRes.ok
            if (!emailRes.ok) console.error('Resend failed:', await emailRes.text())
          }
        } catch (e) { console.error('Email error:', e) }
      }
    }

    // 7. Mark notification as sent
    await supabaseAdmin.from('calls').update({ notification_sent: true }).eq('id', call_id)

    return new Response(
      JSON.stringify({ success: true, whatsappSent, smsSent, emailSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('send-call-summary error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
