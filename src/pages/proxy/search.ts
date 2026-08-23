import type { APIRoute } from 'astro'
import { searchYoutube, type SearchResult } from '@lib/youtube.ts'

export const prerender = false

// In-memory result cache (per Node process). Search results change slowly, so a
// short TTL spares the upstream backends from repeated identical queries.
type CacheEntry = { results: SearchResult[]; expiresAt: number }
const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 200
const cache = new Map<string, CacheEntry>()
// Coalesce concurrent identical queries onto a single upstream fetch.
const inflight = new Map<string, Promise<SearchResult[]>>()

function getCached(key: string): SearchResult[] | null {
  const entry = cache.get(key)
  if (!entry) {
    return null
  }
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
    if (lru !== undefined) {
      cache.delete(lru)
    }
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const GET: APIRoute = async ({ request }) => {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) {
    return json({ error: 'q manquant' }, 400)
  }

  const key = q.toLowerCase()
  const cached = getCached(key)
  if (cached) {
    return json({ results: cached, cached: true })
  }

  try {
    let pending = inflight.get(key)
    if (!pending) {
      // Errors are not cached: clear inflight so the next request retries.
      pending = searchYoutube(q)
        .then(({ results, provider, attempts }) => {
          // Backend fallbacks are silent to the user but worth logging: they
          // are the early warning that the primary backend has broken again.
          for (const attempt of attempts) {
            console.warn(`[proxy/search] ${attempt.provider} failed: ${attempt.error}`)
          }
          if (provider !== 'innertube') {
            console.warn(`[proxy/search] served by fallback backend "${provider}"`)
          }
          return results
        })
        .finally(() => inflight.delete(key))
      inflight.set(key, pending)
    }
    const results = await pending
    setCached(key, results)
    return json({ results })
  } catch (e: any) {
    console.error(`[proxy/search] "${q}": ${e.message}`)
    return json({ error: e.message }, 502)
  }
}
