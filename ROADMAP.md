# BlaBlind Roadmap

This document tracks planned changes for the project and serves as a shared reference for prioritization, scope, and progress.

Recommended entry format: `- [YYYY-MM-DD] Title — short note`.

## Improvements & Refactoring

List of small potential improvements and refactors.


## New Features


## History (done)

- [2026-04-11] Solved animation overlay — when a buzz is validated correct, an animated overlay appears on all players' screens for 3 seconds showing the trophy icon, track title & artist, and the winner's name. The track keeps playing during the animation; the game advances only after it completes.

- [2026-04-11] Minimum 2 players to launch — the "Launch blindtest" button is disabled when only one player is in the session, preventing the host from getting stuck in a solo game with no one to validate buzzes.

- [2026-04-06] Marketing homepage — one-pager with hero, animated logo in nav, "How it works" section (4 steps), live stats from DB (sessions, players, tracks), and a feedback form. Vite proxy (`/api`, `/_`) added to avoid mixed-content errors in dev.

- [2026-04-06] End-of-game podium screen — podium with medals and full leaderboard displayed automatically when the last track is done. Session transitions to "finished" on both correct buzz validation and skip vote. Host role is inherited by the next online player if the track owner disconnects.

- [2026-04-06] Track search, QR code sharing & bug fixes — tokenized accent-insensitive local search with automatic YouTube (Invidious) fallback; preview button per result; URL auto-fill via YouTube oEmbed; shareable QR code modal in session header. Fixes: warm-up overlay opacity, re-buzz in 2-player games, clipped lobby layout, Vue DOM ref migration to `useTemplateRef`.

- [2026-04-05] Track normalization & secure player deletion — shared `videos` collection (video_id, title, artist, duration) deduplicated across sessions. Private/deleted videos (duration = 0) filtered out on playlist import. Players receive a `secret` UUID on creation; deletion requires it as a query param. Cascade delete on buzzes when a player is removed.

- [2026-04-05] Hotfix: playlist endpoint — moved from `/api/playlist` to `/proxy/playlist` to avoid conflict with PocketBase's own `/api/*` routes in production.

- [2026-04-05] YouTube playlist import, presence & session restore — import YouTube playlists via server-side Invidious proxy with per-track selection. Player presence via `last_seen` heartbeat (15s interval), offline players grayed out after 30s. Leave session button with automatic host transfer. Session restore banner on home (TTL 3h, localStorage). Persistent YouTube iframe for single audio context + iOS/Android warm-up overlay.

- [2026-04-02] Initial platform — full foundation: Astro 6 + Vue 3 + PocketBase + Tailwind v4 + DaisyUI stack; PocketBase collections (`sessions`, `players`, `tracks`, `buzzes`) with all supporting fields; game SPA with home (create/join), lobby (ready-up), and room (YouTube playback, buzz, answer validation, skip vote, real-time scoring); anonymous players via localStorage; role logic (track owner validates answers, cannot buzz on own track); auto-advance to next track; server-filtered PocketBase realtime subscriptions.
