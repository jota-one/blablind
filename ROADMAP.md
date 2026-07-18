# BlaBlind Roadmap

This document tracks planned changes for the project and serves as a shared reference for prioritization, scope, and progress.

Recommended entry format: `- [YYYY-MM-DD] Title — short note`.

## Improvements & Refactoring

List of small potential improvements and refactors.

> Plans d'implémentation détaillés (prêts à exécuter, autosuffisants) pour les chantiers d'architecture : `docs/plans/00-INDEX.md`.

- **Sécurité : visibilité des tracks non révélés** — la collection `tracks` est en lecture publique avec expand `video`, donc le titre/artiste du morceau en cours est déjà lisible via l'API par un tricheur motivé, avant révélation. Vraie correction : restreindre la lecture des champs sensibles (ou du expand) tant que le morceau n'est pas révélé. Chantier à part (impacte le flux de jeu temps réel). Encore plus sensible en mode autonome (tous les joueurs sont devineurs, et les réponses tapées transitent dans `buzzes.answer` avant révélation).
- **Sécurité : validation serveur des favoris** — hook JSVM sur la création d'un favori : le client passe l'id du track d'origine, le hook vérifie que le morceau est bien révélé (`status === 'done'` ou `solved_by`/`skip_revealed`) avant d'accepter. Complète le garde-fou UI. À expliquer/valider avant implémentation.
- **Sécurité : verrouiller les écritures gameplay** — `sessions`/`tracks`/`buzzes` sont en update/delete publics (n'importe qui peut se nommer host, valider un buzz, supprimer une session). Généraliser le `secret` joueur existant via des endpoints custom (pattern `skip-vote`) : buzz, vote, validation, avance, update session — avec vérification du rôle (host/validateur). Priorité #1 de l'analyse. Voir `docs/ANALYSIS-2026-07-12.md` §2.1.
- **Refactor : découper Room.vue** — 2 100+ lignes : extraire RoomLobby, PlaybackCard, BuzzZone/ValidatorPanel, RoomTabs, RoomMenus + composables `useGameFlow` / `useRoomRoles`, et rapatrier les ~25 écritures PB brutes dans les composables (prérequis du chantier sécurité). Voir `docs/ANALYSIS-2026-07-12.md` §2.2.
- **Typage des records PB** — remplacer les `any` (27 fichiers) par des types partagés `src/types/records.ts` (ou `pocketbase-typegen`), en commençant par les composables et props du jeu. Voir `docs/ANALYSIS-2026-07-12.md` §2.3.
- **Reconciler autonome côté serveur** — une fois le build Go custom en place (Web Push), porter `computeNextAction` (fonction pure, tests unitaires = spec de portage) côté serveur pour supprimer la dépendance au navigateur du host. Voir `docs/ANALYSIS-2026-07-12.md` §2.4.
- **Nettoyage deps & README** — `chart.js`, `pdfmake`, `vue3-markdown` sans aucun import dans `src/` (à supprimer) ; `vitest` installé mais non utilisé comme runner ; README obsolète (Astro 6, 4 collections, modes IRL/autonome absents).
- **Couverture de tests ciblée** — unit : matrice `buzzBlockReason`, équité `canAddTrack`/`canDeleteTrack`, `skipVotesNeeded`, `playerRatio` ; e2e : flux IRL (handover DJ + buzz verbal), plus gros flux non testé.
- **Durcissement recherche Invidious** — persister les résultats dans la collection `videos` comme premier niveau de recherche ; liste d'instances configurable par env (rotation sans déploiement).
- **Heartbeat : amplification d'écritures** — chaque heartbeat (15s) = update `players` diffusé en SSE à tous + hook d'élection du host. OK à l'échelle actuelle ; si sessions > ~20 joueurs, endpoint dédié + early-exit du hook quand le host est en ligne.



## New Features

### Mode autonome — suite (v2)
La v1 est livrée (voir History 2026-07-12). Reste pour plus tard :
- **Mode "simple"** : charger une playlist dont les morceaux n'ont pas de timings "pro" (durée d'extrait, reprise résultat) — aujourd'hui un défaut de 30s s'applique, mais l'expérience est pensée pour des playlists préparées.
- **Auteur de la playlist** : il connaît les réponses — le badger ou l'exclure des candidats/votes.
- **Galerie de playlists publiques** : aujourd'hui les playlists publiques n'apparaissent que dans le wizard ; une page de navigation (tags, recherche) serait utile.
- **Fenêtre de buzz pause-aware** : le timer d'extrait est wall-clock ; une pause pendant l'extrait raccourcit la fenêtre effective. Piste : deadline dérivée des timestamps serveur (`started_at` + durée + `paused_ms` accumulé sur le track) — tous les clients calculent le même compte à rebours (voir `docs/ANALYSIS-2026-07-12.md` §2.4).
- **Export/durcissement des votes** : votes définitifs v1 (pas de changement d'avis) ; seuil recalculé sur les joueurs en ligne au moment du vote.

### Notifications push (Web Push)
> Plan d'implémentation détaillé : `docs/plans/09-webpush-go.md` (scaffolding calqué sur lexlsf).

Prévenir les joueurs même app fermée / onglet en arrière-plan : "la partie démarre", "c'est ton tour de faire deviner", "tu as été invité". Prérequis déjà en place : l'app est installable (manifest + service worker), ce qui est obligatoire pour le push sur iOS (16.4+).

Architecture retenue : **build PocketBase custom en Go** (hybride — le plugin `jsvm` est conservé, donc tous les hooks/migrations JS actuels continuent de tourner). Le push part directement d'un hook Go via la lib `webpush-go` (chiffrement aes128gcm + JWT VAPID gérés nativement), ce qui évite un sidecar Node ou une réimplémentation crypto en JSVM.

À faire :
- Générer une paire de clés **VAPID** (publique côté client, privée en secret serveur).
- Collection `push_subscriptions` (endpoint + clés `p256dh`/`auth`, liée au player/user, dédup par endpoint).
- Client : bouton opt-in → `Notification.requestPermission()` → `pushManager.subscribe(clé publique)` → envoi de la subscription à PocketBase.
- Service worker : handlers `push` (showNotification) et `notificationclick` (ouvrir la room).
- Hook Go : sur les déclencheurs (partie démarre / ton tour / invitation) → envoyer le push aux subscriptions ciblées.
- Build/déploiement : scaffolding `main.go` + `go.mod`, étape CI `go build`, on déploie notre binaire au lieu du binaire officiel. L'infra de déploiement est déjà en place — s'inspirer du projet **lexlsf** qui a déjà son propre build Go custom de PocketBase.

### Morceaux favoris
Idée de Geetha. Pendant un blindtest, si un morceau plaît à un joueur, il peut l'ajouter à ses favoris — mais uniquement une fois le morceau **révélé** (bouton non disponible avant). Le bouton reste aussi accessible après coup, depuis la liste des morceaux déjà joués ("Passés") et l'écran de fin de partie, pour rattraper un ajout oublié.

**Spec validée (2026-07-10)** :
- Collection `favorites` : `user` (relation) + `video` (relation, catalogue durable) + snapshots contextuels (`discovered_from_name`, `discovered_from_user`, `session_name`, `guessed_right`, `start_seconds`). Index unique `(user, video)` = anti-doublon. Règles API scopées au user connecté.
- Réservé aux joueurs connectés ; les invités voient le bouton désactivé avec une incitation à créer un compte.
- Retirer un favori = toggle du même bouton (in-game) ou bouton dans l'espace membre.
- Espace membre : section dédiée listant thumbnail, titre, artiste, qui a fait découvrir, session + date, badge si deviné juste, lien YouTube avec timestamp, retrait.

Reste à faire ensuite :
- Export ou partage de sa liste de favoris.
- Hook serveur de validation (voir Improvements / Sécurité).

### Idées issues de l'analyse 2026-07-12
Classées par rapport valeur/effort — détails et arbitrages dans `docs/ANALYSIS-2026-07-12.md` §3.

- **Page récap partageable** : à la fin d'une partie, page publique en lecture seule `/{slug}/recap` (podium, liste des morceaux, qui a deviné) — l'artefact "à partager dans le groupe" ; deuxième chance d'ajouter un favori. Toutes les données existent déjà. Plan : `docs/plans/08-recap-and-replay.md`.
- **Rejouer une partie** : bouton sur l'écran de fin / récap qui clone la session (nouveau slug, tracks re-queued, mode autonome) — même playlist pour le groupe suivant. Plan : `docs/plans/08-recap-and-replay.md`.
- **Scoring dégressif à la vitesse (option)** : point plein si buzz correct sous N secondes, dégressif ensuite — les timings par buzz sont déjà enregistrés (`buzzes.created` vs `tracks.started_at`). Nécessite de passer d'un score dérivé de `solved_by` à un score stocké par track (à mutualiser avec le mode équipes).
- **Mode équipes** : choix d'équipe au lobby (`players.team`), score agrégé par équipe, mauvaise réponse = toute l'équipe bloquée. Équité et validation inchangées.
- **Mode TV / grand écran** : route spectateur `/{slug}/tv` sans record joueur — état du morceau (sans réponse avant révélation), ordre des buzz, compte à rebours, classement, QR code. Idéal IRL projeté sur une TV ; répond aussi au cas "l'auteur de la playlist regarde sans jouer" (v2 autonome).
- **Partie instantanée par thème** : chemin "quick game" dans le wizard — tags/décennie → playlist assemblée depuis les `playlist_tracks` publics. S'appuie sur la galerie de playlists publiques déjà prévue (v2).
- **Stats carrière (membres)** : page "Stats" dans l'espace membre — parties jouées, ratio dans le temps, meilleure série, artistes les plus devinés. Tout est calculable depuis `players.auth_user` + `tracks.solved_by` + `favorites`. Donne une vraie raison de créer un compte.
- **Import playlist Spotify/Deezer** : coller un lien de playlist publique → récupération serveur de la liste → matching "artiste - titre" via le proxy de recherche existant → confirmation par morceau dans l'éditeur de playlists. (Plus tard — l'import YouTube avait été retiré, mais le contexte a changé : le builder de playlists et le mode autonome existent désormais.)

Écartés volontairement (voir analyse) : app native (la PWA + Web Push couvrent le besoin), hébergement audio in-app (droits, stockage), leaderboards globaux (scores non comparables entre sessions, incite à la triche).


## History (done)

- [2026-07-18] Impersonation (admin) — an administrator can sign in as any user from the users list to see the app through their eyes; a banner in the member area signals the impersonation and lets the admin return to their own account.
- [2026-07-18] Account merge (admin) — an administrator can merge two user accounts: all activity of the source account (sessions, game history, favorites, playlists) is moved to the target account, then the emptied source account is deleted.
- [2026-07-12] Autonomous mode — games with no game master: pick a pre-made playlist in the creation wizard, everyone buzzes during the excerpt (order recorded), answers are typed at buzz time (remote) or spoken aloud in buzz order at the excerpt's end (IRL), then the answer is revealed and peers vote (≥50%) to award the point, candidate by candidate in buzz order. The reveal segment plays during the votes, the session auto-finishes after the last track, and the podium works unchanged.
- [2026-07-12] Playlists — members can build reusable blindtest playlists in their member area: YouTube search or picking from their favorite tracks (saved start timing applied), per-track start/excerpt-length/reveal timings captured from an in-app preview, drag reordering, name/description/tags metadata and a public toggle to share them with other members.

- [2026-07-10] Favorites tab in the add-track modal — logged-in players can add tracks to a game straight from their favorites, with the saved start timing applied.
- [2026-07-10] Favorite tracks — logged-in players can star a revealed track (reveal overlay, "Passés" tab, end-of-game screen) and find their favorites in a new member-area section with discovery context, in-app playback (tap the thumbnail), an editable start timing (typed or captured from the preview), a YouTube link and removal; guests are invited to create an account.
- [2026-07-10] Buzz from the add-track modal — the fullscreen search/add modal now shows the BUZZ button at the bottom, so players can buzz while browsing for tracks; buzzing closes the modal and returns to the game.
- [2026-07-10] Shuffle all while paused — the host can now shuffle all upcoming tracks when the current track is paused, not only between tracks.
- [2026-07-01] IRL mode by default — new blindtests now start in IRL mode with the host as DJ by default; remote mode must be enabled manually by the host from the menu.
- [2026-06-28] Installable app — BlaBlind can now be installed to the home screen on Android (with the Install prompt) and iPhone, launching full-screen like a native app.
- [2026-06-28] App icon — installing BlaBlind to a home screen (or seeing it in a browser tab) now shows the BlaBlind play logo instead of a generic letter.
- [2026-06-28] Simpler top bar with a menu — the cluttered row of icons is gone; a single menu drawer gathers roles, participants list, share, settings, IRL mode and reset. The host can pause/resume a playing track by tapping the status badge, and the game can only be reset when it isn't mid-track.
- [2026-06-28] No answer leak in Now Playing — the OS/browser "Now Playing" widget no longer shows the current track's title and cover art when switching tabs, so the DJ can't accidentally peek at the answer.
- [2026-06-28] Consistent "next track" prompt — in host-decides mode, the host now gets the same centered prompt used for the group vote (with the track info and an add-track shortcut) instead of a small inline button.
- [2026-06-28] Absent player's track — when the next track belongs to someone who has left, the game now pauses instead of playing it and mis-crediting the host; the host can take the track, push it back one or five spots, or delete it, then play resumes.
- [2026-06-28] Host & DJ roles panel — tap the host/DJ info in the top bar to open a panel showing who holds each role and to request or hand it over; a red dot flags pending requests, and a snackbar tells everyone when the host or DJ changes. The DJ role is now handed over by the current DJ, and re-enabling IRL mode restores the previous DJ.
- [2026-06-28] Lobby roster with avatars — everyone now sees the participant list and ready status in the lobby, with real profile pictures (or initials) shown there and in the ranking.
- [2026-06-28] Host handover — any player can ask the current host to hand over the role, and the person who created the blindtest can reclaim host instantly.
- [2026-06-28] Reliable skip votes — voting to stop a track (including after the reveal) no longer needs a second click when two players vote at the same time; every vote now counts.
- [2026-06-27] Add a track while waiting — after voting to skip the current track, you can open the add-a-track screen to queue a new one during the wait.
- [2026-06-27] Search result layout — each result now shows a play/stop preview on its thumbnail and clearly labelled Start / Excerpt length / Reveal fields (with a "s" suffix) below it, with a larger add button.
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
