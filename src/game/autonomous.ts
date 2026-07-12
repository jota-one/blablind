// Pure decision logic for autonomous mode. The host client feeds it a snapshot
// of the persisted game state and executes the returned action (PocketBase
// writes). Level-triggered: a newly elected host recomputes everything from
// this snapshot, so host handoff and SSE reconnects recover mid-phase.

export type AutonomousPhase = 'guessing' | 'answering' | 'voting' | null

export type AutonomousSnapshot = {
  sessionStatus: string
  irlMode: boolean
  paused: boolean
  hasCurrentTrack: boolean
  phase: AutonomousPhase
  trackSolvedBy: string | null
  trackSkipRevealed: boolean
  windowElapsed: boolean
  // Sorted by (created, id) — the buzz order
  buzzes: { id: string; player: string; status: string }[]
  // One record per (buzz, voter), enforced by a unique index
  votes: { buzz: string; voter: string; value: boolean }[]
  onlinePlayerIds: string[]
  queuedCount: number
  doneCount: number
}

export type AutonomousAction =
  | { type: 'open-answering' }
  | { type: 'open-voting' }
  | { type: 'no-winner-reveal' }
  | { type: 'resolve-correct'; buzzId: string; playerId: string }
  | { type: 'resolve-wrong'; buzzId: string }
  | { type: 'repair-buzz'; buzzId: string }
  | { type: 'end-session' }

export const voteThreshold = (voterCount: number) => Math.max(1, Math.ceil(voterCount / 2))

export const computeNextAction = (s: AutonomousSnapshot): AutonomousAction | null => {
  if (s.sessionStatus !== 'playing') return null

  // Auto-end: queue exhausted and the last track is done
  if (!s.hasCurrentTrack) {
    if (s.queuedCount === 0 && s.doneCount > 0) return { type: 'end-session' }
    return null
  }

  // Crash repair: resolution writes tracks first, buzzes second. If the host
  // died in between, solved_by is set but the winning buzz is still pending.
  if (s.trackSolvedBy) {
    const winning = s.buzzes.find(b => b.player === s.trackSolvedBy && b.status === 'pending')
    if (winning) return { type: 'repair-buzz', buzzId: winning.id }
    return null
  }

  if (s.phase === 'guessing') {
    if (s.paused) return null
    const allOnlineBuzzed =
      s.onlinePlayerIds.length > 0 &&
      s.onlinePlayerIds.every(id => s.buzzes.some(b => b.player === id))
    if (!s.windowElapsed && !allOnlineBuzzed) return null
    if (s.buzzes.length === 0) return { type: 'no-winner-reveal' }
    return s.irlMode ? { type: 'open-answering' } : { type: 'open-voting' }
  }

  // 'answering' advances on a human tap ("Révéler"), never by the reconciler.

  if (s.phase === 'voting') {
    const candidate = s.buzzes.find(b => b.status === 'pending')
    if (!candidate) return { type: 'no-winner-reveal' }

    const voterIds = s.onlinePlayerIds.filter(id => id !== candidate.player)
    const yesNeeded = voteThreshold(voterIds.length)
    const candidateVotes = s.votes.filter(v => v.buzz === candidate.id && voterIds.includes(v.voter))
    const yes = candidateVotes.filter(v => v.value).length
    const no = candidateVotes.length - yes

    if (yes >= yesNeeded) {
      return { type: 'resolve-correct', buzzId: candidate.id, playerId: candidate.player }
    }
    const yesUnreachable = no > voterIds.length - yesNeeded
    const allVoted = candidateVotes.length >= voterIds.length
    if (yesUnreachable || allVoted) {
      return { type: 'resolve-wrong', buzzId: candidate.id }
    }
  }

  return null
}
