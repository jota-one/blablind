import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { ComputedRef } from 'vue'
import { pb } from '@game/pb'

export default function useBuzzes(
  currentTrackId: ComputedRef<string | undefined>,
  currentPlayerId: string | undefined,
  otherEligibleCount: ComputedRef<number>,
  settings: ComputedRef<{ max_buzz_attempts: number; rebuzz_delay: number }>,
) {
  const buzzes = ref<any[]>([])
  const solvedBuzz = ref<any>(null)
  const now = ref(Date.now())
  let clockInterval: ReturnType<typeof setInterval> | null = null

  const startClock = () => {
    if (!clockInterval) {
      clockInterval = setInterval(() => {
        now.value = Date.now()
      }, 500)
    }
  }
  const stopClock = () => {
    if (clockInterval) {
      clearInterval(clockInterval)
      clockInterval = null
    }
  }

  const activeBuzz = computed(() => buzzes.value.find(b => b.status === 'pending') ?? null)

  const myWrongBuzzes = computed(() =>
    buzzes.value.filter(b => b.status === 'wrong' && b.player === currentPlayerId),
  )

  const buzzBlockReason = computed<'max_attempts' | 'delay' | 'others' | null>(() => {
    if (!currentPlayerId || activeBuzz.value) return null
    const wrong = myWrongBuzzes.value
    if (wrong.length === 0) return null

    if (wrong.length >= settings.value.max_buzz_attempts) return 'max_attempts'

    const lastWrong = wrong[wrong.length - 1]
    const delayMs = settings.value.rebuzz_delay * 1000
    if (delayMs > 0) {
      if (now.value - new Date(lastWrong.updated).getTime() < delayMs) return 'delay'
      return null
    }

    if (otherEligibleCount.value === 0) return null
    const othersAfter = buzzes.value.filter(
      b => b.player !== currentPlayerId && b.created > lastWrong.created,
    )
    if (othersAfter.length === 0) return 'others'
    return null
  })

  const canBuzz = computed(() => {
    if (!currentPlayerId) return false
    if (activeBuzz.value) return false
    return buzzBlockReason.value === null
  })

  const rebuzzRemainingSeconds = computed(() => {
    if (buzzBlockReason.value !== 'delay') return 0
    const wrong = myWrongBuzzes.value
    if (wrong.length === 0) return 0
    const lastWrong = wrong[wrong.length - 1]
    const elapsed = now.value - new Date(lastWrong.updated).getTime()
    return Math.max(0, Math.ceil((settings.value.rebuzz_delay * 1000 - elapsed) / 1000))
  })

  const remainingAttempts = computed(() =>
    Math.max(0, settings.value.max_buzz_attempts - myWrongBuzzes.value.length)
  )

  watch(myWrongBuzzes, wrong => {
    if (wrong.length > 0 && settings.value.rebuzz_delay > 0) {
      startClock()
    } else {
      stopClock()
    }
  })

  let unsubscribe: (() => void) | undefined
  let unsubscribeReconnect: (() => void) | undefined

  const loadAndSubscribe = async (trackId: string) => {
    unsubscribe?.()
    unsubscribe = undefined

    // requestKey null: concurrent loads (mount, reconnect, phase-change reload)
    // must not auto-cancel each other. The list is replaced only once the fetch
    // resolves — clearing it upfront would let watchers observe a transiently
    // empty list (e.g. the autonomous reconciler mistaking it for "no buzzes").
    const result = await pb.collection('buzzes').getFullList({
      filter: pb.filter('track = {:track}', { track: trackId }),
      sort: 'created',
      requestKey: null,
    })
    buzzes.value = result

    unsubscribe = await pb.collection('buzzes').subscribe(
      '*',
      e => {
        if (e.action === 'create') {
          // Guard against double-insert (e.g. event buffered across a reconnect reload)
          if (buzzes.value.some(b => b.id === e.record.id)) return
          buzzes.value.push(e.record)
        } else if (e.action === 'update') {
          const idx = buzzes.value.findIndex(b => b.id === e.record.id)
          if (idx >= 0) {
            buzzes.value[idx] = e.record
          }
          // Dedupe by id: redundant updates on the winning buzz (e.g. an
          // idempotent repair write) must not replay the solved animation.
          if (e.record.status === 'correct' && solvedBuzz.value?.id !== e.record.id) {
            solvedBuzz.value = e.record
          }
        }
      },
      { filter: pb.filter('track = {:track}', { track: trackId }) },
    )
  }

  watch(
    currentTrackId,
    async newId => {
      if (newId) {
        buzzes.value = []
        await loadAndSubscribe(newId)
      } else {
        unsubscribe?.()
        buzzes.value = []
        solvedBuzz.value = null
      }
    },
    { immediate: true },
  )

  // Reload the current track's buzzes on SSE reconnect to recover missed events
  onMounted(async () => {
    unsubscribeReconnect = await pb.realtime.subscribe('PB_CONNECT', () => {
      if (currentTrackId.value) {
        loadAndSubscribe(currentTrackId.value)
      }
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
    unsubscribeReconnect?.()
    stopClock()
  })

  const buzz = async (playerId: string, answer: string) => {
    const record = await pb.collection('buzzes').create({
      track: currentTrackId.value,
      player: playerId,
      answer,
      status: 'pending',
    })
    // Optimistic insert: right after page load the SSE subscription may not be
    // fully registered server-side yet, so the create event can be missed.
    if (!buzzes.value.some(b => b.id === record.id)) {
      buzzes.value.push(record)
    }
    return record
  }

  // Re-fetch from the server (recovers events missed during subscription setup)
  const reload = async () => {
    if (currentTrackId.value) {
      await loadAndSubscribe(currentTrackId.value)
    }
  }

  return { buzzes, activeBuzz, canBuzz, buzzBlockReason, rebuzzRemainingSeconds, remainingAttempts, buzz, solvedBuzz, reload }
}
