# Plan 05 — Security: reduce the answer leak

_Size: M. Risk: medium. Depends on plan 04 (uses the same secret identity for one endpoint)._

## Problem & honest scope

Track titles/artists are readable through the public API before reveal, and in autonomous remote mode the typed answers transit in `buzzes.answer` before the reveal.

**What cannot be fixed**: the currently *playing* track's `video_id` must reach every client (they each run the YouTube player), and a `video_id` resolves to a title via YouTube oEmbed. Full anti-cheat would require server-side audio, out of scope. The goal here is to close the *casual* channels:

1. The **queued** tracks of other players (full upcoming tracklist readable today).
2. Typed **answers during the autonomous guessing window** (live copy-typing).
3. `players.secret` — already closed in plan 04.

Realtime constraint: SSE carries no identity headers, so hiding must be **unconditional per record state** (no "visible to owner only" over realtime). Owners get their own data back through a secret-gated endpoint instead.

## Steps

### 1. Hide the video of queued tracks

New file `pb/pb_hooks/track_visibility.pb.js`:

```js
/// <reference path="../pb_data/types.d.ts" />

// A queued track's video is the answer to a future round: hide it from all
// serialized output (lists, realtime events, expand). Owners retrieve their
// own queued tracks via /api/game/my-tracks. Once playing or done, the video
// is exposed again (playback needs the id; reveal needs the metadata).
onRecordEnrich(e => {
  if (e.record.getString('status') === 'queued') {
    e.record.hide('video')
  }
  e.next()
}, 'tracks')
```

`VERIFY:` (critical) that hiding the relation field also drops its `expand.video` entry from the JSON output — test with
`curl 'http://127.0.0.1:8093/api/collections/tracks/records?expand=video'`. If expand still leaks, additionally clear it in the hook (JSVM `Record` has expand accessors — check `e.record.expandedOne('video')` / `e.record.mergeExpand` / `SetExpand` in the PB 0.39 JSVM docs) and re-verify.

`VERIFY:` realtime create/update events for queued tracks are enriched the same way (subscribe with the app open, add a track from another browser, inspect the SSE payload in devtools).

### 2. Owner's view of their own queued tracks

The upcoming list shows the owner's own titles (`Room.vue` / `RoomTabs` render `track.expand.video.title` when `isMyTrack`). After step 1 that data is gone from generic reads. Restore it owner-side only:

- New endpoint in `track_visibility.pb.js`: `GET /api/game/my-tracks?session=<id>&player=<id>` with the `X-Player-Secret` header (same identity check as plan 04's endpoint: player in session + secret/auth match). Returns `[{ trackId, video: { id, video_id, title, artist, duration } }]` for that player's tracks in the session, built with `e.app.findRecordsByFilter` (server-side reads bypass enrich? `VERIFY:` — enrich applies to *serialization*; constructing the JSON manually from `videosById` avoids the question entirely, do that).
- Client, in `useTracks`: maintain `const myVideos = ref<Record<string, VideoRecord>>({})` keyed by track id; fetch on mount, on `PB_CONNECT`, and merge locally in `addTrack` (the client already has the video object from `findOrCreateVideo` — no refetch needed). Expose a helper `videoFor(track)` that prefers `track.expand?.video` and falls back to `myVideos[track.id]`; switch the own-track display code to it.

### 3. Hide answers during the autonomous guessing window

In the same hook file:

```js
onRecordEnrich(e => {
  // During the buzz window, typed answers must not be readable by other
  // players. From 'answering'/'voting' on, answers are public by design.
  try {
    const track = e.app.findRecordById('tracks', e.record.getString('track'))
    if (track.getString('phase') === 'guessing') {
      e.record.hide('answer')
    }
  } catch (_) {}
  e.next()
}, 'buzzes')
```

Client compatibility notes (all verified in code on 2026-07-12):
- The buzzer's own draft UI reads local state (`myAnswerDraft` in `useAutonomous`), not the record — unaffected. `VERIFY:` grep `AutonomousPanel.vue` for `answer` to confirm nothing renders `myBuzz.answer` during guessing; adapt if it does.
- When the phase leaves `guessing`, `useAutonomous` already refetches buzzes (`reloadBuzzes()` on phase change — added for an SSE race). That refetch happens when `phase !== 'guessing'`, so the visible answers arrive naturally. Do not remove that reload.
- Classic (non-autonomous) tracks have `phase = ''` → answers stay visible, as today (the validator must read them; identity over realtime is impossible).

### 4. Documentation

Add a short "Residual risk" note to `docs/ANALYSIS-2026-07-12.md` §2.1 or the ROADMAP entry: playing-track `video_id` remains resolvable to a title by a motivated cheater; acceptable for a party game, revisit only if it becomes a real problem (would require server-side playback).

## Verification

- Curl: queued track of another player → no `video`, no `expand.video`; playing/done track → both present.
- Curl: buzz on a `guessing` track → no `answer`; same buzz after phase flips → `answer` present.
- `/api/game/my-tracks` with the right secret → own queued videos; with a wrong secret → 403.
- e2e: `autonomous-flow.spec.ts` and `buzz-advance.spec.ts` must pass unchanged (they assert on visible titles post-reveal).
- Manual: full autonomous game (remote mode) on two browsers — owner sees own upcoming titles, other player sees `???`, answers appear only at voting, reveal overlay still shows title/artist (reveal happens on a `playing`/`done` record → video visible).

## Proposed commits

1. `feat(security): hide queued-track videos and guessing-phase answers from the API`
2. `feat(game): owner fetches own queued track metadata via secret-gated endpoint`

ROADMAP: move the "Sécurité : visibilité des tracks non révélés" improvement entry to History with a note on the residual risk.
