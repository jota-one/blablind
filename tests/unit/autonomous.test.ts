import { computeNextAction, voteThreshold } from '../../src/game/autonomous.ts'
import type { AutonomousSnapshot } from '../../src/game/autonomous.ts'

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

const base = (over: Partial<AutonomousSnapshot>): AutonomousSnapshot => ({
  sessionStatus: 'playing',
  irlMode: false,
  paused: false,
  hasCurrentTrack: true,
  phase: 'guessing',
  trackSolvedBy: null,
  trackSkipRevealed: false,
  windowElapsed: false,
  buzzes: [],
  votes: [],
  onlinePlayerIds: ['a', 'b', 'c'],
  queuedCount: 2,
  doneCount: 0,
  ...over,
})

// Threshold math (roadmap: 5 voters → 3, 2 voters → 1)
check('threshold 5', voteThreshold(5), 3)
check('threshold 2', voteThreshold(2), 1)
check('threshold 4', voteThreshold(4), 2)
check('threshold 0', voteThreshold(0), 1)

// Guessing
check('guessing, window open', computeNextAction(base({})), null)
check('guessing, paused', computeNextAction(base({ windowElapsed: true, paused: true })), null)
check('guessing, window end, no buzz', computeNextAction(base({ windowElapsed: true })), { type: 'no-winner-reveal' })
check('guessing, window end, buzz, remote', computeNextAction(base({
  windowElapsed: true,
  buzzes: [{ id: 'b1', player: 'a', status: 'pending' }],
})), { type: 'open-voting' })
check('guessing, window end, buzz, irl', computeNextAction(base({
  windowElapsed: true,
  irlMode: true,
  buzzes: [{ id: 'b1', player: 'a', status: 'pending' }],
})), { type: 'open-answering' })
check('guessing, all online buzzed (early close)', computeNextAction(base({
  buzzes: [
    { id: 'b1', player: 'a', status: 'pending' },
    { id: 'b2', player: 'b', status: 'pending' },
    { id: 'b3', player: 'c', status: 'pending' },
  ],
})), { type: 'open-voting' })

// Answering: human trigger only
check('answering waits', computeNextAction(base({ phase: 'answering', windowElapsed: true, buzzes: [{ id: 'b1', player: 'a', status: 'pending' }] })), null)

// Voting: 3 players, candidate a → 2 voters (b, c), 1 yes suffices
const votingBase = base({
  phase: 'voting',
  windowElapsed: true,
  buzzes: [
    { id: 'b1', player: 'a', status: 'pending' },
    { id: 'b2', player: 'b', status: 'pending' },
  ],
})
check('voting, no votes yet', computeNextAction(votingBase), null)
check('voting, 1 yes of 2 voters → correct', computeNextAction({
  ...votingBase,
  votes: [{ buzz: 'b1', voter: 'b', value: true }],
}), { type: 'resolve-correct', buzzId: 'b1', playerId: 'a' })
check('voting, 1 no → still open (yes reachable)', computeNextAction({
  ...votingBase,
  votes: [{ buzz: 'b1', voter: 'b', value: false }],
}), null)
check('voting, 2 no → wrong', computeNextAction({
  ...votingBase,
  votes: [
    { buzz: 'b1', voter: 'b', value: false },
    { buzz: 'b1', voter: 'c', value: false },
  ],
}), { type: 'resolve-wrong', buzzId: 'b1' })
check('voting, candidate own vote ignored', computeNextAction({
  ...votingBase,
  votes: [{ buzz: 'b1', voter: 'a', value: true }],
}), null)
check('voting, next candidate after rejection', computeNextAction({
  ...votingBase,
  buzzes: [
    { id: 'b1', player: 'a', status: 'wrong' },
    { id: 'b2', player: 'b', status: 'pending' },
  ],
  votes: [{ buzz: 'b2', voter: 'a', value: true }],
}), { type: 'resolve-correct', buzzId: 'b2', playerId: 'b' })
check('voting, all rejected → no winner', computeNextAction({
  ...votingBase,
  buzzes: [
    { id: 'b1', player: 'a', status: 'wrong' },
    { id: 'b2', player: 'b', status: 'wrong' },
  ],
}), { type: 'no-winner-reveal' })

// 6 players: 5 voters, need 3
const six = base({
  phase: 'voting',
  onlinePlayerIds: ['a', 'b', 'c', 'd', 'e', 'f'],
  buzzes: [{ id: 'b1', player: 'a', status: 'pending' }],
})
check('6p, 2 yes → open', computeNextAction({
  ...six,
  votes: [
    { buzz: 'b1', voter: 'b', value: true },
    { buzz: 'b1', voter: 'c', value: true },
  ],
}), null)
check('6p, 3 yes → correct', computeNextAction({
  ...six,
  votes: [
    { buzz: 'b1', voter: 'b', value: true },
    { buzz: 'b1', voter: 'c', value: true },
    { buzz: 'b1', voter: 'd', value: true },
  ],
}), { type: 'resolve-correct', buzzId: 'b1', playerId: 'a' })
check('6p, 3 no → wrong (yes unreachable: max 2 < 3)', computeNextAction({
  ...six,
  votes: [
    { buzz: 'b1', voter: 'b', value: false },
    { buzz: 'b1', voter: 'c', value: false },
    { buzz: 'b1', voter: 'd', value: false },
  ],
}), { type: 'resolve-wrong', buzzId: 'b1' })

// Repair: solved_by set, winning buzz still pending
check('repair pending winner', computeNextAction(base({
  phase: null,
  trackSolvedBy: 'a',
  buzzes: [{ id: 'b1', player: 'a', status: 'pending' }],
})), { type: 'repair-buzz', buzzId: 'b1' })
check('repaired → idle', computeNextAction(base({
  phase: null,
  trackSolvedBy: 'a',
  buzzes: [{ id: 'b1', player: 'a', status: 'correct' }],
})), null)

// Auto-end
check('between tracks, queue left → idle', computeNextAction(base({ hasCurrentTrack: false, queuedCount: 1, doneCount: 1 })), null)
check('queue empty, done > 0 → end', computeNextAction(base({ hasCurrentTrack: false, queuedCount: 0, doneCount: 3 })), { type: 'end-session' })
check('waiting session → idle', computeNextAction(base({ sessionStatus: 'waiting', hasCurrentTrack: false, queuedCount: 0, doneCount: 3 })), null)

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
