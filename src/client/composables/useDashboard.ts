import { ref, watch } from 'vue'
import useAuth from '@admin/composables/useAuth'
import type {
  FavoriteRecord,
  PlaylistRecord,
  PlaylistTrackRecord,
  SessionRecord,
} from '@/types/records'

const RECENT_FAVORITES = 5

export type TDashboardPlaylist = PlaylistRecord & {
  expand?: { playlist_tracks_via_playlist?: PlaylistTrackRecord[] }
}

export default function useDashboard() {
  const { user, pb } = useAuth()

  const lastSession = ref<SessionRecord | null>(null)
  const lastSessionTracks = ref(0)
  const lastPlaylist = ref<TDashboardPlaylist | null>(null)
  const recentFavorites = ref<FavoriteRecord[]>([])
  const counts = ref({ sessions: 0, playlists: 0, favorites: 0 })
  const loading = ref(false)

  const load = async () => {
    if (!user.value?.id) { return }
    loading.value = true
    try {
      // getList returns both the newest entries and the total, so one request
      // per collection covers the preview cards and the tile counters.
      // requestKey null: the router guard refreshes auth on arrival, which can
      // retrigger this load while the first one is still in flight.
      const [sessions, playlists, favorites] = await Promise.all([
        pb.collection<SessionRecord>('sessions').getList(1, 1, {
          filter: pb.filter('owner = {:owner}', { owner: user.value.id }),
          sort: '-created',
          requestKey: null,
        }),
        pb.collection<TDashboardPlaylist>('playlists').getList(1, 1, {
          filter: pb.filter('owner = {:owner}', { owner: user.value.id }),
          sort: '-updated',
          expand: 'playlist_tracks_via_playlist',
          requestKey: null,
        }),
        pb.collection<FavoriteRecord>('favorites').getList(1, RECENT_FAVORITES, {
          filter: pb.filter('user = {:user}', { user: user.value.id }),
          sort: '-created',
          expand: 'video',
          requestKey: null,
        }),
      ])

      lastSession.value = sessions.items[0] ?? null
      lastPlaylist.value = playlists.items[0] ?? null
      recentFavorites.value = favorites.items
      counts.value = {
        sessions: sessions.totalItems,
        playlists: playlists.totalItems,
        favorites: favorites.totalItems,
      }

      lastSessionTracks.value = lastSession.value
        ? (
            await pb.collection('tracks').getList(1, 1, {
              filter: pb.filter('session = {:session}', { session: lastSession.value.id }),
              fields: 'id',
              requestKey: null,
            })
          ).totalItems
        : 0
    } finally {
      loading.value = false
    }
  }

  watch(() => user.value?.id, id => { if (id) { load() } }, { immediate: true })

  return {
    lastSession,
    lastSessionTracks,
    lastPlaylist,
    recentFavorites,
    counts,
    loading,
    load,
  }
}
