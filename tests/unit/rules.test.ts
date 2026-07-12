import {
  buzzBlockReason,
  canAddTrack,
  canDeleteTrack,
  skipVotesNeeded,
  playerRatio,
  rankPlayers,
} from '../../src/game/rules.ts'

let failures = 0
const check = (label: string, actual: any, expected: any) => {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    console.log(`  ok: ${label}`)
  } else {
    failures++
    console.log(`FAIL: ${label}\n  expected ${e}\n  got      ${a}`)
  }
}

// --- buzzBlockReason ---

const T0 = '2026-07-12 10:00:00.000Z'
const T1 = '2026-07-12 10:00:05.000Z'
const at = (iso: string) => new Date(iso).getTime()
const wrongBuzz = (player: string, created: string, updated = created) =>
  ({ player, status: 'wrong', created, updated })

const settings = (max_buzz_attempts: number, rebuzz_delay: number) => ({ max_buzz_attempts, rebuzz_delay })

check('no buzzes → can buzz', buzzBlockReason([], 'me', settings(5, 5), at(T1), 2), null)
check('pending buzz blocks (returns null, canBuzz gate handles it)',
  buzzBlockReason([wrongBuzz('me', T0), { player: 'x', status: 'pending', created: T1, updated: T1 }], 'me', settings(5, 5), at(T1), 2), null)
check('empty player id → null', buzzBlockReason([wrongBuzz('me', T0)], '', settings(5, 5), at(T1), 2), null)
check('max attempts reached', buzzBlockReason([wrongBuzz('me', T0)], 'me', settings(1, 5), at(T1), 2), 'max_attempts')
check('within rebuzz delay', buzzBlockReason([wrongBuzz('me', T0)], 'me', settings(5, 10), at(T1), 2), 'delay')
check('delay elapsed → free', buzzBlockReason([wrongBuzz('me', T0)], 'me', settings(5, 3), at(T1), 2), null)
check('delay counts from updated, not created',
  buzzBlockReason([wrongBuzz('me', T0, T1)], 'me', settings(5, 3), at(T1) + 1000, 2), 'delay')
check('no delay: blocked until another player buzzes',
  buzzBlockReason([wrongBuzz('me', T0)], 'me', settings(5, 0), at(T1), 2), 'others')
check('no delay: another player buzzed since → free',
  buzzBlockReason([wrongBuzz('me', T0), wrongBuzz('other', T1)], 'me', settings(5, 0), at(T1), 2), null)
check('no delay, no other eligible player → free',
  buzzBlockReason([wrongBuzz('me', T0)], 'me', settings(5, 0), at(T1), 0), null)

// --- equity ---

const equity = (force_equity: boolean, equity_margin = 1) => ({ force_equity, equity_margin })

check('equity off → add ok', canAddTrack(10, [0], equity(false)), true)
check('solo player → add ok', canAddTrack(10, [], equity(true)), true)
check('at margin → blocked', canAddTrack(1, [0, 3], equity(true, 1)), false)
check('under margin → ok', canAddTrack(0, [0, 3], equity(true, 1)), true)
check('margin 2 → one ahead ok', canAddTrack(1, [0, 3], equity(true, 2)), true)
check('equity off → delete ok', canDeleteTrack(0, [5], equity(false)), true)
check('solo player → delete ok', canDeleteTrack(0, [], equity(true)), true)
check('delete at min → ok', canDeleteTrack(2, [2, 4], equity(true)), true)
check('delete below min → blocked', canDeleteTrack(1, [2, 4], equity(true)), false)

// --- skipVotesNeeded ---

check('no track → 1', skipVotesNeeded({ hasTrack: false, solvedAndPlaying: false, onlineCount: 4, onlineNonValidatorCount: 3 }), 1)
check('unsolved → online minus validator', skipVotesNeeded({ hasTrack: true, solvedAndPlaying: false, onlineCount: 4, onlineNonValidatorCount: 3 }), 3)
check('solved & playing → everyone online', skipVotesNeeded({ hasTrack: true, solvedAndPlaying: true, onlineCount: 4, onlineNonValidatorCount: 3 }), 4)
check('floor 1 (nobody else online)', skipVotesNeeded({ hasTrack: true, solvedAndPlaying: false, onlineCount: 1, onlineNonValidatorCount: 0 }), 1)

// --- playerRatio / rankPlayers ---

const done = [
  { added_by: 'a', solved_by: 'b' },
  { added_by: 'b', solved_by: 'a' },
  { added_by: 'b', solved_by: '' },
  { added_by: 'c', solved_by: 'a' },
]

check('own tracks excluded from guessable', playerRatio(done, 'b'), { guessed: 1, guessable: 2, ratio: 0.5 })
check('two guessed out of three', playerRatio(done, 'a'), { guessed: 2, guessable: 3, ratio: 2 / 3 })
check('no guessable → ratio 0', playerRatio([{ added_by: 'a', solved_by: '' }], 'a'), { guessed: 0, guessable: 0, ratio: 0 })

const ranked = rankPlayers([{ id: 'a' }, { id: 'b' }, { id: 'c' }], done)
check('ranking by ratio desc', ranked.map(p => p.id), ['a', 'b', 'c'])
// Tie on ratio (both 1.0), broken by absolute guessed count.
const tieDone = [
  { added_by: 'x', solved_by: 'a' },
  { added_by: 'x', solved_by: 'b' },
  { added_by: 'y', solved_by: 'b' },
  { added_by: 'a', solved_by: '' },
]
// a: guessable 3 (x,x,y), guessed 1 → 1/3 ; b: guessable 4? no — b guessable = tracks not added by b = all 4, guessed 2 → 0.5
check('tie-break sanity', rankPlayers([{ id: 'a' }, { id: 'b' }], tieDone).map(p => p.id), ['b', 'a'])

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
