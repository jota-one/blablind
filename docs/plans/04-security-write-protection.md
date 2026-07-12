# Plan 04 — Security: protect gameplay writes

_Size: L. Risk: medium (touches API rules — a wrong rule can lock legitimate players out). Read the whole plan before starting._

## Problem

`sessions`, `tracks`, `buzzes` have fully public update/delete rules; `answer_votes` has public create. Anyone with the PB URL can become host, validate buzzes, delete sessions. Additionally `players.secret` — the per-player capability issued at join — is **serialized in public list responses**, making it worthless until hidden.

## Design

Identity for guests = the existing per-player `secret` (created in `src/game/App.vue` `onJoined`, stored in localStorage, already used for player deletion). It is sent on every CRUD call via an HTTP header, and API rules match it against relation traversals. Authenticated users get an equivalent `auth_user` fallback (covers the "reconnect on a new device, no localStorage" path in `App.vue` `restorePlayer`).

Two mutations don't fit rule semantics and move to JSVM endpoints (same pattern as the existing `pb/pb_hooks/skip_vote.pb.js`): session role/state changes, and wizard session creation.

Constraint to remember: realtime SSE (`EventSource`) cannot send headers — this plan only guards **writes** (fetch-based), read rules stay public. Read-side leaks are plan 05.

## Steps

### 1. Client: send the secret header

`src/game/pb.ts`:

```ts
import PocketBase from 'pocketbase'
import config from '../config'

export const pb = new PocketBase(config.apiBaseUrl)

let playerSecret = ''
export const setPlayerSecret = (secret: string) => {
  playerSecret = secret
}

pb.beforeSend = (url, options) => {
  if (playerSecret) {
    options.headers = { ...options.headers, 'X-Player-Secret': playerSecret }
  }
  return { url, options }
}
```

Call `setPlayerSecret(...)` in `src/game/App.vue`: in `onJoined` right after the player record is created, and in both branches of `restorePlayer` (the auth-restore branch may only have `''` — fine, rules fall back to the auth token which the SDK sends automatically).

`VERIFY:` the SDK types for `beforeSend` in pocketbase ^0.26 — adjust the signature if `options.headers` is typed differently.

### 2. Hook: hide `players.secret` from all API output

New file `pb/pb_hooks/player_secret.pb.js`:

```js
/// <reference path="../pb_data/types.d.ts" />

// The per-player secret is a write capability (see gameplay API rules); it
// must never be serialized. Server-side hooks read it via findRecordById,
// which is unaffected by hide().
onRecordEnrich(e => {
  e.record.hide('secret')
  e.next()
}, 'players')
```

The client never reads `secret` from the API (it merges it from localStorage — see `App.vue`), so nothing breaks. `VERIFY:` after restarting PB, `curl 'http://127.0.0.1:8093/api/collections/players/records?perPage=1'` must show no `secret` key, and joining a game must still work (create response is enriched too — the client keeps the secret it generated locally, it does not need it echoed back).

### 3. Migration: tighten the rules

New file `pb/pb_migrations/{ts}_gameplay_write_rules.js`. In the `up` function, load each collection with `app.findCollectionByNameOrId(...)`, set rules, `app.save(...)`. Keep the previous values in the `down` function (they are all `''` for the touched rules, except `sessions.updateRule`/`deleteRule` also `''`).

Rule building blocks (PB rule syntax; header names are lowercased with `-` → `_`):

- Requester-is-player-X via traversal (for update/delete rules on records that point at players):
  `X.secret = @request.headers.x_player_secret` (guests) — always AND `@request.headers.x_player_secret != ''` to avoid empty-matches-empty.
  Auth fallback: `X.auth_user = @request.auth.id && @request.auth.id != ''`.
- For **create** rules, body relation values cannot be traversed; bind through a collection join instead: `@collection.players.id ?= @request.body.player && @collection.players.secret ?= @request.headers.x_player_secret`.
  `VERIFY:` (critical) that multiple `?=` conditions on the same `@collection.players` reference bind to the **same** joined record in PB 0.39 (they should — one join per unique reference; aliases `@collection.players:alias` exist to force separate joins). Test with two players in one session: player A's secret + player B's id in the body must be **rejected**.

Exact rules to set:

```
players.updateRule:
  (secret != '' && secret = @request.headers.x_player_secret) ||
  (auth_user != '' && auth_user = @request.auth.id)

players.deleteRule (replaces the query-param variant; update the client call — see step 5):
  same as players.updateRule

tracks.createRule:
  @request.body.added_by != '' &&
  @collection.players.id ?= @request.body.added_by &&
  @collection.players.session ?= @request.body.session &&
  (
    (@request.headers.x_player_secret != '' && @collection.players.secret ?= @request.headers.x_player_secret) ||
    (@request.auth.id != '' && @collection.players.auth_user ?= @request.auth.id)
  )

tracks.updateRule (owner of the track, or host of its session):
  (@request.headers.x_player_secret != '' &&
    (added_by.secret = @request.headers.x_player_secret || session.host.secret = @request.headers.x_player_secret)) ||
  (@request.auth.id != '' &&
    (added_by.auth_user = @request.auth.id || session.host.auth_user = @request.auth.id))

tracks.deleteRule: same as tracks.updateRule

buzzes.createRule:
  @collection.players.id ?= @request.body.player &&
  (
    (@request.headers.x_player_secret != '' && @collection.players.secret ?= @request.headers.x_player_secret) ||
    (@request.auth.id != '' && @collection.players.auth_user ?= @request.auth.id)
  )

buzzes.updateRule (the buzzer, the track owner/validator, or the host):
  (@request.headers.x_player_secret != '' &&
    (player.secret = @request.headers.x_player_secret ||
     track.added_by.secret = @request.headers.x_player_secret ||
     track.session.host.secret = @request.headers.x_player_secret)) ||
  (@request.auth.id != '' &&
    (player.auth_user = @request.auth.id ||
     track.added_by.auth_user = @request.auth.id ||
     track.session.host.auth_user = @request.auth.id))

buzzes.deleteRule (host only — used by the reset flow):
  (@request.headers.x_player_secret != '' && track.session.host.secret = @request.headers.x_player_secret) ||
  (@request.auth.id != '' && track.session.host.auth_user = @request.auth.id)

answer_votes.createRule:
  @collection.players.id ?= @request.body.voter &&
  (
    (@request.headers.x_player_secret != '' && @collection.players.secret ?= @request.headers.x_player_secret) ||
    (@request.auth.id != '' && @collection.players.auth_user ?= @request.auth.id)
  )

sessions.updateRule: null   (all session mutations go through the endpoint, step 4)
sessions.deleteRule: null
sessions.createRule: null   (wizard goes through the endpoint, step 4b)
```

Known gaps accepted in v1 (document, don't solve): field-level granularity (a track owner could PATCH `status` directly), and `players.createRule` stays public (joining must stay open; a hook could later enforce session status = waiting).

### 4. Endpoint: session actions

New file `pb/pb_hooks/session_actions.pb.js`, `POST /api/game/session-action`, body `{ sessionId, playerId, secret, op, payload }`.

Auth resolution: load the player, check `player.session === sessionId`, then identity = `player.secret === secret` (non-empty) OR (`e.requestInfo().auth` set AND `player.auth_user === auth.id`). Compute `isHost = session.host === playerId`, `isOwner = auth && session.owner === auth.id`.

Op table (reject anything else with 403/400):

| op | who | effect |
|---|---|---|
| `set_paused` | host | `paused = !!payload.paused` |
| `set_status` | host | `status ∈ {playing, finished}` only |
| `save_settings` | host | `settings = payload.settings` (object) |
| `toggle_irl` | host | `irl_mode`, `dj_candidate = null`, dj restore logic (copy from Room.vue `toggleIrlMode`) |
| `propose_host` | any player | `host_candidate = playerId` |
| `approve_host` | host | `host = host_candidate; host_candidate = null` |
| `reject_host` | host | `host_candidate = null` |
| `take_host` | owner | `host = playerId; host_candidate = null` |
| `propose_dj` | any player | `dj_candidate = playerId` |
| `approve_dj` | current DJ | `dj_player = dj_candidate; dj_candidate = null` |
| `reject_dj` | current DJ | `dj_candidate = null` |
| `claim_owner` | authed host, owner empty | `owner = auth.id` |
| `clear_paused_on_new_track` | host | `paused = false` |

Also `status = 'waiting'` is needed by the reset flow — allow it for the host as part of `set_status` (whitelist all three, host-only).

### 5. Client: route session writes through the endpoint

New `src/game/composables/useSessionActions.ts`:

```ts
export default function useSessionActions(sessionId: string, playerId: string, secret: string) {
  const act = (op: string, payload: Record<string, unknown> = {}) =>
    pb.send('/api/game/session-action', { method: 'POST', body: { sessionId, playerId, secret, op, payload } })
  return { act }
}
```

Replace every `pb.collection('sessions').update(...)` in the game SPA (after plan 02 they live in `useRoomRoles`, `useGameFlow`, `useRoomSettings`, plus `launchSession`/`endSession`/reset in Room.vue). Grep to find them all: `grep -rn "collection('sessions')" src/game src/client`. The reset flow's batched session update becomes an `act('set_status', { status: 'waiting' })` after the batch.

Also switch player deletion (currently `?secret=` query param — find with `grep -rn "secret=" src`) to rely on the header rule, and remove the query-param plumbing.

### 6. Endpoint: wizard session creation

New file `pb/pb_hooks/create_session.pb.js`, `POST /api/game/create-session`, body `{ name, mode, playlistId?, settings, ownerFromAuth? }`. Reimplements `CreateSessionWizard.createSession()` server-side in one `runInTransaction`: create session (slug generated server-side, same charset as `src/game/utils.ts` `generateSlug`), and for autonomous mode copy the playlist's `playlist_tracks` into `tracks` (same field mapping as the wizard, `order` = 1-based). Owner = `e.requestInfo().auth?.id ?? ''`. Returns `{ id, slug }`.

Client: `CreateSessionWizard.vue` calls the endpoint and redirects to `/{slug}` as before. This also fixes the pre-existing "client dies mid-batch → half-created game" weakness.

### 7. Fix the e2e seed

`tests/e2e/helpers/seed.ts` writes via the public API and will hit the new rules. Fix by making the seed either (a) send the players' secrets as headers the same way the app does, or (b) authenticate as superuser (`pb.collection('_superusers').authWithPassword(...)` with the local dev credentials from `tests/e2e/.env.example`) — superusers bypass rules. Option (b) is less brittle; check what credentials the e2e README documents.

## Verification (must all pass before the PR)

Automated: `pnpm lint && pnpm build && pnpm test:unit && pnpm test:e2e`.

Manual curl suite against local PB (create a session with 2 players first, note ids + secrets from the DB: `sqlite3 pb/pb_data/data.db "SELECT id, name, secret FROM players;"`):

```bash
# 1. secret no longer serialized
curl -s 'http://127.0.0.1:8093/api/collections/players/records' | grep -c secret   # → 0
# 2. session hijack blocked (no endpoint, direct PATCH)
curl -s -X PATCH 'http://127.0.0.1:8093/api/collections/sessions/records/<sid>' \
  -H 'Content-Type: application/json' -d '{"host":"<attacker>"}'                    # → 404/403
# 3. buzz forgery blocked (no header)
curl -s -X POST 'http://127.0.0.1:8093/api/collections/buzzes/records' \
  -H 'Content-Type: application/json' -d '{"track":"<tid>","player":"<pid>","status":"pending"}'  # → 400
# 4. cross-player forgery blocked (A's secret, B's id) — the critical @collection binding check
curl -s -X POST 'http://127.0.0.1:8093/api/collections/buzzes/records' \
  -H 'Content-Type: application/json' -H 'X-Player-Secret: <secretA>' \
  -d '{"track":"<tid>","player":"<playerB>","status":"pending"}'                    # → 400
# 5. legitimate buzz passes (A's secret, A's id) — → 200
# 6. validator can mark correct, random player cannot (PATCH buzz status with each secret)
```

Full manual game on two browsers (one normal, one private window): classic mode end-to-end, autonomous mode end-to-end, host handover, IRL DJ handover, reset, in-game settings save, heartbeat keeps working (watch the Network tab for 200s on players PATCH).

## Proposed commits

1. `feat(security): send player secret header and hide it from API output`
2. `feat(security): tighten gameplay collection write rules`
3. `feat(security): session mutations via secret-gated endpoint`
4. `feat(security): server-side session creation for the wizard`
5. `test(e2e): adapt seed to secured write rules`

Add a ROADMAP History entry (user-facing: cheating/hijack protection).
