import { ref, onMounted, onUnmounted } from 'vue'
import { pb } from '@game/pb'

export default function usePlayers(sessionId: string) {
  const players = ref<any[]>([])

  const sort = () => players.value.sort((a, b) => b.score - a.score)

  const load = async () => {
    const result = await pb.collection('players').getFullList({
      filter: `session="${sessionId}"`,
      sort: '-score',
    })
    players.value = result
  }

  let unsubscribe: (() => void) | undefined

  onMounted(async () => {
    await load()
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

  onUnmounted(() => unsubscribe?.())

  return { players, load }
}
