import type { APIRoute } from 'astro'

export const prerender = false

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://yewtu.be',
  'https://invidious.nerdvpn.de',
]

async function invidiousFetch(path: string): Promise<any> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(10_000) })
      if (res.ok) return res.json()
    } catch {
      // essayer le suivant
    }
  }
  throw new Error('Toutes les instances Invidious sont inaccessibles')
}

export const GET: APIRoute = async ({ request }) => {
  const { searchParams } = new URL(request.url)
  const playlistId = searchParams.get('id')
  if (!playlistId) {
    return new Response(JSON.stringify({ error: 'id manquant' }), { status: 400 })
  }

  try {
    const tracks: { videoId: string; title: string; artist: string; duration: number }[] = []
    let page = 1
    let name = ''

    while (true) {
      const data = await invidiousFetch(`/api/v1/playlists/${playlistId}?page=${page}`)
      if (page === 1) name = data.title
      const videos: any[] = data.videos ?? []
      for (const v of videos) {
        tracks.push({
          videoId: v.videoId,
          title: v.title,
          artist: v.author ?? '',
          duration: v.lengthSeconds ?? 0,
        })
      }
      if (videos.length < 100) break
      page++
    }

    return new Response(JSON.stringify({ name, tracks }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502 })
  }
}
