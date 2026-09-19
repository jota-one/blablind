import PocketBase from 'pocketbase'
import { writeFile } from 'node:fs/promises'
import { SEED_FILE, DEMO_EMAIL, DEMO_PASSWORD, type Seed } from './config.ts'

// Builds the fictional dataset the tutorial screenshots are taken against: a
// demo member, three sessions (waiting / playing / finished), playlists and
// favourites. Everything it creates is namespaced `demo-` and wiped on re-run.
// Sessions are IRL like the wizard creates them (`irl_mode: true`): one player
// is the DJ and plays the music out loud, the others answer by voice.
// Needs PB_ADMIN_EMAIL/PASSWORD — sessions have no delete rule.
// Run: pnpm tutorial:seed

const pb = new PocketBase(process.env.PB_URL || 'http://127.0.0.1:8093')

const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString()

/** Real videos from the dev library, so the shots show plausible titles. */
const CATALOG = [
  'aEryAoLfnAA',
  'dDXXM9ytbdQ',
  'DUT5rEU6pqM',
  'rYEDA3JcQqw',
  'G6Kspj3OO0s',
  'OFNrN_6Ta5I',
  'Fe93CLbHjxQ',
  'gGdGFtwCNBE',
  'iWOyfLBYtuU',
  'zrFI2gJSuwA',
  'A4-wvmX5Tbk',
  'DpM766s_4kM',
]

const CLASSIC_SETTINGS = {
  max_buzz_attempts: 3,
  rebuzz_delay: 5,
  auto_reject_delay: 8,
  continue_after_success: true,
  stop_method: 'vote_unanimous',
  force_equity: false,
  equity_margin: 1,
}

async function main() {
  const email = process.env.PB_ADMIN_EMAIL
  const password = process.env.PB_ADMIN_PASSWORD
  if (!email || !password) {
    console.error('PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD required (sessions have no delete rule).')
    process.exit(1)
  }
  await pb.collection('_superusers').authWithPassword(email, password)

  // ─── demo member ─────────────────────────────────────────────────────────
  let user: any
  try {
    user = await pb.collection('users').getFirstListItem(`email="${DEMO_EMAIL}"`)
  } catch {
    user = await pb.collection('users').create({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      passwordConfirm: DEMO_PASSWORD,
      name: 'Léa',
      verified: true,
      emailVisibility: false,
    })
  }

  // ─── wipe the previous run ───────────────────────────────────────────────
  for (const s of await pb.collection('sessions').getFullList({ filter: 'slug ~ "demo-"' })) {
    await pb
      .collection('sessions')
      .delete(s.id)
      .catch(() => {})
  }
  for (const p of await pb.collection('playlists').getFullList({ filter: `owner="${user.id}"` })) {
    await pb
      .collection('playlists')
      .delete(p.id)
      .catch(() => {})
  }
  for (const f of await pb.collection('favorites').getFullList({ filter: `user="${user.id}"` })) {
    await pb
      .collection('favorites')
      .delete(f.id)
      .catch(() => {})
  }

  const V: Record<string, any> = {}
  for (const vid of CATALOG) {
    V[vid] = await pb.collection('videos').getFirstListItem(`video_id="${vid}"`)
  }

  const mkPlayer = async (sessionId: string, name: string, opts: Record<string, unknown> = {}) =>
    pb.collection('players').create({
      session: sessionId,
      name,
      secret: `demo-${name.toLowerCase()}-${sessionId}`,
      ready: true,
      last_seen: iso(-5_000),
      ...opts,
    })

  // ─── waiting room ────────────────────────────────────────────────────────
  const lobby = await pb.collection('sessions').create({
    name: 'Blind test entre potes',
    slug: 'demo-lobby',
    status: 'waiting',
    mode: 'classic',
    irl_mode: true,
    owner: user.id,
    settings: CLASSIC_SETTINGS,
  })
  const lobbyLea = await mkPlayer(lobby.id, 'Léa', { auth_user: user.id })
  await mkPlayer(lobby.id, 'Tom')
  await mkPlayer(lobby.id, 'Sarah')
  await mkPlayer(lobby.id, 'Max', { ready: false })
  await pb.collection('sessions').update(lobby.id, { host: lobbyLea.id, dj_player: lobbyLea.id })
  for (const [i, vid] of ['aEryAoLfnAA', 'dDXXM9ytbdQ', 'DUT5rEU6pqM'].entries()) {
    await pb.collection('tracks').create({
      session: lobby.id,
      video: V[vid].id,
      added_by: lobbyLea.id,
      status: 'queued',
      order: i + 1,
      start_seconds: 30,
      reveal_seconds: 45,
    })
  }

  // ─── mid-game ────────────────────────────────────────────────────────────
  const game = await pb.collection('sessions').create({
    name: 'Soirée 90s',
    slug: 'demo-partie',
    status: 'playing',
    mode: 'classic',
    irl_mode: true,
    owner: user.id,
    settings: CLASSIC_SETTINGS,
  })
  const P: Record<string, any> = {
    lea: await mkPlayer(game.id, 'Léa', { auth_user: user.id }),
    tom: await mkPlayer(game.id, 'Tom'),
    sarah: await mkPlayer(game.id, 'Sarah'),
    max: await mkPlayer(game.id, 'Max'),
  }
  // Host and DJ deliberately differ: Léa coordinates, Tom's phone plays the music.
  await pb.collection('sessions').update(game.id, { host: P.lea.id, dj_player: P.tom!.id })

  const GAME_TRACKS = [
    { vid: 'rYEDA3JcQqw', by: 'tom', status: 'done', solved: 'sarah' },
    { vid: 'G6Kspj3OO0s', by: 'sarah', status: 'done', solved: 'lea' },
    { vid: 'OFNrN_6Ta5I', by: 'max', status: 'done', solved: 'tom' },
    { vid: 'Fe93CLbHjxQ', by: 'lea', status: 'done', solved: 'sarah' },
    { vid: 'gGdGFtwCNBE', by: 'tom', status: 'playing', solved: null },
    { vid: 'iWOyfLBYtuU', by: 'sarah', status: 'queued', solved: null },
    { vid: 'zrFI2gJSuwA', by: 'max', status: 'queued', solved: null },
    { vid: 'A4-wvmX5Tbk', by: 'lea', status: 'queued', solved: null },
  ]
  let playingTrackId = ''
  for (const [i, track] of GAME_TRACKS.entries()) {
    const rec = await pb.collection('tracks').create({
      session: game.id,
      video: V[track.vid].id,
      added_by: P[track.by].id,
      status: track.status,
      order: i + 1,
      start_seconds: 42,
      reveal_seconds: 58,
      ...(track.solved ? { solved_by: P[track.solved].id } : {}),
      ...(track.status === 'playing' ? { started_at: iso(-12_000) } : {}),
    })
    if (track.status === 'playing') {
      playingTrackId = rec.id
    }
  }

  // ─── finished game (podium) ──────────────────────────────────────────────
  const over = await pb.collection('sessions').create({
    name: 'Karaoké du vendredi',
    slug: 'demo-fin',
    status: 'finished',
    mode: 'classic',
    irl_mode: true,
    owner: user.id,
    settings: CLASSIC_SETTINGS,
  })
  const O: Record<string, any> = {
    lea: await mkPlayer(over.id, 'Léa', { auth_user: user.id }),
    tom: await mkPlayer(over.id, 'Tom'),
    sarah: await mkPlayer(over.id, 'Sarah'),
    max: await mkPlayer(over.id, 'Max'),
  }
  await pb.collection('sessions').update(over.id, { host: O.lea.id, dj_player: O.lea!.id })
  const OVER_TRACKS = [
    { vid: 'aEryAoLfnAA', by: 'tom', solved: 'lea' },
    { vid: 'dDXXM9ytbdQ', by: 'sarah', solved: 'lea' },
    { vid: 'DUT5rEU6pqM', by: 'max', solved: 'tom' },
    { vid: 'rYEDA3JcQqw', by: 'lea', solved: 'sarah' },
    { vid: 'G6Kspj3OO0s', by: 'tom', solved: 'lea' },
    { vid: 'OFNrN_6Ta5I', by: 'sarah', solved: 'max' },
    { vid: 'Fe93CLbHjxQ', by: 'max', solved: 'tom' },
    { vid: 'zrFI2gJSuwA', by: 'lea', solved: null },
  ]
  for (const [i, track] of OVER_TRACKS.entries()) {
    await pb.collection('tracks').create({
      session: over.id,
      video: V[track.vid].id,
      added_by: O[track.by].id,
      status: 'done',
      order: i + 1,
      start_seconds: 35,
      reveal_seconds: 50,
      ...(track.solved ? { solved_by: O[track.solved].id } : { skip_revealed: true }),
    })
  }

  // ─── playlists ───────────────────────────────────────────────────────────
  const PLAYLISTS = [
    {
      name: 'Tubes des années 80',
      description: 'Le meilleur de la décennie synthé.',
      tags: ['80s', 'pop'],
      vids: ['Fe93CLbHjxQ', 'A4-wvmX5Tbk', 'DpM766s_4kM', 'DUT5rEU6pqM'],
    },
    {
      name: 'Dancefloor',
      description: 'Pour faire bouger le salon.',
      tags: ['dance', 'funk'],
      vids: ['OFNrN_6Ta5I', 'zrFI2gJSuwA', 'iWOyfLBYtuU'],
    },
    {
      name: 'Spécial dessins animés',
      description: 'Les génériques de notre enfance.',
      tags: ['disney', 'kids'],
      vids: ['aEryAoLfnAA'],
    },
  ]
  for (const pl of PLAYLISTS) {
    const rec = await pb.collection('playlists').create({
      name: pl.name,
      description: pl.description,
      tags: pl.tags,
      owner: user.id,
      public: true,
    })
    for (const [i, vid] of pl.vids.entries()) {
      await pb.collection('playlist_tracks').create({
        playlist: rec.id,
        video: V[vid].id,
        order: i + 1,
        start_seconds: 30,
        reveal_seconds: 45,
        playback_duration: 15,
      })
    }
  }

  // ─── favourites ──────────────────────────────────────────────────────────
  const FAVORITES = [
    { vid: 'G6Kspj3OO0s', from: 'Tom', right: true },
    { vid: 'rYEDA3JcQqw', from: 'Sarah', right: false },
    { vid: 'gGdGFtwCNBE', from: 'Max', right: true },
    { vid: 'dDXXM9ytbdQ', from: 'Tom', right: true },
  ]
  for (const fav of FAVORITES) {
    await pb.collection('favorites').create({
      user: user.id,
      video: V[fav.vid].id,
      discovered_from_name: fav.from,
      session_name: 'Karaoké du vendredi',
      guessed_right: fav.right,
      start_seconds: 35,
      reveal_seconds: 50,
      playback_duration: 15,
    })
  }

  const seed: Seed = {
    user: user.id,
    email: DEMO_EMAIL,
    lobbySlug: lobby.slug,
    gameSlug: game.slug,
    overSlug: over.slug,
    playingTrackId,
    sessionIds: { lobby: lobby.id, game: game.id, over: over.id },
    players: {
      lobby: { lea: { id: lobbyLea.id, secret: lobbyLea.secret } },
      game: Object.fromEntries(
        Object.entries(P).map(([k, v]) => [k, { id: v.id, secret: v.secret }]),
      ),
      over: Object.fromEntries(
        Object.entries(O).map(([k, v]) => [k, { id: v.id, secret: v.secret }]),
      ),
    },
  }
  await writeFile(SEED_FILE, `${JSON.stringify(seed, null, 2)}\n`)
  console.log(`seeded — ${SEED_FILE}`)
}

main()
