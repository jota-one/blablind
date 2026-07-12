// Pure gameplay rules, extracted from useBuzzes/Room.vue so they can be
// unit-tested without Vue reactivity or PocketBase (same philosophy as
// autonomous.ts). Behavior must stay byte-identical with the original call
// sites — these functions encode current semantics, not desired ones.

export type BuzzBlockReason = 'max_attempts' | 'delay' | 'others' | null

type BuzzLike = { player: string; status: string; created: string; updated: string }

// Why a player currently can't buzz, or null if they can.
// - An active (pending) buzz blocks everyone.
// - Too many wrong attempts blocks for the rest of the track.
// - With a rebuzz delay, a wrong buzz blocks until the delay elapses.
// - Without a delay, a wrong buzz blocks until another player buzzes (unless
//   there is no other eligible player).
export const buzzBlockReason = (
  buzzes: BuzzLike[],
  playerId: string,
  settings: { max_buzz_attempts: number; rebuzz_delay: number },
  nowMs: number,
  otherEligibleCount: number,
): BuzzBlockReason => {
  if (!playerId || buzzes.some(b => b.status === 'pending')) {
    return null
  }
  const wrong = buzzes.filter(b => b.status === 'wrong' && b.player === playerId)
  if (wrong.length === 0) {
    return null
  }

  if (wrong.length >= settings.max_buzz_attempts) {
    return 'max_attempts'
  }

  const lastWrong = wrong[wrong.length - 1]
  const delayMs = settings.rebuzz_delay * 1000
  if (delayMs > 0) {
    if (nowMs - new Date(lastWrong.updated).getTime() < delayMs) {
      return 'delay'
    }
    return null
  }

  if (otherEligibleCount === 0) {
    return null
  }
  const othersAfter = buzzes.filter(b => b.player !== playerId && b.created > lastWrong.created)
  if (othersAfter.length === 0) {
    return 'others'
  }
  return null
}

export type EquitySettings = { force_equity: boolean; equity_margin: number }

// Track equity: a player may queue a new track as long as they stay within
// equity_margin of the least-stocked other online player.
export const canAddTrack = (myCount: number, otherCounts: number[], settings: EquitySettings): boolean => {
  if (!settings.force_equity) {
    return true
  }
  if (otherCounts.length === 0) {
    return true
  }
  return myCount < Math.min(...otherCounts) + settings.equity_margin
}

// Deleting is the mirror: allowed as long as the player doesn't drop below the
// least-stocked other online player.
export const canDeleteTrack = (myCount: number, otherCounts: number[], settings: EquitySettings): boolean => {
  if (!settings.force_equity) {
    return true
  }
  if (otherCounts.length === 0) {
    return true
  }
  return myCount >= Math.min(...otherCounts)
}

// Votes required to skip the current track. Before the reveal the validator
// doesn't vote; after a reveal (solved/skip_revealed still playing) everyone
// online must agree to move on.
export const skipVotesNeeded = (args: {
  hasTrack: boolean
  solvedAndPlaying: boolean
  onlineCount: number
  onlineNonValidatorCount: number
}): number => {
  if (!args.hasTrack) {
    return 1
  }
  if (args.solvedAndPlaying) {
    return Math.max(1, args.onlineCount)
  }
  return Math.max(1, args.onlineNonValidatorCount)
}

type DoneTrackLike = { added_by: string; solved_by: string }

// Ratio-based score: guessed / guessable, where a player's own tracks are not
// guessable by them.
export const playerRatio = (doneTracks: DoneTrackLike[], playerId: string) => {
  const guessable = doneTracks.filter(t => t.added_by !== playerId).length
  const guessed = doneTracks.filter(t => t.solved_by === playerId).length
  return { guessed, guessable, ratio: guessable > 0 ? guessed / guessable : 0 }
}

// Leaderboard order: ratio desc, ties broken by absolute guessed count desc.
export const rankPlayers = <T extends { id: string }>(players: T[], doneTracks: DoneTrackLike[]): T[] =>
  [...players].sort((a, b) => {
    const ra = playerRatio(doneTracks, a.id)
    const rb = playerRatio(doneTracks, b.id)
    if (rb.ratio !== ra.ratio) {
      return rb.ratio - ra.ratio
    }
    return rb.guessed - ra.guessed
  })
