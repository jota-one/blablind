# Plan 03 — Typed PocketBase records

_Size: M. Risk: low. Pure typing, no runtime change allowed._

## Goal

Replace `any` at the data boundary with shared record types. 27 files currently use `any` for PB records.

## Step 1 — create `src/types/records.ts`

**STATUS: DONE (2026-07-12)** — the file exists; skip to Step 2 (adoption).

The definitions below were generated from the live schema on 2026-07-12. **Re-verify before use** (`sqlite3 pb/pb_data/data.db "PRAGMA table_info(<name>);"` or the `_collections` query in the index) and adjust if migrations landed since.

```ts
// PocketBase serializes dates as 'YYYY-MM-DD HH:mm:ss.SSSZ' strings.
type PBDate = string

type BaseRecord = {
  id: string
  created: PBDate
  updated: PBDate
}

export type SessionStatus = 'waiting' | 'playing' | 'finished'
export type SessionMode = 'classic' | 'autonomous'
export type StopMethod = 'vote_unanimous' | 'host_choice'

export type SessionSettings = {
  max_buzz_attempts?: number
  rebuzz_delay?: number
  auto_reject_delay?: number
  continue_after_success?: boolean
  stop_method?: StopMethod
  force_equity?: boolean
  equity_margin?: number
  default_playback_duration?: number
}

export type SessionRecord = BaseRecord & {
  name: string
  slug: string
  status: SessionStatus
  host: string            // relation → players
  irl_mode: boolean
  dj_player: string
  dj_candidate: string
  owner: string           // relation → users
  settings: SessionSettings
  host_candidate: string
  paused: boolean
  mode: SessionMode
  playlist: string        // relation → playlists (autonomous only)
}

export type PlayerRecord = BaseRecord & {
  session: string
  name: string
  secret: string          // hidden from API responses after plan 04
  ready: boolean
  last_seen: PBDate
  auth_user: string       // relation → users, '' for guests
  avatar: string          // denormalized from users by pb_hooks/player_avatar.pb.js
}

export type TrackStatus = 'queued' | 'playing' | 'done'
export type TrackPhase = 'guessing' | 'answering' | 'voting' | ''

export type TrackRecord = BaseRecord & {
  video: string           // relation → videos
  session: string
  start_seconds: number
  added_by: string        // relation → players, '' in autonomous mode
  status: TrackStatus
  order: number
  skip_votes: string[]    // player ids; JSON field
  solved_by: string       // relation → players
  is_duplicate: boolean
  playback_duration: number
  reveal_seconds: number
  skip_revealed: boolean
  phase: TrackPhase       // autonomous mode only
  started_at: PBDate      // server timestamp of the playing transition
  expand?: { video?: VideoRecord }
}

export type BuzzStatus = 'pending' | 'correct' | 'wrong'

export type BuzzRecord = BaseRecord & {
  player: string
  track: string
  answer: string
  status: BuzzStatus
}

export type VideoRecord = BaseRecord & {
  video_id: string        // YouTube id
  title: string
  artist: string
  duration: number
  search_text: string
}

export type AnswerVoteRecord = Omit<BaseRecord, 'updated'> & {
  buzz: string
  voter: string           // relation → players
  track: string           // denormalized for per-track subscription
  value: boolean
}

export type PlaylistRecord = BaseRecord & {
  owner: string
  name: string
  description: string
  tags: string[]          // JSON field
  public: boolean
}

export type PlaylistTrackRecord = BaseRecord & {
  playlist: string
  video: string
  order: number
  start_seconds: number
  playback_duration: number
  reveal_seconds: number
  expand?: { video?: VideoRecord }
}

export type FavoriteRecord = BaseRecord & {
  user: string
  video: string
  discovered_from_name: string
  discovered_from_user: string
  session_name: string
  guessed_right: boolean
  start_seconds: number
  expand?: { video?: VideoRecord }
}
```

Notes:
- PB returns `''` (not `null`/`undefined`) for empty text/relation fields, `0` for empty numbers, `false` for empty bools. Type accordingly (no `| null`).
- JSON fields (`skip_votes`, `settings`, `tags`) arrive parsed in the JS SDK. Server-side JSVM hooks are different (`getString` + `JSON.parse` — house rule).
- If a field is missing at runtime, trust the DB over this file (house rule: query SQLite before speculating).

## Step 2 — adopt in the game SPA (priority order)

1. Composables: `useTracks`, `usePlayers`, `useBuzzes`, `useSession`, `useAnswerVotes`, `useAutonomous`, `useFavorites`, `useVideos` — type the `ref<…[]>` and function signatures. The generic SDK call sites become e.g. `pb.collection('tracks').getFullList<TrackRecord>(…)`.
2. `src/game/autonomous.ts`: `AutonomousSnapshot.buzzes[].status` → `BuzzStatus`, etc.
3. Component props: `Room.vue` (`session: SessionRecord`, `currentPlayer: PlayerRecord`) and the components extracted in plan 02.
4. `src/client/**` views, then `src/admin/**` last (lowest value).

Do it one composable/component per commit. **No behavior change**: if typing reveals a real bug (misspelled field, impossible state), do not fix it silently — note it, finish the typing commit, then propose the fix as its own commit.

## Verification

`pnpm build` runs `astro check` (vue-tsc) — it is the actual gate. Also `pnpm lint && pnpm test:unit`, e2e once at the end.

Proposed commit series: `refactor(types): add shared PocketBase record types`, then `refactor(game): type <area> with shared records`.
