import { ref, computed, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { pb } from '@game/pb'
import { computeNextAction, voteThreshold } from '@game/autonomous'
import type { AutonomousAction, AutonomousSnapshot } from '@game/autonomous'

type UseAutonomousOptions = {
  session: ComputedRef<any>
  currentPlayerId: string
  onlinePlayers: ComputedRef<any[]>
  currentTrack: ComputedRef<any>
  queuedTracks: ComputedRef<any[]>
  doneTracks: ComputedRef<any[]>
  buzzes: Ref<any[]>
  votes: Ref<any[]>
  myVoteForBuzz: (buzzId: string, playerId: string) => any
  castAnswerVote: (buzzId: string, voterId: string, value: boolean) => Promise<void>
  buzz: (playerId: string, answer: string) => Promise<any>
  hasVotedToSkip: ComputedRef<boolean>
  cancelSkipVote: (trackId: string, playerId: string) => Promise<any>
  pausedByDuration: Ref<boolean>
  sessionSettings: ComputedRef<Record<string, any>>
  endSession: () => Promise<any> | any
  reloadBuzzes: () => Promise<void>
  reloadVotes: () => Promise<void>
}

export default function useAutonomous(options: UseAutonomousOptions) {
  const {
    session, currentPlayerId, onlinePlayers, currentTrack, queuedTracks, doneTracks,
    buzzes, votes, myVoteForBuzz, castAnswerVote, buzz, hasVotedToSkip, cancelSkipVote,
    pausedByDuration, sessionSettings, endSession, reloadBuzzes, reloadVotes,
  } = options

  const isAutonomous = computed(() => session.value?.mode === 'autonomous')
  const phase = computed<'guessing' | 'answering' | 'voting' | null>(
    () => (isAutonomous.value ? currentTrack.value?.phase || null : null),
  )
  const isHost = computed(() => session.value?.host === currentPlayerId)

  const effectiveWindowSeconds = computed(() =>
    currentTrack.value?.playback_duration || sessionSettings.value.default_playback_duration || 30,
  )

  // Buzz order = creation order (server timestamps, id as tiebreaker)
  const orderedCandidates = computed(() =>
    [...buzzes.value].sort((a, b) =>
      a.created === b.created ? (a.id < b.id ? -1 : 1) : a.created < b.created ? -1 : 1,
    ),
  )
  const myBuzz = computed(() => orderedCandidates.value.find(b => b.player === currentPlayerId) ?? null)
  const currentCandidate = computed(() => orderedCandidates.value.find(b => b.status === 'pending') ?? null)
  const candidateIndex = computed(() =>
    currentCandidate.value
      ? orderedCandidates.value.findIndex(b => b.id === currentCandidate.value.id) + 1
      : 0,
  )

  const canBuzzAutonomous = computed(() =>
    isAutonomous.value &&
    phase.value === 'guessing' &&
    !myBuzz.value &&
    !currentTrack.value?.solved_by &&
    !currentTrack.value?.skip_revealed,
  )

  // --- Voting ---

  const voterIds = computed(() => {
    if (!currentCandidate.value) return []
    return onlinePlayers.value.map(p => p.id).filter(id => id !== currentCandidate.value.player)
  })
  const yesNeeded = computed(() => voteThreshold(voterIds.value.length))
  const candidateVotes = computed(() => {
    if (!currentCandidate.value) return []
    return votes.value.filter(v => v.buzz === currentCandidate.value.id && voterIds.value.includes(v.voter))
  })
  const yesCount = computed(() => candidateVotes.value.filter(v => v.value).length)
  const noCount = computed(() => candidateVotes.value.length - yesCount.value)
  const iAmCandidate = computed(() => currentCandidate.value?.player === currentPlayerId)
  const myVoteOnCandidate = computed(() =>
    currentCandidate.value ? myVoteForBuzz(currentCandidate.value.id, currentPlayerId) : null,
  )
  const canVote = computed(() =>
    phase.value === 'voting' && !!currentCandidate.value && !iAmCandidate.value && !myVoteOnCandidate.value,
  )

  // --- Player actions ---

  // Remote mode: buzz first (locks the order), then type — the draft is saved
  // onto the same buzz record until the window closes.
  const myAnswerDraft = ref('')

  const buzzNow = async () => {
    if (!canBuzzAutonomous.value) return
    if (hasVotedToSkip.value && currentTrack.value) {
      await cancelSkipVote(currentTrack.value.id, currentPlayerId)
    }
    await buzz(currentPlayerId, '')
  }

  const saveMyAnswer = async () => {
    const mine = myBuzz.value
    const text = myAnswerDraft.value.trim()
    if (!mine || !text || mine.answer === text) return
    // requestKey null: blur + explicit save can fire back-to-back and must not
    // auto-cancel each other
    await pb.collection('buzzes').update(mine.id, { answer: text }, { requestKey: null })
  }

  // Flush a typed-but-unsaved answer when the window closes, and re-fetch
  // buzzes/votes: a client that buzzed right after page load may have missed
  // SSE events sent before its subscription was fully registered, and the
  // voting UI needs the complete candidate list.
  watch(phase, (newPhase, oldPhase) => {
    if (oldPhase === 'guessing' && newPhase && newPhase !== 'guessing') {
      saveMyAnswer()
    }
    if (newPhase === 'answering' || newPhase === 'voting') {
      reloadBuzzes().catch(() => {})
      reloadVotes().catch(() => {})
    }
    if (newPhase === 'guessing') {
      myAnswerDraft.value = ''
    }
  })

  const revealNow = async () => {
    if (phase.value !== 'answering' || !currentTrack.value) return
    await pb.collection('tracks').update(currentTrack.value.id, { phase: 'voting' })
  }

  const castVote = async (value: boolean) => {
    if (!canVote.value) return
    await castAnswerVote(currentCandidate.value.id, currentPlayerId, value)
  }

  // --- Host reconciler (level-triggered, idempotent) ---

  const snapshot = computed<AutonomousSnapshot>(() => ({
    sessionStatus: session.value?.status,
    irlMode: !!session.value?.irl_mode,
    paused: !!session.value?.paused,
    hasCurrentTrack: !!currentTrack.value,
    phase: phase.value,
    trackSolvedBy: currentTrack.value?.solved_by || null,
    trackSkipRevealed: !!currentTrack.value?.skip_revealed,
    windowElapsed: pausedByDuration.value,
    buzzes: orderedCandidates.value.map(b => ({ id: b.id, player: b.player, status: b.status })),
    votes: votes.value.map(v => ({ buzz: v.buzz, voter: v.voter, value: !!v.value })),
    onlinePlayerIds: onlinePlayers.value.map(p => p.id),
    queuedCount: queuedTracks.value.length,
    doneCount: doneTracks.value.length,
  }))

  let reconciling = false

  const execute = async (action: AutonomousAction) => {
    const trackId = currentTrack.value?.id
    switch (action.type) {
      case 'open-answering':
        await pb.collection('tracks').update(trackId, { phase: 'answering' })
        break
      case 'open-voting':
        await pb.collection('tracks').update(trackId, { phase: 'voting' })
        break
      case 'no-winner-reveal': {
        // "Nobody found it" is terminal — double-check against the server, the
        // local buzz cache may have missed create events (SSE registration race).
        await reloadBuzzes()
        if (buzzes.value.some(b => b.status === 'pending')) break
        await pb.collection('tracks').update(trackId, { skip_revealed: true, phase: null, skip_votes: [] })
        break
      }
      case 'resolve-correct':
        // Track first, buzz second: if the host dies in between, the repair
        // branch of computeNextAction completes the second write.
        await pb.collection('tracks').update(trackId, { solved_by: action.playerId, phase: null, skip_votes: [] })
        await pb.collection('buzzes').update(action.buzzId, { status: 'correct' })
        break
      case 'resolve-wrong':
        await pb.collection('buzzes').update(action.buzzId, { status: 'wrong' })
        break
      case 'repair-buzz':
        await pb.collection('buzzes').update(action.buzzId, { status: 'correct' })
        break
      case 'end-session':
        await endSession()
        break
    }
  }

  let recheckTimer: ReturnType<typeof setTimeout> | null = null

  const reconcile = async () => {
    if (!isAutonomous.value || !isHost.value || reconciling) return
    const action = computeNextAction(snapshot.value)
    if (!action) return
    reconciling = true
    try {
      await execute(action)
    } finally {
      reconciling = false
      // Realtime events landing while the lock was held were dropped by the
      // watcher; re-check once the local state has caught up. Idempotent
      // writes make a redundant re-execution harmless.
      if (recheckTimer) { clearTimeout(recheckTimer) }
      recheckTimer = setTimeout(() => { reconcile() }, 600)
    }
  }

  watch([snapshot, isHost], () => { reconcile() })

  return {
    isAutonomous,
    phase,
    effectiveWindowSeconds,
    orderedCandidates,
    myBuzz,
    currentCandidate,
    candidateIndex,
    canBuzzAutonomous,
    voterIds,
    yesNeeded,
    yesCount,
    noCount,
    iAmCandidate,
    myVoteOnCandidate,
    canVote,
    myAnswerDraft,
    buzzNow,
    saveMyAnswer,
    revealNow,
    castVote,
  }
}
