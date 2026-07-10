import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { pb } from '@game/pb'

// Favorites are tied to the authenticated user (guests have no durable identity).
// Discovery context (who, which session, guessed or not) is snapshotted at
// favoriting time because sessions and players are ephemeral.
export default function useFavorites(
  user: Ref<any>,
  players: Ref<any[]>,
  sessionName: ComputedRef<string>,
  currentPlayerId: string,
) {
  const favorites = ref<any[]>([])

  const loadFavorites = async () => {
    if (!user.value?.id) {
      favorites.value = []
      return
    }
    favorites.value = await pb.collection('favorites').getFullList({
      filter: pb.filter('user = {:user}', { user: user.value.id }),
    })
  }

  const favoriteByVideo = computed(() => new Map(favorites.value.map(f => [f.video, f])))

  const isFavorite = (track: any) => !!track?.video && favoriteByVideo.value.has(track.video)

  const toggleFavorite = async (track: any) => {
    if (!user.value?.id || !track?.video) {
      return
    }
    const existing = favoriteByVideo.value.get(track.video)
    if (existing) {
      await pb.collection('favorites').delete(existing.id)
      favorites.value = favorites.value.filter(f => f.id !== existing.id)
      return
    }
    const owner = players.value.find(p => p.id === track.added_by)
    try {
      const created = await pb.collection('favorites').create({
        user: user.value.id,
        video: track.video,
        discovered_from_name: owner?.name ?? '',
        discovered_from_user: owner?.auth_user || null,
        session_name: sessionName.value,
        guessed_right: track.solved_by === currentPlayerId,
        start_seconds: track.start_seconds ?? 0,
      })
      favorites.value.push(created)
    } catch {
      // Unique (user, video) index: a concurrent add from another tab already
      // saved it — resync instead of failing.
      await loadFavorites()
    }
  }

  return { favorites, loadFavorites, isFavorite, toggleFavorite }
}
