const BOLNA_API_URL = Deno.env.get('BOLNA_API_URL') ?? 'https://api.bolna.ai'
const BOLNA_API_KEY = Deno.env.get('BOLNA_API_KEY') ?? ''

const bolnaHeaders = {
  'Authorization': `Bearer ${BOLNA_API_KEY}`,
  'Content-Type': 'application/json'
}

export const bolnaFetch = async (
  path: string,
  options: RequestInit = {}
) => {
  const res = await fetch(
    `${BOLNA_API_URL}${path}`,
    {
      ...options,
      headers: {
        ...bolnaHeaders,
        ...(options.headers ?? {})
      }
    }
  )
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}
