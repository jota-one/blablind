import { ref, computed, onMounted, onUnmounted } from 'vue'
import { pb } from '@game/pb'
import { isOnline } from '@game/utils'

export default function usePlayers(sessionId: string) {
  const players = ref<any[]>([])
  const now = ref(Date.now())
  const onlinePlayers = computed(() => {
    now.value // dépendance réactive pour re-évaluer isOnline
    return players.value.filter(isOnline)
  })

  const sort = () => players.value.sort((a, b) => b.score - a.score)

  const load = async () => {
    const result = await pb.collection('players').getFullList({
      filter: `session="${sessionId}"`,
      sort: '-score',
    })
    players.value = result
  }

  let unsubscribe: (() => void) | undefined
  let clockInterval: ReturnType<typeof setInterval>

  onMounted(async () => {
    await load()
    clockInterval = setInterval(() => { now.value = Date.now() }, 5_000)
    unsubscribe = await pb.collection('players').subscribe('*', e => {
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
    }, { filter: `session="${sessionId}"` })
  })

  onUnmounted(() => {
    unsubscribe?.()
    clearInterval(clockInterval)
  })

  return { players, onlinePlayers, load }
}
