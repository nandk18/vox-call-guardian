import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agent_id, bolna_agent_id } = await req.json()

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

    // STEP 1 — Search for available Indian numbers
    const searchRes = await fetch(
      `${BOLNA_API_URL}/phone-numbers/search?country=IN`,
      { headers: { 'Authorization': `Bearer ${BOLNA_API_KEY}` } }
    )

    if (!searchRes.ok) {
      console.error('Bolna number search failed')
      await supabaseAdmin.from('agents').update({ status: 'pending_number' }).eq('id', agent_id)
      await alertAdmin('Bolna number search API failed.')
      return new Response(
        JSON.stringify({ success: false, error: 'Could not search for numbers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const available = await searchRes.json()
    if (!available || available.length === 0) {
      console.error('No Indian numbers available on Bolna')
      await supabaseAdmin.from('agents').update({ status: 'pending_number' }).eq('id', agent_id)
      await alertAdmin('No Indian numbers available in Bolna. Please top up Bolna wallet and buy more numbers.')
      return new Response(
        JSON.stringify({ success: false, error: 'No numbers available' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STEP 2 — Buy the first available number
    const numberToBuy = available[0]
    const buyRes = await fetch(`${BOLNA_API_URL}/phone-numbers/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ country: 'IN', phone_number: numberToBuy.phone_number })
    })

    if (!buyRes.ok) {
      const buyErr = await buyRes.text()
      console.error('Bolna buy failed:', buyErr)
      await supabaseAdmin.from('agents').update({ status: 'pending_number' }).eq('id', agent_id)
      await alertAdmin(`Bolna number purchase failed: ${buyErr}`)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to purchase number' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const bought = await buyRes.json()

    // STEP 3 — Assign number to Bolna agent
    const assignRes = await fetch(`${BOLNA_API_URL}/inbound/setup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ agent_id: bolna_agent_id, phone_number_id: bought.id })
    })

    // STEP 4 — Save to Supabase
    const updateData: Record<string, unknown> = {
      vox_number: bought.phone_number,
      bolna_phone_number_id: bought.id
    }

    if (assignRes.ok) {
      updateData.status = 'active'
    } else {
      const assignErr = await assignRes.text()
      console.error('Bolna assign failed:', assignErr)
      updateData.status = 'pending_number'
      await alertAdmin(`Number ${bought.phone_number} was purchased (ID: ${bought.id}) but could not be assigned to Bolna agent ${bolna_agent_id}. Please assign manually in Bolna dashboard.`)
    }

    await supabaseAdmin.from('agents').update(updateData).eq('id', agent_id)

    return new Response(
      JSON.stringify({ success: assignRes.ok, vox_number: bought.phone_number, bolna_phone_number_id: bought.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('provision-vox-number error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
