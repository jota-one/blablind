import { ref, computed, watch, onUnmounted } from 'vue'
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

  const loadAndSubscribe = async (trackId: string) => {
    unsubscribe?.()
    unsubscribe = undefined
    buzzes.value = []

    const result = await pb.collection('buzzes').getFullList({
      filter: `track="${trackId}"`,
      sort: 'created',
    })
    buzzes.value = result

    unsubscribe = await pb.collection('buzzes').subscribe(
      '*',
      e => {
        if (e.action === 'create') {
          buzzes.value.push(e.record)
        } else if (e.action === 'update') {
          const idx = buzzes.value.findIndex(b => b.id === e.record.id)
          if (idx >= 0) {
            buzzes.value[idx] = e.record
          }
          if (e.record.status === 'correct') {
            solvedBuzz.value = e.record
          }
        }
      },
      { filter: `track="${trackId}"` },
    )
  }

  watch(
    currentTrackId,
    async newId => {
      if (newId) {
        await loadAndSubscribe(newId)
      } else {
        unsubscribe?.()
        buzzes.value = []
        solvedBuzz.value = null
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    unsubscribe?.()
    stopClock()
  })

  const buzz = (playerId: string, answer: string) =>
    pb.collection('buzzes').create({
      track: currentTrackId.value,
      player: playerId,
      answer,
      status: 'pending',
    })

  return { buzzes, activeBuzz, canBuzz, buzzBlockReason, rebuzzRemainingSeconds, remainingAttempts, buzz, solvedBuzz }
}
