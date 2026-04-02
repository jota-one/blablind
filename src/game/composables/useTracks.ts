import { ref, computed, onMounted, onUnmounted } from 'vue'
import { pb } from '@game/pb'

export default function useTracks(sessionId: string) {
  const tracks = ref<any[]>([])
  const currentTrack = computed(() => tracks.value.find(t => t.status === 'playing') ?? null)
  const queuedTracks = computed(() =>
    tracks.value.filter(t => t.status === 'queued').sort((a, b) => a.order - b.order),
  )

  const sort = () => tracks.value.sort((a, b) => a.order - b.order)

  const load = async () => {
    const result = await pb.collection('tracks').getFullList({
      filter: `session="${sessionId}"`,
      sort: 'order,created',
    })
    tracks.value = result
  }

  const addTrack = async (data: {
    youtube_url: string
    start_seconds: number
    title?: string
    artist?: string
    added_by: string
  }) => {
    const maxOrder = tracks.value.reduce((max, t) => Math.max(max, t.order ?? 0), 0)
    return pb.collection('tracks').create({
      session: sessionId,
      status: 'queued',
      order: maxOrder + 1,
      ...data,
    })
  }

  const playTrack = async (trackId: string) => {
    const playing = tracks.value.find(t => t.status === 'playing')
    if (playing) await pb.collection('tracks').update(playing.id, { status: 'done' })
    await pb.collection('tracks').update(trackId, { status: 'playing' })
  }

  const finishTrack = async (trackId: string) => {
    await pb.collection('tracks').update(trackId, { status: 'done' })
  }

  const voteToSkip = async (trackId: string, playerId: string) => {
    const track = tracks.value.find(t => t.id === trackId)
    if (!track) return
    const current: string[] = Array.isArray(track.skip_votes) ? track.skip_votes : []
    if (current.includes(playerId)) return
    await pb.collection('tracks').update(trackId, { skip_votes: [...current, playerId] })
  }

  let unsubscribe: (() => void) | undefined

  onMounted(async () => {
    await load()
    unsubscribe = await pb.collection('tracks').subscribe('*', e => {
      if (e.action === 'create') {
        tracks.value.push(e.record)
        sort()
      } else if (e.action === 'update') {
        const idx = tracks.value.findIndex(t => t.id === e.record.id)
        if (idx >= 0) tracks.value[idx] = e.record
        sort()
      } else if (e.action === 'delete') {
        tracks.value = tracks.value.filter(t => t.id !== e.record.id)
      }
    }, { filter: `session="${sessionId}"` })
  })

  onUnmounted(() => unsubscribe?.())

  return { tracks, currentTrack, queuedTracks, addTrack, playTrack, finishTrack, voteToSkip }
}
