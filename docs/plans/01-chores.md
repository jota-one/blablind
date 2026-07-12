# Plan 01 — Chores: dead dependencies & README refresh

_Size: XS. Risk: none. No schema change, no behavior change._

**STATUS: DONE (2026-07-12)** — executed as proposed; lint OOM noted as pre-existing (see index).

## Goal

Remove unused dependencies and bring `README.md` back in sync with reality.

## Steps

### 1. Remove dead dependencies

`chart.js`, `pdfmake`, `vue3-markdown` have zero imports under `src/` (verified 2026-07-12). `@types/pdfmake` goes with `pdfmake`. `vitest` is installed but the unit runner is `node --experimental-strip-types` (see `package.json` → `test:unit`) — remove it too.

```bash
grep -rn "chart.js\|pdfmake\|vue3-markdown\|vitest" src astro.config.mjs playwright.config.ts tests   # must return nothing relevant
pnpm remove chart.js pdfmake vue3-markdown @types/pdfmake vitest
```

If the grep DOES return a hit, stop and reassess that package — do not remove it.

Note: the shared CLAUDE.md mentions pdfmake SSR workarounds; those apply to other projects. This project's `astro.config.mjs` has no pdfmake reference (verified).

### 2. Refresh README.md

Update these stale points (keep the existing tone/format):

- Tech stack table: Astro **7** (package.json has `astro: ^7.0.7`), PocketBase **0.39.4** (`pb/.pbversion`), Node 24 (volta).
- Features: add IRL mode (DJ role), autonomous mode (playlist games, peer votes), member area (profile, my blindtests, game preferences, favorites, playlist builder), installable PWA, FR/EN i18n.
- Collections list: `sessions`, `players`, `tracks`, `buzzes`, `videos`, `favorites`, `playlists`, `playlist_tracks`, `answer_votes`, `users`, `roles`, `app_settings`, `feedback`. One line each; details live in migrations.
- Commands table: add `pnpm db`, `pnpm lint`, `pnpm format`, `pnpm test:unit`, `pnpm test:e2e`.

### 3. Verify & commit

```bash
pnpm lint && pnpm build && pnpm test:unit
```

Proposed commits (propose to the user, wait for approval):

1. `chore: remove unused dependencies (chart.js, pdfmake, vue3-markdown, vitest)`
2. `docs: refresh README (stack versions, features, collections, commands)`
