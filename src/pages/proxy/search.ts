import type { APIRoute } from 'astro'

export const prerender = false

const DEFAULT_INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://yewtu.be',
  'https://invidious.nerdvpn.de',
  'https://invidious.privacydev.net',
  'https://iv.melmac.space',
  'https://invidious.lunar.icu',
  'https://inv.tux.pizza',
]

// Public instances die regularly; the list is overridable at runtime so a
// rotation doesn't need a deploy. Read process.env per request (import.meta.env
// would be inlined at build time and defeat the purpose).
function invidiousInstances(): string[] {
  const env = process.env.INVIDIOUS_INSTANCES
  if (!env) {
    return DEFAULT_INVIDIOUS_INSTANCES
  }
  const list = env.split(',').map(s => s.trim()).filter(Boolean)
  return list.length > 0 ? list : DEFAULT_INVIDIOUS_INSTANCES
}

async function invidiousFetch(path: string): Promise<any> {
  const errors: string[] = []
  for (const base of invidiousInstances()) {
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

type SearchResult = { videoId: string; title: string; artist: string; duration: number }

async function fetchResults(q: string): Promise<SearchResult[]> {
  const data = await invidiousFetch(`/api/v1/search?q=${encodeURIComponent(q)}&type=video&page=1`)
  return (Array.isArray(data) ? data : [])
    .filter((v: any) => v.lengthSeconds > 0)
    .slice(0, 10)
    .map((v: any) => ({
      videoId: v.videoId,
      title: v.title,
      artist: v.author ?? '',
      duration: v.lengthSeconds,
    }))
}

// In-memory result cache (per Node process). Search results change slowly, so a
// short TTL spares the public Invidious instances from repeated identical queries.
type CacheEntry = { results: SearchResult[]; expiresAt: number }
const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 200
const cache = new Map<string, CacheEntry>()
// Coalesce concurrent identical queries onto a single upstream fetch.
const inflight = new Map<string, Promise<SearchResult[]>>()

function getCached(key: string): SearchResult[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  // Refresh recency for LRU eviction (Map keeps insertion order).
  cache.delete(key)
  cache.set(key, entry)
  return entry.results
}

function setCached(key: string, results: SearchResult[]): void {
  cache.set(key, { results, expiresAt: Date.now() + TTL_MS })
  if (cache.size > MAX_ENTRIES) {
    const lru = cache.keys().next().value
    if (lru !== undefined) cache.delete(lru)
  }
}

export const GET: APIRoute = async ({ request }) => {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return new Response(JSON.stringify({ error: 'q manquant' }), { status: 400 })

  const key = q.toLowerCase()
  const cached = getCached(key)
  if (cached) {
    return new Response(JSON.stringify({ results: cached }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    let pending = inflight.get(key)
    if (!pending) {
      // Errors are not cached: clear inflight so the next request retries.
      pending = fetchResults(q).finally(() => inflight.delete(key))
      inflight.set(key, pending)
    }
    const results = await pending
    setCached(key, results)
    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502 })
  }
}
