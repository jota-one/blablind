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

export const GET: APIRoute = async ({ request }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return new Response(JSON.stringify({ error: 'id manquant' }), { status: 400 })

  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${base}/api/v1/videos/${id}?fields=title,author,lengthSeconds`, {
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) continue
      const data = await res.json()
      return new Response(
        JSON.stringify({
          title: data.title ?? '',
          artist: data.author ?? '',
          duration: data.lengthSeconds ?? 0,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    } catch {
      /* essayer le suivant */
    }
  }

  return new Response(JSON.stringify({ error: 'Métadonnées introuvables' }), { status: 502 })
}
