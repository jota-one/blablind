import { ref, computed, watch, onUnmounted } from 'vue'
import type { ComputedRef } from 'vue'
import { pb } from '@game/pb'

export default function useBuzzes(
  currentTrackId: ComputedRef<string | undefined>,
  currentPlayerId: string | undefined,
  otherEligibleCount: ComputedRef<number>,
) {
  const buzzes = ref<any[]>([])
  const solvedBuzz = ref<any>(null)

  const activeBuzz = computed(() => buzzes.value.find(b => b.status === 'pending') ?? null)

  const canBuzz = computed(() => {
    if (activeBuzz.value) return false
    if (!currentPlayerId) return false

    const myWrong = buzzes.value.filter(b => b.status === 'wrong' && b.player === currentPlayerId)
    if (myWrong.length === 0) return true
    if (otherEligibleCount.value === 0) return true

    const lastWrong = myWrong[myWrong.length - 1]
    const othersAfter = buzzes.value.filter(
      b => b.player !== currentPlayerId && b.created > lastWrong.created,
    )
    return othersAfter.length > 0
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
          if (idx >= 0) buzzes.value[idx] = e.record
          if (e.record.status === 'correct') solvedBuzz.value = e.record
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

  onUnmounted(() => unsubscribe?.())

  const buzz = (playerId: string, answer: string) =>
    pb.collection('buzzes').create({
      track: currentTrackId.value,
      player: playerId,
      answer,
      status: 'pending',
    })

  return { buzzes, activeBuzz, canBuzz, buzz, solvedBuzz }
}
