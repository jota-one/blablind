import type { APIRoute } from 'astro'

export const prerender = false

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://yewtu.be',
  'https://invidious.nerdvpn.de',
  'https://invidious.privacydev.net',
  'https://iv.melmac.space',
  'https://invidious.lunar.icu',
  'https://inv.tux.pizza',
]

async function invidiousFetch(path: string): Promise<any> {
  const errors: string[] = []
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(10_000) })
      if (res.ok) return res.json()
      errors.push(`${base} → HTTP ${res.status}`)
    } catch (e: any) {
      errors.push(`${base} → ${e.message}`)
    }
  }
  throw new Error(`Toutes les instances inaccessibles: ${errors.join(' | ')}`)
}

export const GET: APIRoute = async ({ request }) => {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q) return new Response(JSON.stringify({ error: 'q manquant' }), { status: 400 })

  try {
    const data = await invidiousFetch(`/api/v1/search?q=${encodeURIComponent(q)}&type=video&page=1`)
    const results = (Array.isArray(data) ? data : [])
      .filter((v: any) => v.lengthSeconds > 0)
      .slice(0, 10)
      .map((v: any) => ({
        videoId: v.videoId,
        title: v.title,
        artist: v.author ?? '',
        duration: v.lengthSeconds,
      }))
    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502 })
  }
}
