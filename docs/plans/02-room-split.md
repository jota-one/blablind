# Plan 02 — Split Room.vue

_Size: L. Risk: low if done mechanically. `src/game/views/Room.vue` is ~2 130 lines; target < 600._

## Goal

Extraction only — **zero behavior change**. Two phases: (A) move game logic into composables, (B) move template blocks into components. One extraction per commit; after each commit the app must build and both e2e specs must pass.

## Ground rules

- Copy code, don't rewrite it. Keep names, comments, and semantics identical.
- Follow the existing pattern: `useAutonomous.ts` already receives a big `options` object of refs/computeds and returns state + actions. New composables do the same.
- Components: typed props (`type Props = {} → defineProps<Props>()`), events via `defineEmits`. Until plan 03 lands, `any` in prop types is acceptable (matches current style).
- After each extraction run: `pnpm lint && pnpm build && pnpm test:unit && pnpm test:e2e` (PB running via `pnpm db`).

## Phase A — composables (logic, no template change)

### A1. `src/game/composables/useRoomRoles.ts`

Move from Room.vue: `claimSession`, `proposeHost`, `approveHost`, `rejectHost`, `proposeDJ`, `approveDJ`, `rejectDJ`, `toggleIrlMode`, and the computeds `canClaim`, `isOwner`, `hostCandidate`, `djPlayer`, `djCandidate`, `hostPlayer`, `hasPendingRoleRequest`, `rolesTitle`, `isDJ`, `isIrlMode`.

Signature sketch:

```ts
export default function useRoomRoles(options: {
  session: ComputedRef<any>          // computed(() => props.session)
  currentPlayerId: string
  players: Ref<any[]>
  isHost: ComputedRef<boolean>
  isAuthenticated: ComputedRef<boolean>
  user: Ref<any>
  t: (key: string, params?: any) => string
}) { /* returns all of the above */ }
```

### A2. `src/game/composables/useGameFlow.ts`

The orchestration core. Move: `advancing` lock + `advanceFrom`, `startTrack`, orphan-track state and handlers (`orphanDecisionTrack`, `isOrphanTrack`, `nextOrphanOwner`, `orphanedQueuedTracks`, `orphanInherit`, `orphanDelete`, `orphanSplit`, `pushOrphanBack`, `deleteOrphanTrack`, `claimOrphanTrack`), the playback-duration timer block (`pausedByDuration`, `playbackDurationTimer`, `clearPlaybackTimer`), the reveal-seek block (`revealSeekDone`, `seekRevealOnce`, `seekRequest`/`requestSeek`), the window countdown (`windowDeadline`, `windowNow`, `windowClock`, `windowRemainingSeconds`), and these watchers: track-change timer arming, `solved_by` auto-advance, `skipVoteArray` skip flow, autonomous voting/reveal watcher, `isTrackSolvedAndPlaying` watcher, orphan-reconnect watcher.

Inputs it needs (pass as options): `session`, `currentPlayerId`, `isHost`, `isAutonomousMode`, `players`, `onlinePlayers`, `tracks`, `currentTrack`, `queuedTracks`, `playTrack`, `finishTrack`, `deleteTrack`, `sessionSettings`, `isTrackSolvedAndPlaying`, `skipVotesNeeded`, `skipVoteArray`, `animationState`, `autoPhase`, `batchUpdateOrders`.

Watch out: `animationState` is shared between the solved-buzz watcher (stays in Room, it touches `solvedBuzz` from `useBuzzes`) and the skip flow (moves). Pass the ref in, don't duplicate it. Same for `pausedByDuration` which `useAutonomous` consumes — after the move, Room reads it from `useGameFlow` and passes it to `useAutonomous`.

### A3. `src/game/composables/useRoomSettings.ts` (small)

`sessionSettings` computed (defaults merge), `editedSettings`, `openSettingsModal`, `saveSettings`, `settingsSaving`, `settingsError`, `showSettingsModal`.

**Checkpoint A**: Room.vue script should be roughly halved. Commits:
- `refactor(game): extract useRoomRoles from Room.vue`
- `refactor(game): extract useGameFlow from Room.vue`
- `refactor(game): extract useRoomSettings from Room.vue`

## Phase B — components (template blocks)

Current template map (line numbers of 2026-07-12, drift expected after phase A):

| Block | Lines | → Component |
|---|---|---|
| 3-layer video/warm-up/status container incl. lobby | 61–201 | `PlaybackCard.vue` (lobby content via `<slot name="idle">`) |
| Lobby roster + ready/launch | 126–199 | `RoomLobby.vue` (rendered in PlaybackCard's slot) |
| Classic buzz zone | 231–284 | `BuzzZone.vue` |
| Validator panel + auto-reject countdown (incl. its timer logic) | 287–308, 1908–1930 | `ValidatorPanel.vue` |
| Tabs (upcoming/done/scores) + swipe + drag & drop | 363–557, swipe/sortable logic | `RoomTabs.vue` |
| Menu drawer + roles/settings/reset/participants modals | 636–1029 | `RoomMenus.vue` |

Recommended order (leaf-first, smallest risk): `ValidatorPanel` → `BuzzZone` → `RoomLobby` → `RoomMenus` → `RoomTabs` → `PlaybackCard`.

Contract style — example for `BuzzZone.vue`:

```ts
type Props = {
  currentPlayer: any
  activeBuzz: any | null
  canBuzz: boolean
  buzzBlockReason: 'max_attempts' | 'delay' | 'others' | null
  rebuzzRemainingSeconds: number
  remainingAttempts: number
  isIrlMode: boolean
}
// emits: (e: 'submit', answer: string), (e: 'cancel')
```

Keep the `buzzing`/`answer` local UI state inside the component; the `submitBuzz` PB logic stays in Room (or `useBuzzes`) and receives the answer via the emit. `AutonomousPanel.vue` is the in-repo reference for this pattern — mirror its prop/emit granularity.

`RoomTabs` notes: `useSwipe` needs `passive: false` (house rule) — it's already set, keep it. The Sortable instance and the `trackList` template ref move with the component. All track-row actions (`requestDeleteTrack`, favorites toggle…) become emits.

**Checkpoint B**: one commit per component, `refactor(game): extract <Name> from Room.vue`.

## Final acceptance

- Room.vue < 600 lines, containing: composable wiring, top header, component layout, overlays, toast.
- `grep -c "pb.collection" src/game/views/Room.vue` — target ≤ 5 (remaining direct writes move in plan 04; do NOT redesign them here, just relocate if trivial).
- Both e2e specs green; manual smoke: create classic session, 2 browsers, buzz + validate + skip; create autonomous session, full track cycle.
