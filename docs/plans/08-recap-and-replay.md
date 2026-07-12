# Plan 08 — Feature: shareable recap page + replay a game

_Size: M. Risk: low. Two small user-facing features that share a surface. Recap is independent; replay's server part builds on plan 04's `create-session` endpoint (do plan 04 first, or inline the same logic client-side as a temporary variant)._

## 8A. Shareable recap page

### What

A public, read-only page at `/{slug}/recap` for **finished** sessions: session name + date, podium (top 3 with medals, same ranking math as GameOver), full leaderboard, and the tracklist (title, artist, who guessed it / skipped). This is the "share in the group chat afterwards" artifact — today the podium dies with the tab.

### Design decisions (already made)

- **Astro SSR page** (`export const prerender = false`), not a SPA route: shareable links need OG meta tags for chat previews (`og:title` = session name, `og:description` = "Podium : 1. Alice …"). Fetch from PB server-side with a plain `new PocketBase(...)` instance (public reads only — do NOT use any auth).
- File: `src/pages/[slug]/recap.astro`. It coexists with `src/pages/[slug].astro` (more specific path wins).
- Non-finished or unknown session → render a "nothing here yet" state with a link to `/{slug}` (no redirect loops, no error page).
- Data needed: session by slug; players of the session; tracks with `status = 'done'` + `expand=video`. Ranking = the `playerRatio` logic from Room.vue (guessed / guessable where guessable excludes own tracks; sort by ratio then guessed). If plan 07 extracted `playerRatio` into `src/game/rules.ts`, import it — do not duplicate.
- Keep it static HTML/Tailwind (reuse the daisyUI look of `GameOver.vue` as visual reference). No favorites island in v1 — favoriting needs the client auth store; note it as a follow-up.
- Compatibility with plan 05: only `queued` tracks have their video hidden — done tracks are fully readable, so the recap works unchanged.

### Client links

- `GameOver.vue`: add a "Voir le récap / Copier le lien" button (uses `navigator.clipboard`, falls back to showing the URL).
- `MyBlindtests.vue`: finished sessions link to their recap.

### Verification

- Finished session → recap renders podium + tracklist; unknown slug and unfinished session → friendly empty state; OG tags present in the HTML source (`curl -s localhost:4321/<slug>/recap | grep og:`).
- e2e: extend `buzz-advance.spec.ts` (or a new small spec) — finish a seeded game, visit `/recap`, assert winner name and a track title are visible.

Commits: `feat(game): public recap page for finished sessions`, `feat(game): recap links from game over and my blindtests`. Add a ROADMAP History entry.

## 8B. Replay (clone a finished game)

### What

One button — "Rejouer cette playlist" — on the GameOver screen and the recap page. Creates a **new** session with the same tracks, fresh slug, and redirects the initiator to it.

### Design decisions (already made)

- The clone is created as an **autonomous** session regardless of the original's mode. Rationale: cloned tracks can't keep their `added_by` (those players belong to the old session — wrong validators, wrong equity), and autonomous mode natively supports ownerless tracks with peer-vote scoring. This also gives replayed classic games a natural "everyone guesses" dynamic — the person who replays may have played the original.
- Server-side: extend plan 04's `POST /api/game/create-session` with an optional `cloneFromSessionId`. In the same transaction: copy every track of the source session (done AND queued) with `status: 'queued'`, `solved_by/skip_votes/skip_revealed/phase/started_at/is_duplicate` cleared, `added_by` empty, `start_seconds/playback_duration/reveal_seconds/video` preserved, `order` preserved (done tracks keep their play order). Session fields: provided `name` (client pre-fills `"<old name> – encore"`), `mode: 'autonomous'`, `irl_mode: true`, `settings: { default_playback_duration: 30 }` merged with the source's `default_playback_duration` if set.
  - If plan 04 is not merged yet: implement the same copy client-side behind the existing public create rules, and move it into the endpoint when plan 04 lands (leave a `TODO(plan-04)` marker).
- No restriction on the source session's status (cloning a mid-game session is harmless — it copies the tracklist), but only surface the button on finished contexts.
- Anti-abuse: none in v1 (creation endpoints are already open); mention in the PR description.

### Verification

- Clone from a finished classic game → new session in lobby state, all tracks queued/ownerless, timings preserved; play one track through with two browsers (autonomous flow works on cloned data).
- Clone from an autonomous game → same result.
- Original session untouched (status still `finished`, tracks still `done`).

Commits: `feat(game): replay a finished game as a new autonomous session`. ROADMAP History entry.
