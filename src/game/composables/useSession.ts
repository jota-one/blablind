import { ref, onMounted, onUnmounted } from 'vue'
import { pb } from '@game/pb'

export default function useSession(slug: string) {
  const session = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | undefined
  let unsubscribeReconnect: (() => void) | undefined

  const load = async () => {
    try {
      session.value = await pb.collection('sessions').getFirstListItem(pb.filter('slug = {:slug}', { slug }))
    } catch {
      error.value = 'app.error_not_found'
    } finally {
      loading.value = false
    }
  }

  const subscribe = async () => {
    if (!session.value) return
    unsubscribe = await pb.collection('sessions').subscribe(session.value.id, e => {
      if (e.action === 'update') session.value = e.record
    })
  }

  onMounted(async () => {
    await load()
    await subscribe()
    // Reload on SSE reconnect to recover any missed session updates (e.g. irl_mode changes)
    unsubscribeReconnect = await pb.realtime.subscribe('PB_CONNECT', () => {
      load()
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
    unsubscribeReconnect?.()
  })

  return { session, loading, error }
}
