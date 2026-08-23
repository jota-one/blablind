# BlaBlind — project instructions

Real-time multiplayer music blindtest (buzzer game) on YouTube. Astro 7 shell + three Vue 3 SPAs + PocketBase 0.39 backend. Shared house rules in `~/Sites/CLAUDE.md` apply (commits, code style, PB migrations/hooks conventions).

## Commands

| Command | Notes |
|---|---|
| `pnpm dev` | App on :4321. Needs PB running. |
| `pnpm db` | PocketBase on :8093 (`pb/pocketbase`). `PUBLIC_PB_BASE_URI` in `.env.local` points the SPA at it. |
| `pnpm lint` / `pnpm format` | oxlint (type-aware) / oxfmt |
| `pnpm build` | Runs `astro check` (type gate) + build into `pb/pb_public` |
| `pnpm test:unit` | `node --experimental-strip-types` scripts in `tests/unit/` (no vitest) |
| `pnpm test:e2e` | Playwright; needs PB + superuser creds, see `tests/e2e/README.md` |

Deploy: push to `main` → GitHub Actions → jota-one/infra. PRs target `develop`.

## Architecture map

- `src/game/` — the game SPA (anonymous players). Entry `App.vue` (join/restore + 15 s heartbeat), views `Join.vue`/`Room.vue`, state in composables (`useSession`, `usePlayers`, `useTracks`, `useBuzzes`, `useAnswerVotes`, `useAutonomous`), each = load + realtime subscription + actions.
- `src/game/autonomous.ts` — **pure** decision logic for autonomous mode (`computeNextAction(snapshot) → action`), executed by the elected host's client, level-triggered and idempotent. Unit-tested in `tests/unit/`. Follow this pattern (pure function + thin executor) for any new game-flow logic.
- `src/client/` — member area SPA (profile, my blindtests, favorites, playlists, settings). `src/admin/` — admin SPA. Both vue-router SPAs mounted from `src/pages/*/[...slug].astro`.
- `src/pages/proxy/search.ts` — SSR YouTube search endpoint (in-memory LRU cache + inflight coalescing). Backends live in `src/lib/youtube.ts`: YouTube InnerTube (keyless, primary) → official Data API (only if `SECRETS_YOUTUBE_API_KEY` is set — the `SECRETS_` prefix is imposed by the infra `.env` generator, see `apps.yaml`) → Invidious (last resort). Response parsing is pure and unit-tested; do not make public Invidious instances primary again (see Known pitfalls).
- `pb/pb_hooks/` — JSVM hooks: server-side host election, atomic skip-vote endpoint, avatar denormalization, admin verify. `pb/pb_migrations/` — full schema history.
- Docs: `docs/ANALYSIS-2026-07-12.md` (architecture review), `docs/plans/` (ready-to-execute implementation plans — check before starting architecture work), `ROADMAP.md` (features + history; add a History entry when shipping a user-facing change).

## Domain rules (game semantics)

- **Host** = technical coordinator, elected **server-side** (`host_election.pb.js`) from heartbeats; only the host's client advances tracks (`advanceFrom` + `advancing` lock in Room.vue). Never add a second advance path.
- Scores are **derived** from `tracks.solved_by` (no stored score field). Guessable = done tracks not added by the player.
- Track owner (`added_by`) validates buzzes in classic mode; in autonomous mode there is **no validator** (peer votes, `answer_votes`, ≥ 50 % of online voters).
- A player is "online" if `last_seen` < 45 s (`ONLINE_WINDOW_MS`, duplicated in `src/game/utils.ts` AND `pb/pb_hooks/host_election.pb.js` — keep in sync).
- Guests are first-class: identity = `players.secret` (localStorage) + optional `auth_user` link. Don't design features that assume an account unless member-area-only.

## Known pitfalls (hard-won, do not rediscover)

- **Realtime**: SSE subscriptions can miss events registered milliseconds after page load — composables therefore `reload()` on `PB_CONNECT` and at phase changes. Never remove those reloads. Use `requestKey: null` on loads that may run concurrently (auto-cancellation otherwise). Guard against double-inserts on create events.
- **EventSource sends no custom headers** — anything identity/header-based works for CRUD only, never for realtime payload filtering.
- `onRecordEnrich` mutates only the serialized copy (DB untouched) and applies to lists, single GETs **and** realtime events. `hide('relation')` does NOT stop `?expand=` from leaking the related record — also `set('field', '')` in the enrich. (Verified live, see `docs/plans/05-…`.)
- API rules: multi-condition `@collection.X` references bind to the same joined record; relation traversal works in update/delete rules (up to `track.session.host.secret`), but `@request.body.relation.field` traversal does NOT work in create rules — use a `@collection` join. (Verified live, see `docs/plans/04-…`.)
- Clock domains: `tracks.started_at` and `buzzes.created` are server timestamps (comparable). `Date.now()` on clients is NOT — never mix without an offset.
- Timers/`setTimeout` on mobile are throttled in background tabs — the heartbeat re-ticks on `visibilitychange`; prefer deriving state from server timestamps over arming long local timers.
- Deleting a session cascades to players/tracks/buzzes.
- YouTube: `videos.duration = 0` means private/deleted video (filtered out). The OS "Now Playing" widget can leak the answer — already mitigated, be careful when touching the player.
- **YouTube search**: public Invidious instances are dead as a primary backend — survivors answer datacenter IPs with an anti-bot HTML captcha under a **200** status, so always verify `content-type` is JSON before trusting a 200. Search now goes through YouTube's InnerTube endpoint (no key, no quota).
- The `rtk` CLI proxy truncates some grep/read output — if results look wrong ("N matches in 0 files"), fall back to Read or `rtk proxy <cmd>`.

## Testing expectations

Gate before any commit: `pnpm lint && pnpm build && pnpm test:unit`. Gameplay changes: also `pnpm test:e2e` and a two-browser manual smoke (normal + private window) — classic AND autonomous mode if the change touches shared flow. Pure logic belongs in `src/game/*.ts` modules with tests in `tests/unit/` (plain scripts, `node:test`-free style, see `autonomous.test.ts`).

Known issue: `pnpm lint` (type-aware oxlint) can die with an OOM warning on this machine — `pnpm build` (`astro check`) is the reliable type gate.

### Running e2e

Prereqs: app (`pnpm dev`) + PB (`pnpm db`) running. Superuser credentials go in `tests/e2e/.env` (gitignored, copy from `.env.example`); there is NO dotenv auto-load — source it first:

```zsh
set -a; source tests/e2e/.env; set +a
pnpm test:e2e
```

Without credentials the gameplay specs still run but leave seeded records behind (`pnpm test:e2e:clean` needs them too), and the password-reset spec is skipped (it additionally needs Mailpit running: `mailpit`, API :8025 / SMTP :1025). If the superuser password is unknown, reset it: `cd pb && ./pocketbase superuser upsert e2e-admin@local.test <password>` (works while the server runs). A temporary superuser created this way must be deleted afterwards (`./pocketbase superuser delete …`).
