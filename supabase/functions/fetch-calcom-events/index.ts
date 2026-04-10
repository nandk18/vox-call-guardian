import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { api_key } = await req.json()

    if (!api_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('fetch-calcom-events: Fetching event types...')

    const res = await fetch('https://api.cal.com/v2/event-types', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'cal-api-version': '2024-06-14',
        'Content-Type': 'application/json'
      }
    })

    const data = await res.json()

    console.log('fetch-calcom-events: Response status:', res.status)
    console.log('fetch-calcom-events: Data:', JSON.stringify(data).slice(0, 300))

    if (!res.ok) {
      return new Response(
        JSON.stringify({ success: false, error: data?.message || 'Invalid API key or Cal.com error' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const eventTypes = data?.data || []

    const events = eventTypes.map((e: any) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      length: e.lengthInMinutes || e.length || 30
    }))

    console.log('fetch-calcom-events: Found', events.length, 'event types')

    return new Response(
      JSON.stringify({ success: true, events }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('fetch-calcom-events error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
