import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { pb } from '@game/pb'

export type ToggleFavoriteResult = {
  // 'kept-variants': the star was tapped but every entry for this video carries
  // custom timings, so nothing was removed and the star stays lit.
  action: 'added' | 'removed' | 'kept-variants' | 'none'
  variantsLeft: number
}

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
      expand: 'video',
      sort: '-created',
    })
  }

  // A video can now be kept several times with different timings (see the
  // member area). The star reflects "this video is somewhere in my favorites".
  const favoritesByVideo = computed(() => {
    const map = new Map<string, any[]>()
    for (const favorite of favorites.value) {
      const list = map.get(favorite.video) ?? []
      list.push(favorite)
      map.set(favorite.video, list)
    }
    return map
  })

  const isFavorite = (track: any) => !!track?.video && favoritesByVideo.value.has(track.video)

  // Un-starring must never destroy a tuned variant prepared in the member area:
  // it only removes the plain entry the star itself creates. If every entry for
  // this video carries custom timings, nothing is removed and the star stays on.
  const isPlainEntry = (favorite: any) => !favorite.playback_duration && !favorite.reveal_seconds

  // Tells the caller what actually happened, so the room can explain a star
  // that stays lit because tuned variants were deliberately spared.
  const toggleFavorite = async (track: any): Promise<ToggleFavoriteResult> => {
    if (!user.value?.id || !track?.video) {
      return { action: 'none', variantsLeft: 0 }
    }
    const existing = favoritesByVideo.value.get(track.video)
    if (existing?.length) {
      const plain = existing.find(isPlainEntry)
      const variantsLeft = existing.filter(f => !isPlainEntry(f)).length
      if (plain) {
        await pb.collection('favorites').delete(plain.id)
        favorites.value = favorites.value.filter(f => f.id !== plain.id)
        return { action: 'removed', variantsLeft }
      }
      return { action: 'kept-variants', variantsLeft }
    }
    const owner = players.value.find(p => p.id === track.added_by)
    try {
      await pb.collection('favorites').create({
        user: user.value.id,
        video: track.video,
        discovered_from_name: owner?.name ?? '',
        discovered_from_user: owner?.auth_user || null,
        session_name: sessionName.value,
        guessed_right: track.solved_by === currentPlayerId,
        start_seconds: track.start_seconds ?? 0,
      })
    } catch {
      // Create can still fail (offline, rule); the reload below resyncs.
    }
    // Reload instead of pushing the created record: consumers need the video
    // expand, which a create response doesn't include.
    await loadFavorites()
    return { action: 'added', variantsLeft: 0 }
  }

  return { favorites, loadFavorites, isFavorite, toggleFavorite }
}
