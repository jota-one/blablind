// YouTube search backends for the /proxy/search endpoint.
//
// Context: the public Invidious network is no longer usable as a primary
// backend — most instances are dead, and the survivors answer datacenter IPs
// with an anti-bot HTML page under a 200 status. The primary backend is now
// YouTube's own InnerTube endpoint, which needs no API key and no quota.
//
// Parsing is kept pure (no fetch) so it can be unit-tested against captured
// payloads; only the *Search functions do I/O.

export type SearchResult = {
  videoId: string
  title: string
  artist: string
  duration: number
}

/** "4:09" -> 249, "1:02:03" -> 3723. Returns 0 when unparsable (live, upcoming). */
export function parseDuration(text: string | null | undefined): number {
  if (!text) {
    return 0
  }
  const parts = text.trim().split(':').map(p => Number(p))
  if (parts.length === 0 || parts.length > 3 || parts.some(n => !Number.isFinite(n) || n < 0)) {
    return 0
  }
  return parts.reduce((total, n) => total * 60 + n, 0)
}

function textOf(node: any): string {
  if (!node) {
    return ''
  }
  if (typeof node.simpleText === 'string') {
    return node.simpleText
  }
  if (Array.isArray(node.runs)) {
    return node.runs.map((r: any) => r?.text ?? '').join('')
  }
  return ''
}

// InnerTube nests results at a path that differs per declared client and that
// YouTube reorganises without notice: `videoRenderer` under
// twoColumnSearchResultsRenderer for WEB, `videoWithContextRenderer` under
// sectionListRenderer for MWEB. Rather than track those paths, we walk the
// whole tree and keep any node that *looks* like a video: an id, a title and a
// duration on the same object. Navigation nodes (watchEndpoint) carry a videoId
// but neither title nor duration, so the shape itself excludes them.

const TITLE_KEYS = ['title', 'headline']
const ARTIST_KEYS = ['ownerText', 'shortBylineText', 'longBylineText', 'author']
const DURATION_TEXT_KEYS = ['lengthText', 'lengthString', 'durationText']

// Bounds the walk: search payloads sit around 300 KB / a few thousand nodes, so
// these only ever trip on a malformed or hostile response.
const MAX_NODES = 200_000
const MAX_DEPTH = 100

function firstText(node: any, keys: string[]): string {
  for (const key of keys) {
    const text = textOf(node[key])
    if (text) {
      return text
    }
  }
  return ''
}

function durationOf(node: any): number {
  // Some clients expose a numeric lengthSeconds instead of a formatted label.
  const seconds = Number(node.lengthSeconds)
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds
  }
  return parseDuration(firstText(node, DURATION_TEXT_KEYS))
}

/**
 * Collect video-like nodes anywhere in an InnerTube payload, in document order
 * (which is relevance order), deduplicated by videoId.
 */
function collectVideoNodes(root: any): any[] {
  const found: any[] = []
  const seen = new Set<string>()
  let budget = MAX_NODES

  const walk = (node: any, depth: number): void => {
    if (budget <= 0 || depth > MAX_DEPTH || node === null || typeof node !== 'object') {
      return
    }
    budget--

    if (!Array.isArray(node) && typeof node.videoId === 'string' && node.videoId !== '') {
      const hasTitle = firstText(node, TITLE_KEYS) !== ''
      // A node needs a title *and* a duration to count as a result: that pairing
      // is what separates a real renderer from an endpoint or a thumbnail ref.
      if (hasTitle && durationOf(node) > 0 && !seen.has(node.videoId)) {
        seen.add(node.videoId)
        found.push(node)
        // Children of a matched renderer are its own thumbnails and endpoints —
        // nothing else to find below.
        return
      }
    }

    for (const key of Object.keys(node)) {
      walk(node[key], depth + 1)
    }
  }

  walk(root, 0)
  return found
}

/** Extract every video from an InnerTube search payload, whatever its shape. */
export function parseInnerTubeSearch(data: any): SearchResult[] {
  // Nodes without a positive duration never reach here: live, upcoming and
  // private/deleted videos are filtered out by collectVideoNodes.
  return collectVideoNodes(data).map(node => ({
    videoId: node.videoId,
    title: firstText(node, TITLE_KEYS),
    artist: firstText(node, ARTIST_KEYS),
    duration: durationOf(node),
  }))
}

/** Extract results from an Invidious /api/v1/search payload. */
export function parseInvidiousSearch(data: any): SearchResult[] {
  if (!Array.isArray(data)) {
    return []
  }
  return data
    .filter((v: any) => v?.videoId && v?.lengthSeconds > 0)
    .map((v: any) => ({
      videoId: v.videoId,
      title: v.title ?? '',
      artist: v.author ?? '',
      duration: v.lengthSeconds,
    }))
}

/** Merge a Data API search.list page with the videos.list durations lookup. */
export function parseDataApiSearch(searchData: any, videosData: any): SearchResult[] {
  const durations = new Map<string, number>()
  for (const item of videosData?.items ?? []) {
    if (item?.id) {
      durations.set(item.id, parseIso8601Duration(item?.contentDetails?.duration))
    }
  }
  const results: SearchResult[] = []
  for (const item of searchData?.items ?? []) {
    const videoId = item?.id?.videoId
    const duration = durations.get(videoId) ?? 0
    if (!videoId || duration <= 0) {
      continue
    }
    results.push({
      videoId,
      title: item?.snippet?.title ?? '',
      artist: item?.snippet?.channelTitle ?? '',
      duration,
    })
  }
  return results
}

/** "PT4M9S" -> 249. Returns 0 when unparsable. */
export function parseIso8601Duration(text: string | null | undefined): number {
  if (!text) {
    return 0
  }
  const match = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(text)
  if (!match) {
    return 0
  }
  const [, h, m, s] = match
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0)
}

// ---------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 10_000
const MAX_RESULTS = 10

// A browser UA matters: YouTube and the anti-bot layers in front of Invidious
// both treat the default Node fetch UA as a bot.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

/** Reject HTML error/captcha pages served under a 200 status. */
async function jsonOrThrow(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('json')) {
    throw new Error(`expected JSON, got "${contentType || 'nothing'}"`)
  }
  return res.json()
}

// InnerTube is YouTube's own web client API: no key, no quota, no third party.
// `params` is the base64 filter for "type = video".
const INNERTUBE_URL = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false'
const INNERTUBE_VIDEO_ONLY = 'EgIQAQ%3D%3D'

export async function innertubeSearch(q: string): Promise<SearchResult[]> {
  const res = await fetch(INNERTUBE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240401.00.00',
          hl: 'fr',
          gl: 'FR',
        },
      },
      query: q,
      params: INNERTUBE_VIDEO_ONLY,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return parseInnerTubeSearch(await jsonOrThrow(res))
}

// Official Data API. Costs 100 quota units per search (~99 searches/day on the
// free tier), so it only runs when InnerTube fails and a key is configured.
export async function dataApiSearch(q: string, key: string): Promise<SearchResult[]> {
  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${MAX_RESULTS}` +
    `&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`
  const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!searchRes.ok) {
    throw new Error(`search.list HTTP ${searchRes.status}`)
  }
  const searchData = await jsonOrThrow(searchRes)

  const ids = (searchData?.items ?? [])
    .map((i: any) => i?.id?.videoId)
    .filter(Boolean)
  if (ids.length === 0) {
    return []
  }

  // search.list omits durations; videos.list adds them for 1 extra quota unit.
  const videosUrl =
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids.join(',')}` +
    `&key=${encodeURIComponent(key)}`
  const videosRes = await fetch(videosUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!videosRes.ok) {
    throw new Error(`videos.list HTTP ${videosRes.status}`)
  }
  return parseDataApiSearch(searchData, await jsonOrThrow(videosRes))
}

// Kept as a last resort only. Public instances die constantly, so the list is
// overridable at runtime (read process.env per request: import.meta.env would
// be inlined at build time and defeat the purpose).
const DEFAULT_INVIDIOUS_INSTANCES = [
  'https://yewtu.be',
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
]

export function invidiousInstances(): string[] {
  const env = process.env.INVIDIOUS_INSTANCES
  if (!env) {
    return DEFAULT_INVIDIOUS_INSTANCES
  }
  const list = env.split(',').map(s => s.trim()).filter(Boolean)
  return list.length > 0 ? list : DEFAULT_INVIDIOUS_INSTANCES
}

export async function invidiousSearch(q: string): Promise<SearchResult[]> {
  const path = `/api/v1/search?q=${encodeURIComponent(q)}&type=video&page=1`
  const errors: string[] = []
  for (const base of invidiousInstances()) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) {
        errors.push(`${base} → HTTP ${res.status}`)
        continue
      }
      return parseInvidiousSearch(await jsonOrThrow(res))
    } catch (e: any) {
      errors.push(`${base} → ${e.message}`)
    }
  }
  throw new Error(`no instance reachable: ${errors.join(' | ')}`)
}

export type ProviderAttempt = { provider: string; error: string }

/**
 * Try each backend in order of cost, cheapest and most reliable first.
 * An empty result set is a valid answer and stops the chain — only a thrown
 * error falls through to the next backend.
 */
export async function searchYoutube(
  q: string,
): Promise<{ results: SearchResult[]; provider: string; attempts: ProviderAttempt[] }> {
  // Name is imposed by the infra: apps.yaml nests the value under `secrets:`,
  // which the .env generator flattens to SECRETS_<KEY> (same as ut-astro's
  // SECRETS_MANDRILL_API_KEY). process.env is the prod path (systemd sources
  // the generated .env); import.meta.env is the local dev fallback.
  // `import.meta.env` only exists once Vite has processed this module: it is
  // undefined under plain Node (unit tests, scripts), hence the optional chain.
  const key = process.env.SECRETS_YOUTUBE_API_KEY ?? import.meta.env?.SECRETS_YOUTUBE_API_KEY
  const providers: Array<{ name: string; run: () => Promise<SearchResult[]> }> = [
    { name: 'innertube', run: () => innertubeSearch(q) },
  ]
  if (key) {
    providers.push({ name: 'dataapi', run: () => dataApiSearch(q, key) })
  }
  providers.push({ name: 'invidious', run: () => invidiousSearch(q) })

  const attempts: ProviderAttempt[] = []
  for (const provider of providers) {
    try {
      const results = await provider.run()
      return { results: results.slice(0, MAX_RESULTS), provider: provider.name, attempts }
    } catch (e: any) {
      attempts.push({ provider: provider.name, error: e.message })
    }
  }
  throw new Error(
    `all backends failed: ${attempts.map(a => `${a.provider} → ${a.error}`).join(' | ')}`,
  )
}
