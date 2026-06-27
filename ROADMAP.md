# BlaBlind Roadmap

This document tracks planned changes for the project and serves as a shared reference for prioritization, scope, and progress.

Recommended entry format: `- [YYYY-MM-DD] Title — short note`.

## Improvements & Refactoring

List of small potential improvements and refactors.



## New Features

### Mode autonome
Pour l'instant, lorsque N joueurs jouent à blablind, pour chaque morceau il y a un maître et N-1 joueurs. Le maître juge quel autre joueur a répondu juste.

Dans la mesure où l'on va pouvoir fournir des blindtests déjà créés (par un admin ou un autre membre du site), on peut imaginer qu'un groupe de joueurs crée une partie et charge l'un de ces blindtests. Dans ce cas, il n'y a plus de maître. Tout le monde peut participer. En gros c'est comme un blindtest sur YouTube où tout le monde essaie de deviner et au bout d'un temps déterminé, la réponse est fournie par l'application.

Ces blindtests seront un peu spéciaux dans la façon de les créer, voir la feature "Création de blindtest "pros"".

Il faut maintenant trouver comment gérer ça si l'on veut pouvoir garder le tracking des points. La définition du gagnant doit faire l'objet d'un consensus. Je pense qu'il faut garder la logique du BUZZ et le premier qui a buzzé. On peut imaginer stocker l'ordre des buzz. On garde uniquement les joueurs qui ont buzzé dans le temps imparti. Ensuite chaque joueur, dans l'ordre des buzz, peut proposer une réponse. Une fois que tous les joueurs élligibles ont pu répondre, on dévoile la bonne réponse. Si le premier joueur avait dit juste, les autres lui valident le point (votes à au moins 50% des autres joueurs. Exemple: s'il y a 6 joueurs, 5 vont voter et il faut 3 voix pour valider la bonne réponse du joueur candidat. S'il y a 3 joueurs, 2 joueurs vont voter et il suffit que l'un des 2 valide et ça donnera le point). Si le premier joueur n'a pas donné la bonne réponse (même système de votes, mais négatifs), on passe au 2ème joueur et ainsi de suite. Si personne n'a donné la bonne réponse, on enchaîne avec le prochain morceau.

Pendant la durée des votes, on laisse tourner le morceau sur sa séquence "résultat".


## History (done)

- [2026-06-27] Track add UX — you can undo a just-added track from the search list, its timing options lock once added (preview stays available to check the start), and a track's start/duration/reveal timings now show in the upcoming list.
- [2026-06-27] Track preview sizing — the preview player now fills its frame correctly and stays a comfortable size on both mobile and desktop.
- [2026-06-27] Password reset — users can request a reset link from the login modal and set a new password from a dedicated page.
- [2026-06-27] Session stats on dashboard — each blindtest row now shows track count and player count.

- [2026-06-27] Realtime robustness pass — game state now recovers after a connection drop, the host is reassigned reliably when a player leaves, backgrounded phones are no longer wrongly shown offline, and a track can no longer be skipped twice or score double-counted when players act at the same time. Snappier track lists and more reliable reveal playback.

- [2026-06-26] Pro track options — tracks can define a playback duration and a reveal-resume timestamp; both can be captured live while previewing. After a skip, the reveal section now plays (like after a correct answer).

- [2026-06-22] Leaderboard track count — in-game scores tab and end-of-game podium now show guessed/guessable count alongside the percentage.

- [2026-06-22] Host shuffle all tracks — host can shuffle all queued tracks at once (when no track is playing) with proportional interleaving across players; individual track shuffle also migrated to batch updates.

- [2026-06-15] Skip/rebuzz UX — buzzing cancels a player's own skip vote; track owner sees which players have passed on their track.

- [2026-06-13] Equity margin & offline player exclusion — offline players excluded from equity calculation; new `equity_margin` setting (default 1) configurable in the wizard, admin panel, user preferences, and in-game settings modal.

- [2026-06-13] Fix rebuzz after delay — after the rebuzz delay expires, the buzz is now allowed immediately without requiring another player to buzz first.

- [2026-05-18] Reconnection fix & orphan tracks — players who reconnect after an SSE drop now reappear correctly for all clients (reload on `PB_CONNECT`). When a player stays disconnected for 30s with queued tracks, the host is prompted to choose: inherit the tracks, delete them, or split them equally among remaining players.

- [2026-05-12] In-game settings modal — gear button in header opens session settings for all players; host can edit and save settings live during the game.

- [2026-05-12] Ratio-based scoring — score now shows guessed/guessable tracks as a percentage; tracks added by the player themselves are excluded from their guessable count.

- [2026-05-12] Search result visibility on mobile — track result rows now use a two-line layout so title and artist have full width; action buttons on a dedicated second line.

- [2026-05-12] Auto-close search on incoming buzz — track owner's search panel closes automatically when a buzz arrives.

- [2026-05-12] Preserve search panel state — modal now uses v-show so query and results persist when closed to buzz then reopened.

- [2026-05-12] Buzz & track UX improvements — shuffle own queued tracks in one click; full-screen green overlay when you win the buzz race ("À toi de parler !"); validated buzz shows distinct winner overlay.

- [2026-05-12] Player track management — players can delete their own queued tracks (two-step confirmation, force_equity compliant); duplicate detection after each track ends prompts the author to keep or remove the copy.

- [2026-05-12] Player reconnection & session history — players are linked to their auth account via auth_user; reconnecting restores the existing player record even without localStorage; profile "My Blindtests" now shows sessions the user joined (not only owned ones); host auto-reassigned when the current host goes offline.

- [2026-05-11] Game settings — configurable per-session snapshot (max buzz attempts, rebuzz delay, auto-reject delay, continue after success, stop method, force equity); wizard-based creation; app-level and per-user defaults; all settings enforced in gameplay.

- [2026-05-11] Mobile navigation improvements — hamburger moved to header for admin and client SPA; UserAuth shows avatar on all pages; drawer auto-closes on menu click.

- [2026-05-11] Client space SPA — profile page converted to a full Vue SPA with sidebar navigation: Profile (avatar, name edit), My Blindtests (owned + participated sessions), and Game Preferences (per-user overrides of app-level game settings).

- [2026-05-11] App-level settings — admin page to configure global game defaults (max buzz attempts, rebuzz/auto-reject delays, post-success behaviour, track equity).

- [2026-05-11] Remove YouTube playlist import — feature removed (unused; too complex to maintain)

- [2026-05-11] Admin video library management — new "Morceaux" page in the admin panel: list with debounced search (tokenized, AND logic via search_text), inline edit (title, artist, duration) and delete with confirmation. Update/delete restricted to admins via PocketBase rules.

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
