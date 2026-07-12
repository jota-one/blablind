import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { ComputedRef } from 'vue'
import { pb } from '@game/pb'

// Peer votes on candidate answers (autonomous mode). One record per
// (buzz, voter) — enforced by a unique index — so there is no concurrent-write
// clobbering and no server hook is needed.
export default function useAnswerVotes(currentTrackId: ComputedRef<string | undefined>) {
  const votes = ref<any[]>([])

  let unsubscribe: (() => void) | undefined
  let unsubscribeReconnect: (() => void) | undefined

  const loadAndSubscribe = async (trackId: string) => {
    unsubscribe?.()
    unsubscribe = undefined

    // requestKey null: concurrent loads (mount, reconnect, phase-change reload)
    // must not auto-cancel each other. The list is replaced only once the fetch
    // resolves — clearing it upfront would let watchers observe a transiently
    // empty list.
    const result = await pb.collection('answer_votes').getFullList({
      filter: pb.filter('track = {:track}', { track: trackId }),
      sort: 'created',
      requestKey: null,
    })
    votes.value = result

    unsubscribe = await pb.collection('answer_votes').subscribe(
      '*',
      e => {
        if (e.action === 'create') {
          // Guard against double-insert (e.g. event buffered across a reconnect reload)
          if (votes.value.some(v => v.id === e.record.id)) return
          votes.value.push(e.record)
        }
      },
      { filter: pb.filter('track = {:track}', { track: trackId }) },
    )
  }

  watch(
    currentTrackId,
    async newId => {
      if (newId) {
        votes.value = []
        await loadAndSubscribe(newId)
      } else {
        unsubscribe?.()
        votes.value = []
      }
    },
    { immediate: true },
  )

  // Reload the current track's votes on SSE reconnect to recover missed events
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
  })

  const myVoteForBuzz = (buzzId: string, playerId: string) =>
    votes.value.find(v => v.buzz === buzzId && v.voter === playerId) ?? null

  // Re-fetch from the server (recovers events missed during subscription setup)
  const reload = async () => {
    if (currentTrackId.value) {
      await loadAndSubscribe(currentTrackId.value)
    }
  }

  const castVote = async (buzzId: string, voterId: string, value: boolean) => {
    try {
      await pb.collection('answer_votes').create({
        buzz: buzzId,
        voter: voterId,
        track: currentTrackId.value,
        value,
      })
    } catch {
      // Unique index (buzz, voter): a double-tap already recorded this vote
    }
  }

  return { votes, myVoteForBuzz, castVote, reload }
}
