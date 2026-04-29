# BlaBlind Roadmap

This document tracks planned changes for the project and serves as a shared reference for prioritization, scope, and progress.

Recommended entry format: `- [YYYY-MM-DD] Title — short note`.

## Improvements & Refactoring

List of small potential improvements and refactors.


## New Features


## History (done)

- [2026-04-29] Self-service email verification — after signup, PocketBase's `requestVerification` is called automatically so users receive a confirmation email and can activate their account without admin intervention.

- [2026-04-29] Join error snackbar — entering a wrong session code on the homepage now shows a toast error instead of navigating to a blank error page.

- [2026-04-29] YouTube search error handling — a snackbar is shown when the YouTube search proxy returns a non-ok response (e.g. 502).

- [2026-04-29] Session ownership — authenticated users can link blindtests to their account. Owner is set automatically on creation; existing sessions can be claimed from the room header (host-only, one-click). Owned sessions listed in the profile page with status and direct link. Visual indicator (user-check icon) in the room header when the session is owned by the current user.

- [2026-04-29] Pre-fill player name from auth user — when entering a blindtest room while authenticated, the pseudo field is pre-filled with the user's account name.

- [2026-04-22] Profile editing — inline avatar upload (auto-save on change) and name editing (inline input with confirm/cancel) on the "My account" page.

- [2026-04-17] User registration & admin user management — signup form (email, name, password) with pending validation flow; new `roles` collection with seeded `user` and `admin` roles; admin pages for users (list, add, edit, delete, verify) and roles (list, add, edit, delete); PocketBase `authRule` blocks unverified users from logging in; custom PocketBase hook allows admins to toggle the `verified` flag.

- [2026-04-17] Internationalization (FR/EN) — all UI strings extracted to `src/translations/{fr,en}.json` using `@jota-one/i36n`. Language auto-detected from browser, persisted in localStorage, switchable via a FR/EN toggle in the navbar. All Vue components migrated.

- [2026-04-17] Remove leave session button — the "Quitter" button in the room header was removed to prevent accidental player deletion. The dismiss action on the home page restore banner is unaffected (localStorage only, no player record deleted).

- [2026-04-17] Fix crypto.randomUUID in non-secure contexts — fallback UUID v4 generation via `crypto.getRandomValues` for HTTP (local network) testing.

- [2026-04-11] Add track modal — "Ajouter un morceau" moved out of the À venir tab into a full-screen modal triggered by a button in the action bar below BUZZ. Skip vote integrated in the same bar.

- [2026-04-11] Compact guesser view — for non-track-owners, the playing area shrinks to a single compact row (emoji + "Morceau de X" + status), freeing space for the BUZZ button. Track owners keep the full aspect-ratio view.
- [2026-04-11] Skip button renamed to "Je passe" with solid neutral style.

- [2026-04-11] Classic folder-tab styling — "À venir / Passés / Classement" tabs restyled as raised folder tabs with border, active tab merges visually into the bordered panel below.

- [2026-04-11] Drag & drop track reordering — each player can reorder their own queued tracks via a grip handle in the "À venir" tab. Only their own `order` slots are permuted; other players' tracks are unaffected.

- [2026-04-11] Skip animation — when all players vote to skip a track, a 3-second overlay shows the track title and artist (skip icon, "Personne n'a trouvé !") before advancing, matching the solved animation flow.

- [2026-04-11] 2-row room header — session name + status + quit on row 1; IRL context + player count + host actions on a compact row 2. Prevents overflow on mobile and separates navigation from game controls.

- [2026-04-11] IRL mode — host-only toggle that switches the session to in-person play: buzz is direct (no text input, verbal answer), only one player's device plays music (the DJ). Host becomes DJ by default; any player can request the DJ role from the Classement tab, host approves or rejects. Non-DJ devices stop playing the blindtest track but keep their YouTube player for personal track previews.

- [2026-04-11] Swipeable tab navigation — track list split into 3 swipeable tabs ("À venir", "Passés", "Classement") replacing the old dual-column layout. Panels slide horizontally following the finger in real time (VueUse `useSwipe`, `passive: false`); snaps to the next tab if swipe exceeds 30% of panel width, otherwise springs back. Tab buttons still work via click.

- [2026-04-11] Reset blindtest — host-only button in the header opens a confirmation modal and resets the session: all scores back to 0, all tracks back to queued (solved_by and skip_votes cleared), session back to waiting so the host can relaunch.

- [2026-04-11] Solved animation overlay — when a buzz is validated correct, an animated overlay appears on all players' screens for 3 seconds showing the trophy icon, track title & artist, and the winner's name. The track keeps playing during the animation; the game advances only after it completes.

- [2026-04-11] Minimum 2 players to launch — the "Launch blindtest" button is disabled when only one player is in the session, preventing the host from getting stuck in a solo game with no one to validate buzzes.

- [2026-04-06] Marketing homepage — one-pager with hero, animated logo in nav, "How it works" section (4 steps), live stats from DB (sessions, players, tracks), and a feedback form. Vite proxy (`/api`, `/_`) added to avoid mixed-content errors in dev.

- [2026-04-06] End-of-game podium screen — podium with medals and full leaderboard displayed automatically when the last track is done. Session transitions to "finished" on both correct buzz validation and skip vote. Host role is inherited by the next online player if the track owner disconnects.

- [2026-04-06] Track search, QR code sharing & bug fixes — tokenized accent-insensitive local search with automatic YouTube (Invidious) fallback; preview button per result; URL auto-fill via YouTube oEmbed; shareable QR code modal in session header. Fixes: warm-up overlay opacity, re-buzz in 2-player games, clipped lobby layout, Vue DOM ref migration to `useTemplateRef`.

- [2026-04-05] Track normalization & secure player deletion — shared `videos` collection (video_id, title, artist, duration) deduplicated across sessions. Private/deleted videos (duration = 0) filtered out on playlist import. Players receive a `secret` UUID on creation; deletion requires it as a query param. Cascade delete on buzzes when a player is removed.

- [2026-04-05] Hotfix: playlist endpoint — moved from `/api/playlist` to `/proxy/playlist` to avoid conflict with PocketBase's own `/api/*` routes in production.

- [2026-04-05] YouTube playlist import, presence & session restore — import YouTube playlists via server-side Invidious proxy with per-track selection. Player presence via `last_seen` heartbeat (15s interval), offline players grayed out after 30s. Leave session button with automatic host transfer. Session restore banner on home (TTL 3h, localStorage). Persistent YouTube iframe for single audio context + iOS/Android warm-up overlay.

- [2026-04-02] Initial platform — full foundation: Astro 6 + Vue 3 + PocketBase + Tailwind v4 + DaisyUI stack; PocketBase collections (`sessions`, `players`, `tracks`, `buzzes`) with all supporting fields; game SPA with home (create/join), lobby (ready-up), and room (YouTube playback, buzz, answer validation, skip vote, real-time scoring); anonymous players via localStorage; role logic (track owner validates answers, cannot buzz on own track); auto-advance to next track; server-filtered PocketBase realtime subscriptions.
