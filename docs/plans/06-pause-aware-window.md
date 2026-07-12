# Plan 06 — Pause-aware buzz window (server-timestamp deadline)

_Size: M. Risk: medium (touches the autonomous phase machine). Independent of the other plans._

## Problem

The autonomous buzz window is a local `setTimeout(seconds)` armed on each client when the track starts (`Room.vue`, watcher on `currentTrack.id` → `playbackDurationTimer`). Consequences:
- A host pause during the excerpt does NOT extend the window (wall-clock keeps running) — known ROADMAP bug.
- Each client counts down from when *it* saw the track start, so countdowns drift between clients.

## Design

Single source of truth = server timestamps on the track record:
- `started_at` (already exists — server timestamp of the `playing` transition, written in `useTracks.playTrack`).
- New: `paused_ms` (number, accumulated pause duration) and `pause_started_at` (date, set while a pause is ongoing).

Deadline, identical on every client:

```
deadline = started_at + effective_window_seconds * 1000 + paused_ms   (+ still-running pause: now − pause_started_at)
```

Pause bookkeeping is done **server-side** (JSVM hook on session updates), so the clock domain is the server's for both `started_at` and pauses. Clients convert to local time with a measured offset.

## Steps

### 1. Migration

New file `pb/pb_migrations/{ts}_tracks_pause_clock.js`: add to `tracks` → `paused_ms` (number) and `pause_started_at` (date). Follow the pattern of `1784000006_tracks_add_started_at.js`.

### 2. Hook: stamp pauses server-side

New file `pb/pb_hooks/track_pause_clock.pb.js`:

```js
/// <reference path="../pb_data/types.d.ts" />

// Accumulate pause time on the playing track, in the server clock domain
// (comparable with tracks.started_at). Fires on any session update; only
// reacts when `paused` actually flipped.
onRecordUpdate(e => {
  const wasPaused = e.record.original().getBool('paused')
  const isPaused = e.record.getBool('paused')
  if (wasPaused !== isPaused) {
    try {
      const track = e.app.findFirstRecordByFilter(
        'tracks',
        'session = {:session} && status = "playing"',
        { session: e.record.id },
      )
      if (isPaused) {
        track.set('pause_started_at', new Date().toISOString())
      } else {
        const startedIso = track.getString('pause_started_at')
        if (startedIso) {
          const elapsed = Date.now() - new Date(startedIso).getTime()
          track.set('paused_ms', track.getInt('paused_ms') + Math.max(0, elapsed))
          track.set('pause_started_at', null)
        }
      }
      e.app.save(track)
    } catch (_) {
      // No playing track — nothing to stamp.
    }
  }
  e.next()
}, 'sessions')
```

**Verified 2026-07-12 on the live dev PB (v0.39.4)** with this exact hook shape (using a stand-in date field): `onRecordUpdate` fires on session updates, `e.record.original().getBool('paused')` correctly reports the pre-update value (flip detection works), `track.set('<date field>', new Date().toISOString())` writes a valid PB date, `set(..., null)` clears it, and the elapsed-ms accumulation on resume measured a 2 s pause as `2`. No adaptation needed.

Also: `playTrack` starts a fresh track — make sure `paused_ms`/`pause_started_at` are reset when a track (re)starts. Add `paused_ms: 0, pause_started_at: null` to the `playTrack` update in `src/game/composables/useTracks.ts` (and the reset flow's track cleanup in Room.vue).

### 3. Client: extract a pure deadline function

New `src/game/window.ts` (pure, unit-testable — same philosophy as `src/game/autonomous.ts`):

```ts
export type WindowClock = {
  startedAt: string      // tracks.started_at
  pausedMs: number       // tracks.paused_ms
  pauseStartedAt: string // tracks.pause_started_at, '' if not paused
  windowSeconds: number  // playback_duration || session default
}

// serverNow: current time expressed in the server clock domain.
export const windowDeadline = (c: WindowClock, serverNow: number): number => {
  const started = new Date(c.startedAt).getTime()
  const livePause = c.pauseStartedAt ? Math.max(0, serverNow - new Date(c.pauseStartedAt).getTime()) : 0
  return started + c.windowSeconds * 1000 + c.pausedMs + livePause
}
```

Clock offset: when a track becomes current, estimate `offsetMs = Date.now() - new Date(track.started_at).getTime()` **only if** the transition was observed live (old track id ≠ new, session playing); the offset includes one-way latency (< 1 s, acceptable). Fallback when joining mid-track: offset 0. Then `serverNow = Date.now() - offsetMs`.

### 4. Client: replace the wall-clock timer (autonomous path only)

In `Room.vue` (or `useGameFlow` after plan 02):
- Keep the existing `setTimeout` path for **classic** mode (`playback_duration` without autonomous semantics) — unchanged behavior.
- For autonomous mode, derive `pausedByDuration` reactively: `computed(() => serverNow.value >= deadline.value)` driven by the existing 250 ms `windowClock` interval (already ticking during the guessing phase) instead of arming `playbackDurationTimer`. `windowRemainingSeconds` derives from the same deadline; while `session.paused` or `pause_started_at` is set, the countdown freezes naturally (deadline moves with `livePause`).
- The reconciler input `windowElapsed` already reads `pausedByDuration` — no change needed there, but re-read `src/game/autonomous.ts` `computeNextAction` to confirm (`s.paused` already blocks transitions during a pause).

Edge cases to test explicitly:
- Pause exactly at window end (deadline already passed): reconciler must not reopen the window (paused_ms only grows the deadline for a pause that started *before* the deadline — think through and add a unit test; simplest correct behavior: once `open-answering`/`open-voting` fired, later deadline growth is irrelevant because phase ≠ guessing).
- Host handover mid-pause: new host's client computes the same deadline from record data — that is the point of the design; verify with two browsers.

### 5. Tests

- Unit (`tests/unit/window.test.ts`, same runner/style as `tests/unit/autonomous.test.ts`): deadline without pause; with accumulated `paused_ms`; with an ongoing pause; countdown freeze; deadline-already-passed pause.
- e2e: `autonomous-flow.spec.ts` must pass. Add a pause/resume step to it if cheap (host clicks the status badge, wait 2 s, resume, assert the countdown gained ~2 s).

## Verification

`pnpm lint && pnpm build && pnpm test:unit && pnpm test:e2e`, plus manual: autonomous game on two browsers, pause 5 s mid-window → both countdowns freeze and resume in sync; buzz window totals excerpt + pause.

## Proposed commits

1. `feat(game): track-level pause clock (migration + server hook)`
2. `feat(autonomous): server-timestamp buzz-window deadline, pause-aware`

ROADMAP: move the "Fenêtre de buzz pause-aware" item to History.
