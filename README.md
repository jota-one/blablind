# blablind

A real-time multiplayer music blindtest game with a buzzer system, powered by YouTube and PocketBase.

## Features

- **Create or join a session** via a unique slug URL — no account required
- **Anonymous players** — just pick a username, stored locally in `localStorage`
- **Two game modes** — classic (each player queues tracks and validates answers on their own) and **autonomous** (pick a pre-made playlist, everyone buzzes, peers vote to award points — no game master)
- **IRL mode** — in-person play: verbal answers, a single DJ device plays the music, host/DJ roles are requestable and handed over in-app
- **YouTube-based tracks** — search (Invidious proxy) or paste a URL; per-track start / excerpt length / reveal timings
- **Buzz to answer** — players race to buzz in; YouTube pauses automatically on a pending buzz
- **Wrong answer penalty** — a player who buzzes wrong is locked out (configurable attempts and rebuzz delay)
- **Skip voting** — players can vote to skip a track
- **Real-time sync** — all game state is synced live via PocketBase subscriptions, with reconnection recovery
- **Score tracking** — guessed/guessable ratio leaderboard and an end-of-game podium
- **Member area** — profile, game preferences, session history, favorite tracks, reusable playlist builder (shareable publicly)
- **Installable PWA** — home-screen install on Android and iOS, full-screen launch
- **FR/EN** — auto-detected, switchable

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro 7 (node adapter, SSR proxy routes) |
| UI | Vue 3 (three SPAs: game, member area, admin) |
| Backend | PocketBase 0.39 (JS migrations + JSVM hooks) |
| Styling | Tailwind v4 + DaisyUI (themes: `blind` / `darkblind`) |
| Components | PrimeVue (orange preset, admin) |
| Video | YouTube IFrame API |
| Package manager | pnpm (Node 24 via volta) |

## PocketBase Collections

`sessions`, `players`, `tracks`, `buzzes`, `videos` (shared catalog), `answer_votes` (autonomous mode), `favorites`, `playlists`, `playlist_tracks`, `users`, `roles`, `app_settings`, `feedback`. Schema history lives in `pb/pb_migrations/`.

## Commands

| Command | Action |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start dev server at `localhost:4321` |
| `pnpm db` | Start PocketBase at `127.0.0.1:8093` |
| `pnpm lint` / `pnpm format` | oxlint / oxfmt |
| `pnpm test:unit` | Unit tests (node, no framework) |
| `pnpm test:e2e` | Playwright e2e (see `tests/e2e/README.md`) |
| `pnpm build` | Type-check + build for production into `pb/pb_public` |
| `pnpm preview` | Preview the production build locally |

The SPA reaches PocketBase through `PUBLIC_PB_BASE_URI` (`.env.local`).

## Docs

- `ROADMAP.md` — planned work + shipped history
- `docs/ANALYSIS-2026-07-12.md` — architecture review
- `docs/plans/` — ready-to-execute implementation plans
- `CLAUDE.md` — project conventions, architecture map, known pitfalls
