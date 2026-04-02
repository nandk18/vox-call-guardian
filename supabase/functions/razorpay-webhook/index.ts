import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const respond = (msg = 'ok') =>
    new Response(JSON.stringify({ received: true, msg }), { status: 200 })

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')

    if (!secret || !signature) {
      return respond('missing signature or secret')
    }

    // 1. Verify signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
    const expectedSig = Array.from(new Uint8Array(sigBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature !== expectedSig) {
      console.error('Invalid Razorpay signature')
      return respond('invalid signature')
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event

    // 2. Extract agent_id from notes
    const agent_id =
      payload.payload?.subscription?.entity?.notes?.agent_id ||
      payload.payload?.payment?.entity?.notes?.agent_id

    if (!agent_id) {
      console.error('No agent_id in Razorpay payload notes:', payload)
      return respond('no agent_id in notes')
    }

    // 3. Handle events
    if (event === 'payment.captured' || event === 'subscription.activated') {
      await supabaseAdmin.from('agents').update({
        plan: 'unlimited', status: 'active', trial_ends_at: null
      }).eq('id', agent_id)
      console.log(`Agent ${agent_id} subscribed successfully`)
    } else if (event === 'subscription.cancelled' || event === 'subscription.halted') {
      await supabaseAdmin.from('agents').update({
        plan: 'free', status: 'inactive'
      }).eq('id', agent_id)
      console.log(`Agent ${agent_id} subscription cancelled`)
    }

    return respond('processed')
  } catch (err) {
    console.error('razorpay-webhook error:', err)
    return respond('error but acknowledged')
  }
})
