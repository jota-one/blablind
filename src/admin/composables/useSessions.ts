import { computed, onMounted, onUnmounted, ref } from 'vue'
import PocketBase from 'pocketbase'
import config from '../../config'
import { isOnline } from '@game/utils'
import type { PlayerRecord, SessionRecord, SessionStatus, TrackRecord } from '@/types/records'

export type TSessionRow = SessionRecord & {
  playersOnline: number
  playersTotal: number
  tracksDone: number
  tracksTotal: number
}

// Admin monitoring is read-only and low-traffic: a poll keeps the whole page
// (sessions + derived player/track counts) consistent without juggling three
// realtime subscriptions.
const REFRESH_INTERVAL_MS = 10_000
const CLOCK_INTERVAL_MS = 5_000

export default function useSessions() {
  const pb = new PocketBase(config.apiBaseUrl)

  const sessions = ref<SessionRecord[]>([])
  const players = ref<PlayerRecord[]>([])
  const tracks = ref<TrackRecord[]>([])
  const statusFilter = ref<SessionStatus | ''>('')
  const loading = ref(false)
  const now = ref(Date.now())

  const load = async () => {
    loading.value = true
    try {
      // requestKey null: the poll and a manual refresh can overlap, and the SDK
      // would auto-cancel the first of two identical requests.
      sessions.value = await pb.collection<SessionRecord>('sessions').getFullList({
        sort: '-created',
        filter: statusFilter.value
          ? pb.filter('status = {:status}', { status: statusFilter.value })
          : '',
        requestKey: null,
      })

      const ids = sessions.value.map(s => s.id)
      if (ids.length === 0) {
        players.value = []
        tracks.value = []
        return
      }

      const scope = pb.filter(
        ids.map((_, i) => `session = {:s${i}}`).join(' || '),
        Object.fromEntries(ids.map((id, i) => [`s${i}`, id])),
      )
      const [loadedPlayers, loadedTracks] = await Promise.all([
        pb.collection<PlayerRecord>('players').getFullList({
          filter: scope,
          fields: 'id,session,last_seen',
          requestKey: null,
        }),
        pb.collection<TrackRecord>('tracks').getFullList({
          filter: scope,
          fields: 'id,session,status',
          requestKey: null,
        }),
      ])
      players.value = loadedPlayers
      tracks.value = loadedTracks
    } finally {
      loading.value = false
    }
  }

  const rows = computed<TSessionRow[]>(() => {
    now.value // reactive dependency so isOnline is re-evaluated on each tick
    return sessions.value.map(session => {
      const sessionPlayers = players.value.filter(p => p.session === session.id)
      const sessionTracks = tracks.value.filter(t => t.session === session.id)
      return {
        ...session,
        playersOnline: sessionPlayers.filter(isOnline).length,
        playersTotal: sessionPlayers.length,
        tracksDone: sessionTracks.filter(t => t.status === 'done').length,
        tracksTotal: sessionTracks.length,
      }
    })
  })

  // Relations cascade: players and tracks go with the session, then buzzes and
  // answer_votes go with the tracks.
  const deleteSession = async (id: string) => {
    await pb.collection('sessions').delete(id)
    await load()
  }

  let refreshInterval: ReturnType<typeof setInterval>
  let clockInterval: ReturnType<typeof setInterval>

  onMounted(() => {
    load()
    refreshInterval = setInterval(load, REFRESH_INTERVAL_MS)
    clockInterval = setInterval(() => {
      now.value = Date.now()
    }, CLOCK_INTERVAL_MS)
  })

  onUnmounted(() => {
    clearInterval(refreshInterval)
    clearInterval(clockInterval)
  })

  return { rows, statusFilter, loading, load, deleteSession }
}
