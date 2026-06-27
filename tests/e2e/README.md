# Realtime e2e (Playwright) — POC

Drives several browser contexts (one per player) against a shared PocketBase +
Astro stack to exercise the realtime watcher flows that are hard to verify by hand.

## What the POC covers

`specs/buzz-advance.spec.ts`: host + 2 players in one session. Alice buzzes, the
host validates, and with `continue_after_success` off the host must advance to the
next track **exactly once**. Asserts convergence both server-side (track statuses
in PocketBase) and client-side (every context shows one "done" track).

## How it works

- **Seeding** (`helpers/seed.ts`): creates the session mid-game via the PocketBase
  SDK (all game collections have open create/update rules — no auth needed). Each
  run uses a unique slug and is torn down afterwards (deleting the session cascades
  players/tracks/buzzes).
- **Joining**: instead of the join screen, each context primes the `localStorage`
  keys `App.vue` reads on load, landing straight in the room. Real SSE
  subscriptions and heartbeats still run.
- **YouTube** (`helpers/yt-stub.ts`): the real IFrame API is replaced by a
  synchronous fake (injected before page scripts), so tests never hit YouTube.

## Running

```bash
pnpm exec playwright install chromium   # once
pnpm test:e2e
```

The Playwright `webServer` config auto-starts PocketBase (`pnpm db:host`, bound to
0.0.0.0 so the browser app and the seed client share one DB) and the Astro dev
server, reusing them if already running.

Config via env (see `.env.example`): `BASE_URL`, `PB_URL`, and
`PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD`. The browser app's PocketBase URL still
comes from `PUBLIC_PB_BASE_URI` (`.env.local`); point it at the same instance as
`PB_URL`.

**Teardown needs a superuser.** `sessions` and `videos` have no delete rule, so
without `PB_ADMIN_EMAIL`/`PB_ADMIN_PASSWORD` the test still passes but leaves its
seeded records behind. Create a throwaway superuser with
`cd pb && ./pocketbase superuser upsert <email> <pass>`.

> Tests mutate the dev PocketBase. Fine in pre-prod; use a throwaway DB if that
> changes.

## Next flows to add

- Reconnect recovery (`context.setOffline` around the SSE stream).
- Host handoff (needs the online window made env-overridable to avoid a 45s wait).
- Mobile-background heartbeat (`visibilitychange` dispatch).
- Skip-vote advance and reveal seek.
