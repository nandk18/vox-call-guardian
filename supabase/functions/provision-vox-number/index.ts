import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agent_id, bolna_agent_id } = await req.json()
    console.log('PROVISION-VOX-NUMBER: Starting', { agent_id, bolna_agent_id })

    const BOLNA_API_KEY = Deno.env.get('BOLNA_API_KEY') ?? ''
    const BOLNA_API_URL = Deno.env.get('BOLNA_API_URL') ?? 'https://api.bolna.ai'
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? ''

    const alertAdmin = async (msg: string) => {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Vox System <system@voxai.in>',
          to: ADMIN_EMAIL,
          subject: '⚠ Vox Number Provisioning Failed',
          html: `<p>${msg}</p><p>Agent ID: ${agent_id}<br>Bolna Agent ID: ${bolna_agent_id}</p><p>Please provision manually.</p>`
        })
      }).catch(e => console.error('Alert email failed:', e))
    }

    // STEP 1 — Search for available US numbers (US for testing, switch to IN later)
    const searchUrl = `${BOLNA_API_URL}/phone-numbers/search?country=US`
    console.log('BOLNA REQUEST:', { url: searchUrl, method: 'GET' })
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${BOLNA_API_KEY}` }
    })

    const searchBody = await searchRes.json().catch(() => null)
    console.log('BOLNA RESPONSE (search):', { status: searchRes.status, ok: searchRes.ok, body: JSON.stringify(searchBody) })

    if (!searchRes.ok) {
      console.error('Bolna number search failed')
      await supabaseAdmin.from('agents').update({ status: 'pending_number' }).eq('id', agent_id)
      await alertAdmin('Bolna number search API failed.')
      return new Response(
        JSON.stringify({ success: false, error: 'Could not search for numbers', details: searchBody }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const available = Array.isArray(searchBody) ? searchBody : []
    if (available.length === 0) {
      console.error('No US numbers available on Bolna')
      await supabaseAdmin.from('agents').update({ status: 'pending_number' }).eq('id', agent_id)
      await alertAdmin('No US numbers available in Bolna. Please top up Bolna wallet and buy more numbers.')
      return new Response(
        JSON.stringify({ success: false, error: 'No numbers available' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STEP 2 — Buy the first available number
    const numberToBuy = available[0]
    const buyUrl = `${BOLNA_API_URL}/phone-numbers/buy`
    const buyBody = { country: 'US', phone_number: numberToBuy.phone_number }
    console.log('BOLNA REQUEST:', { url: buyUrl, method: 'POST', body: JSON.stringify(buyBody) })

    const buyRes = await fetch(buyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buyBody)
    })

    const buyData = await buyRes.json().catch(() => null)
    console.log('BOLNA RESPONSE (buy):', { status: buyRes.status, ok: buyRes.ok, body: JSON.stringify(buyData) })

    if (!buyRes.ok) {
      console.error('Bolna buy failed:', JSON.stringify(buyData))
      await supabaseAdmin.from('agents').update({ status: 'pending_number' }).eq('id', agent_id)
      await alertAdmin(`Bolna number purchase failed: ${JSON.stringify(buyData)}`)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to purchase number', details: buyData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const bought = buyData

    // STEP 3 — Assign number to Bolna agent
    const assignUrl = `${BOLNA_API_URL}/inbound/setup`
    const assignBody = { agent_id: bolna_agent_id, phone_number_id: bought.id }
    console.log('BOLNA REQUEST:', { url: assignUrl, method: 'POST', body: JSON.stringify(assignBody) })

    const assignRes = await fetch(assignUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assignBody)
    })

    const assignData = await assignRes.json().catch(() => null)
    console.log('BOLNA RESPONSE (assign):', { status: assignRes.status, ok: assignRes.ok, body: JSON.stringify(assignData) })

    // STEP 4 — Save to Supabase
    const updateData: Record<string, unknown> = {
      vox_number: bought.phone_number,
      bolna_phone_number_id: bought.id
    }

    if (assignRes.ok) {
      updateData.status = 'active'
    } else {
      console.error('Bolna assign failed:', JSON.stringify(assignData))
      updateData.status = 'pending_number'
      await alertAdmin(`Number ${bought.phone_number} was purchased (ID: ${bought.id}) but could not be assigned to Bolna agent ${bolna_agent_id}. Please assign manually in Bolna dashboard.`)
    }

    await supabaseAdmin.from('agents').update(updateData).eq('id', agent_id)
    console.log('PROVISION-VOX-NUMBER: Complete', { vox_number: bought.phone_number, status: updateData.status })

    // Also set webhook on the Bolna agent
    if (assignRes.ok) {
      console.log('PROVISION-VOX-NUMBER: Setting webhook...')
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-call-webhook`
      const BOLNA_API_KEY = Deno.env.get('BOLNA_API_KEY') ?? ''
      const BOLNA_API_URL = Deno.env.get('BOLNA_API_URL') ?? 'https://api.bolna.ai'
      const whRes = await fetch(`${BOLNA_API_URL}/v2/agent/${bolna_agent_id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${BOLNA_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl })
      })
      const whData = await whRes.json().catch(() => null)
      console.log('PROVISION-VOX-NUMBER: Webhook set result:', { ok: whRes.ok, data: JSON.stringify(whData) })
    }

    return new Response(
      JSON.stringify({ success: assignRes.ok, vox_number: bought.phone_number, bolna_phone_number_id: bought.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('provision-vox-number error:', err, err instanceof Error ? err.stack : '')
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
