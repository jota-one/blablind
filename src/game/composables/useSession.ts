import { ref, onMounted, onUnmounted } from 'vue'
import { pb } from '@game/pb'

export default function useSession(slug: string) {
  const session = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | undefined

  const load = async () => {
    try {
      session.value = await pb.collection('sessions').getFirstListItem(`slug="${slug}"`)
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
  })

  onUnmounted(() => unsubscribe?.())

  return { session, loading, error }
}
