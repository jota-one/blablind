# Plan 07 — Misc hardening: Invidious config, heartbeat, targeted unit tests

_Size: S. Risk: low. Three independent tasks — can be done in any order, or split._

## A. Invidious instance list via env

`src/pages/proxy/search.ts` hardcodes `INVIDIOUS_INSTANCES`. Public instances die regularly; rotating the list should not require a deploy of new code.

- Read `process.env.INVIDIOUS_INSTANCES` (comma-separated URLs) at request time, falling back to the current hardcoded list. Trim entries, drop empties.
- Document the variable in `.env` (commented example) and the README's dev section.
- Note: this is an SSR endpoint (`prerender = false`, node adapter) — `process.env` is available at runtime; do NOT use `import.meta.env` for this (build-time inlining would defeat the purpose).

Verification: `INVIDIOUS_INSTANCES=https://inv.nadeko.net pnpm dev`, search in the add-track modal, watch the server log.

Commit: `feat(search): configurable Invidious instance list via env`

## B. Heartbeat hook early-exit

`pb/pb_hooks/host_election.pb.js` runs on **every** player update (heartbeats every 15 s per player) and always does: session fetch + filtered player query. Cheap win: when the updated player IS the current host, the host is obviously online — skip the election query.

In the hook, right after loading the session:

```js
// The host's own heartbeat proves the host is online — no election needed.
if (hostId && e.record.id === hostId) {
  return
}
```

Careful: place it after `e.next()` and the session fetch, before `findRecordsByFilter`. Do not change anything else in the file (its election semantics are load-bearing).

Verification: two players in a session, watch PB logs — the host's heartbeats no longer trigger the players query (add a temporary `console.log` to confirm, then remove it).

Commit: `perf(pb): skip host election on the host's own heartbeat`

## C. Targeted unit tests (extract-then-test)

The regression history of this project is concurrency/edge-case math (double skip, double score, equity). The valuable logic is currently trapped inside composables that import `pocketbase` and Vue reactivity — **extract pure functions first**, following the existing precedent (`src/game/autonomous.ts` + `tests/unit/autonomous.test.ts`, runner: `node --experimental-strip-types`, `node:test` + `node:assert`).

Create `src/game/rules.ts` with pure functions extracted from their current homes (move the logic, call the function from the original spot — no behavior change):

| Function | Extract from | Test cases |
|---|---|---|
| `buzzBlockReason(wrongBuzzes, settings, now, othersAfterCount, otherEligibleCount)` | `useBuzzes.ts` | none-wrong → null; ≥ max_attempts → 'max_attempts'; within rebuzz_delay → 'delay'; delay elapsed → null; delay=0 & no other buzzed since → 'others'; delay=0 & another buzzed → null |
| `canAddTrack(myCount, otherCounts, settings)` / `canDeleteTrack(...)` | `Room.vue` (or `useGameFlow`) | equity off → true; solo player → true; at margin → false; under margin → true; delete at min → true; delete below min → false |
| `skipVotesNeeded(onlineCount, validatorOnline, trackSolvedAndPlaying)` | `Room.vue` | solved → all online; unsolved → online minus validator; floor 1 |
| `playerRatio(doneTracks, playerId)` | `Room.vue` | own tracks excluded from guessable; 0 guessable → ratio 0; ordering ties broken by guessed count (test `rankedPlayers` comparator too) |

Adapt signatures pragmatically — the goal is pure inputs (arrays/numbers), no refs, no `pb`. Keep the extracted functions' behavior byte-identical; the tests encode current behavior, not desired behavior. If a test reveals a genuine bug, flag it in the PR description instead of silently changing semantics.

Test file: `tests/unit/rules.test.ts`, wired into the existing `test:unit` script (make the script run both files: `node --experimental-strip-types --test tests/unit/` — `VERIFY:` the current script invokes the file directly; switching to `--test` directory mode must still run `autonomous.test.ts`'s assertions correctly).

Verification: `pnpm test:unit` green, `pnpm build` green, quick manual smoke of buzz blocking + equity in the app.

Commits:
1. `refactor(game): extract pure gameplay rules into rules.ts`
2. `test(game): unit-test buzz blocking, equity, skip threshold, scoring`
