import { ref, computed, onMounted, onUnmounted } from 'vue'
import { pb } from '@game/pb'
import { findOrCreateVideo } from '@game/composables/useVideos'
import type { TrackRecord } from '@/types/records'

export default function useTracks(sessionId: string) {
  const tracks = ref<TrackRecord[]>([])
  const currentTrack = computed(() => tracks.value.find(t => t.status === 'playing') ?? null)
  const queuedTracks = computed(() =>
    tracks.value.filter(t => t.status === 'queued').sort((a, b) => a.order - b.order),
  )

  const sort = () => tracks.value.sort((a, b) => a.order - b.order)

  const load = async () => {
    const result = await pb.collection('tracks').getFullList<TrackRecord>({
      filter: pb.filter('session = {:session}', { session: sessionId }),
      sort: 'order,created',
      expand: 'video',
    })
    tracks.value = result
  }

  const addTrack = async (data: {
    video_id: string
    title?: string
    artist?: string
    duration?: number
    start_seconds: number
    playback_duration?: number
    reveal_seconds?: number
    added_by: string
  }) => {
    const video = await findOrCreateVideo(data)
    const maxOrder = tracks.value.reduce((max, t) => Math.max(max, t.order ?? 0), 0)
    return pb.collection('tracks').create({
      session: sessionId,
      video: video.id,
      start_seconds: data.start_seconds,
      playback_duration: data.playback_duration || null,
      reveal_seconds: data.reveal_seconds ?? null,
      added_by: data.added_by,
      status: 'queued',
      order: maxOrder + 1,
    })
  }

  const playTrack = async (trackId: string, extra?: Record<string, any>) => {
    const playing = tracks.value.find(t => t.status === 'playing')
    if (playing) await pb.collection('tracks').update(playing.id, { status: 'done' })
    const record = await pb.collection('tracks').update(trackId, { status: 'playing', ...extra })
    // started_at snapshots the server-side timestamp of the playing transition
    // (updated is overwritten by later writes, so it can't serve as reference).
    // Server clock domain — comparable to buzzes.created for buzz timings.
    await pb.collection('tracks').update(trackId, { started_at: record.updated })
  }

  const finishTrack = async (trackId: string) => {
    await pb.collection('tracks').update(trackId, { status: 'done' })
  }

  // Atomic toggle server-side (see pb/pb_hooks/skip_vote.pb.js) so two players
  // voting at the same time can't clobber each other's vote.
  const voteToSkip = (trackId: string, playerId: string) =>
    pb.send('/api/skip-vote', { method: 'POST', body: { trackId, playerId, action: 'add' } })

  const cancelSkipVote = (trackId: string, playerId: string) =>
    pb.send('/api/skip-vote', { method: 'POST', body: { trackId, playerId, action: 'remove' } })

  const deleteTrack = (trackId: string) => pb.collection('tracks').delete(trackId)

  let unsubscribe: (() => void) | undefined
  let unsubscribeReconnect: (() => void) | undefined

  onMounted(async () => {
    await load()
    // expand 'video' is applied server-side to the realtime payload, so e.record
    // already carries the relation — no per-event getOne needed.
    unsubscribe = await pb.collection('tracks').subscribe<TrackRecord>('*', e => {
      if (e.action === 'create') {
        // Guard against double-insert (e.g. event buffered across a reconnect reload)
        if (tracks.value.some(t => t.id === e.record.id)) return
        tracks.value.push(e.record)
        sort()
      } else if (e.action === 'update') {
        const idx = tracks.value.findIndex(t => t.id === e.record.id)
        if (idx >= 0) tracks.value[idx] = e.record
        sort()
      } else if (e.action === 'delete') {
        tracks.value = tracks.value.filter(t => t.id !== e.record.id)
      }
    }, { filter: pb.filter('session = {:session}', { session: sessionId }), expand: 'video' })
    // Reload on SSE reconnect to recover any missed track events
    unsubscribeReconnect = await pb.realtime.subscribe('PB_CONNECT', () => {
      load()
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
    unsubscribeReconnect?.()
  })

  return { tracks, currentTrack, queuedTracks, addTrack, playTrack, finishTrack, voteToSkip, cancelSkipVote, deleteTrack }
}
