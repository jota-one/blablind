import { ref, computed, onMounted, onUnmounted } from 'vue'
import { pb } from '@game/pb'
import { isOnline } from '@game/utils'
import type { PlayerRecord } from '@/types/records'

export default function usePlayers(sessionId: string) {
  const players = ref<PlayerRecord[]>([])
  const now = ref(Date.now())
  const onlinePlayers = computed(() => {
    now.value // dépendance réactive pour re-évaluer isOnline
    return players.value.filter(isOnline)
  })

  // Stable join order; ranking is derived from solved_by where displayed.
  const sort = () => players.value.sort((a, b) => a.created.localeCompare(b.created))

  const load = async () => {
    const result = await pb.collection('players').getFullList<PlayerRecord>({
      filter: pb.filter('session = {:session}', { session: sessionId }),
      sort: 'created',
    })
    players.value = result
  }

  let unsubscribe: (() => void) | undefined
  let unsubscribeReconnect: (() => void) | undefined
  let clockInterval: ReturnType<typeof setInterval>

  onMounted(async () => {
    await load()
    clockInterval = setInterval(() => {
      now.value = Date.now()
    }, 5_000)
    unsubscribe = await pb.collection('players').subscribe<PlayerRecord>(
      '*',
      e => {
        if (e.action === 'create') {
          players.value.push(e.record)
          sort()
        } else if (e.action === 'update') {
          const idx = players.value.findIndex(p => p.id === e.record.id)
          if (idx >= 0) players.value[idx] = e.record
          sort()
        } else if (e.action === 'delete') {
          players.value = players.value.filter(p => p.id !== e.record.id)
        }
      },
      { filter: pb.filter('session = {:session}', { session: sessionId }) },
    )
    // Reload on SSE reconnect to recover any missed update events (e.g. last_seen updates)
    unsubscribeReconnect = await pb.realtime.subscribe('PB_CONNECT', () => {
      load()
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
    unsubscribeReconnect?.()
    clearInterval(clockInterval)
  })

  return { players, onlinePlayers, load }
}
