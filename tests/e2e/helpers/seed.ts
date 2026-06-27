import PocketBase from 'pocketbase'

// Game collections have open create/update rules, so seeding needs no auth — but
// `sessions` and `videos` have no delete rule, so cleanup requires a superuser.
// Provide PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD to enable teardown.
const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8093'

export const pb = new PocketBase(PB_URL)

let authed = false
export async function ensureAdmin(): Promise<boolean> {
  if (authed) return true
  const email = process.env.PB_ADMIN_EMAIL
  const password = process.env.PB_ADMIN_PASSWORD
  if (!email || !password) return false
  await pb.collection('_superusers').authWithPassword(email, password)
  authed = true
  return true
}

export type SeededPlayer = { id: string; name: string; secret: string }

export type Scenario = {
  sessionId: string
  slug: string
  videoId: string
  host: SeededPlayer
  alice: SeededPlayer
  bob: SeededPlayer
  track1Id: string
  track2Id: string
}

const nowIso = () => new Date().toISOString()

async function createPlayer(sessionId: string, name: string): Promise<SeededPlayer> {
  const secret = `s-${name}-${Math.random().toString(36).slice(2, 8)}`
  const rec = await pb.collection('players').create({
    session: sessionId,
    name,
    secret,
    ready: true,
    last_seen: nowIso(),
  })
  return { id: rec.id, name, secret }
}

/**
 * Seeds a session already mid-game: one track playing, one queued, three online
 * players. The playing track is owned by the host, so the host is the validator
 * and alice/bob can buzz. `continue_after_success` is off so a correct answer
 * makes the host auto-advance to the next track — the convergence we assert.
 */
export async function seedAdvanceScenario(): Promise<Scenario> {
  await ensureAdmin()
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const slug = `e2e-${stamp}`

  // Unique video_id per run: YouTube is stubbed in tests, so the real id is
  // irrelevant and a fresh value avoids colliding with the dev DB's catalogue.
  const video = await pb.collection('videos').create({
    video_id: `e2e-${stamp}`,
    title: 'E2E Track',
    artist: 'E2E Artist',
    duration: 213,
    search_text: 'e2e track e2e artist',
  })

  const session = await pb.collection('sessions').create({
    name: 'E2E Room',
    slug,
    status: 'playing',
    settings: {
      max_buzz_attempts: 5,
      rebuzz_delay: 0,
      auto_reject_delay: 0,
      continue_after_success: false,
      stop_method: 'vote_unanimous',
      force_equity: false,
      equity_margin: 1,
    },
  })

  const host = await createPlayer(session.id, 'Host')
  const alice = await createPlayer(session.id, 'Alice')
  const bob = await createPlayer(session.id, 'Bob')

  await pb.collection('sessions').update(session.id, { host: host.id })

  const track1 = await pb.collection('tracks').create({
    session: session.id,
    video: video.id,
    added_by: host.id,
    status: 'playing',
    order: 1,
    start_seconds: 0,
  })
  const track2 = await pb.collection('tracks').create({
    session: session.id,
    video: video.id,
    added_by: host.id,
    status: 'queued',
    order: 2,
    start_seconds: 0,
  })

  return {
    sessionId: session.id,
    slug,
    videoId: video.id,
    host,
    alice,
    bob,
    track1Id: track1.id,
    track2Id: track2.id,
  }
}

/**
 * Deleting the session cascades players, tracks and buzzes. Video is standalone.
 * Requires superuser auth (no delete rule on sessions/videos); without admin
 * creds the records are left behind and a warning is printed.
 */
export async function cleanup(scenario: Scenario): Promise<void> {
  if (!(await ensureAdmin())) {
    console.warn('[e2e] PB_ADMIN_EMAIL/PASSWORD not set — leaving seeded records behind')
    return
  }
  await pb.collection('sessions').delete(scenario.sessionId).catch(() => {})
  await pb.collection('videos').delete(scenario.videoId).catch(() => {})
}

export async function getTrack(id: string) {
  return pb.collection('tracks').getOne(id)
}
