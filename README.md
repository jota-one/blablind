# blablind

A real-time multiplayer music blindtest game with a buzzer system, powered by YouTube and PocketBase.

## Features

- **Create or join a session** via a unique slug URL — no account required
- **Anonymous players** — just pick a username, stored locally in `localStorage`
- **YouTube-based tracks** — the host queues songs by YouTube URL with an optional start time
- **Buzz to answer** — players race to buzz in; YouTube pauses automatically on a pending buzz
- **Track validation** — the player who added a track validates or rejects buzz answers
- **Wrong answer penalty** — a player who buzzes wrong is locked out until another player buzzes
- **Skip voting** — players can vote to skip a track
- **Real-time sync** — all game state is synced live via PocketBase subscriptions
- **Score tracking** — correct answers award points, displayed on a live leaderboard

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro 6 |
| UI | Vue 3 |
| Backend | PocketBase 0.36.6 |
| Styling | Tailwind v4 + DaisyUI (themes: `blind` / `darkblind`) |
| Components | PrimeVue (orange preset) |
| Video | YouTube IFrame API |
| Package manager | pnpm |

## PocketBase Collections

- **sessions** — name, slug, status (`waiting` / `playing` / `finished`), host
- **players** — session, name, score, ready flag
- **tracks** — session, youtube_url, start_seconds, title, artist, status (`queued` / `playing` / `done`), order, skip_votes, solved_by
- **buzzes** — track, player, answer, status (`pending` / `correct` / `wrong`)

## Commands

| Command | Action |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start dev server at `localhost:4321` |
| `pnpm build` | Build for production to `./dist/` |
| `pnpm preview` | Preview the production build locally |

PocketBase runs separately on port **8093** in local development.
