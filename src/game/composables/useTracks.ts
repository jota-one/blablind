import { ref, computed, onMounted, onUnmounted } from 'vue'
import { pb } from '@game/pb'
import { normalizeSearch } from '@game/utils'

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
      expand: 'video',
    })
    tracks.value = result
  }

  const findOrCreateVideo = async (data: {
    video_id: string
    title?: string
    artist?: string
    duration?: number
  }) => {
    const existing = await pb.collection('videos').getList(1, 1, {
      filter: `video_id="${data.video_id}"`,
    })
    if (existing.items.length > 0) return existing.items[0]
    try {
      return await pb.collection('videos').create({
        video_id: data.video_id,
        title: data.title,
        artist: data.artist,
        duration: data.duration,
        search_text: normalizeSearch(`${data.title ?? ''} ${data.artist ?? ''}`),
      })
    } catch {
      // Race condition: another client created it first
      const retry = await pb.collection('videos').getList(1, 1, {
        filter: `video_id="${data.video_id}"`,
      })
      return retry.items[0]
    }
  }

  const addTrack = async (data: {
    video_id: string
    title?: string
    artist?: string
    duration?: number
    start_seconds: number
    added_by: string
  }) => {
    const video = await findOrCreateVideo(data)
    const maxOrder = tracks.value.reduce((max, t) => Math.max(max, t.order ?? 0), 0)
    return pb.collection('tracks').create({
      session: sessionId,
      video: video.id,
      start_seconds: data.start_seconds,
      added_by: data.added_by,
      status: 'queued',
      order: maxOrder + 1,
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
    unsubscribe = await pb.collection('tracks').subscribe('*', async e => {
      if (e.action === 'create') {
        const full = await pb.collection('tracks').getOne(e.record.id, { expand: 'video' })
        tracks.value.push(full)
        sort()
      } else if (e.action === 'update') {
        const full = await pb.collection('tracks').getOne(e.record.id, { expand: 'video' })
        const idx = tracks.value.findIndex(t => t.id === e.record.id)
        if (idx >= 0) tracks.value[idx] = full
        sort()
      } else if (e.action === 'delete') {
        tracks.value = tracks.value.filter(t => t.id !== e.record.id)
      }
    }, { filter: `session="${sessionId}"` })
  })

  onUnmounted(() => unsubscribe?.())

  return { tracks, currentTrack, queuedTracks, addTrack, playTrack, finishTrack, voteToSkip }
}
