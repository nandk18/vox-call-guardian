import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature') || ''

    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || ''
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (expectedSignature !== signature) {
      console.error('razorpay-webhook: Invalid signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
    }

    const event = JSON.parse(body)
    const eventType = event.event
    console.log('razorpay-webhook: event:', eventType)

    const extractEmail = (): string | null => {
      let email: string | null = null
      if (event.payload?.subscription?.entity) {
        const sub = event.payload.subscription.entity
        email = sub.notes?.email || sub.customer_email || null
      }
      if (!email && event.payload?.payment?.entity) {
        const payment = event.payload.payment.entity
        email = payment.email || payment.notes?.email || null
      }
      return email
    }

    const findUserByEmail = async (email: string) => {
      const { data: authUser } = await supabaseAdmin.auth.admin.listUsers()
      return authUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    }

    if (
      eventType === 'subscription.activated' ||
      eventType === 'subscription.charged' ||
      eventType === 'payment.captured'
    ) {
      const email = extractEmail()
      const planId =
        event.payload?.subscription?.entity?.plan_id ||
        event.payload?.payment?.entity?.description ||
        null
      const isYearly = planId === 'plan_SkoqPthvaM1v3O'
      console.log('razorpay-webhook: email:', email, 'plan_id:', planId)
      if (email) {
        const user = await findUserByEmail(email)
        if (user) {
          const { error } = await supabaseAdmin
            .from('agents')
            .update({ plan: 'unlimited', status: 'active', trial_ends_at: null })
            .eq('user_id', user.id)
          if (error) console.error('razorpay-webhook: DB error:', error)
          else console.log('razorpay-webhook: Plan activated:', isYearly ? 'Yearly' : 'Monthly', 'for:', email)
        } else {
          console.log('razorpay-webhook: User not found for email:', email)
        }
      }
    }

    if (eventType === 'subscription.cancelled' || eventType === 'subscription.completed') {
      const email = extractEmail()
      if (email) {
        const user = await findUserByEmail(email)
        if (user) {
          await supabaseAdmin
            .from('agents')
            .update({ plan: 'trial', trial_ends_at: new Date().toISOString() })
            .eq('user_id', user.id)
          console.log('razorpay-webhook: Plan downgraded for:', email)
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('razorpay-webhook error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
