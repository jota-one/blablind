<template>
  <div class="space-y-8 max-w-xl">
    <section>
      <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
        <span class="i-fa-solid-star text-primary"></span>
        {{ t('favorites.title') }}
      </h2>

      <!-- Prepare ahead: search the library and YouTube, same component as the
           in-game add-track modal. -->
      <div class="mb-4">
        <button class="btn btn-sm btn-primary w-full" @click="showSearch = !showSearch">
          <span :class="showSearch ? 'i-fa-solid-xmark' : 'i-fa-solid-plus'"></span>
          {{ showSearch ? t('favorites.close_search') : t('favorites.add_track') }}
        </button>
        <div v-show="showSearch" class="mt-3">
          <TrackSearch :add-track="addFavorite" :remove-track="removeFavoriteById" can-add-track />
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-sm"></span>
      </div>

      <template v-else-if="favorites.length > 0">

      <!-- In-app preview player, same pattern as the game's track search.
           Sticky so it stays in view while the list scrolls under it: the start
           timing is tuned from the row below, which must remain reachable. -->
      <div v-if="previewInfo" class="sticky -top-4 lg:-top-8 z-20 bg-base-100 pt-4 lg:pt-8 pb-3">
        <div class="rounded-lg overflow-hidden aspect-video max-w-md mx-auto">
          <YoutubePlayer
            :key="`${previewInfo.videoId}-${previewInfo.startSeconds}`"
            ref="previewPlayer"
            :video-id="previewInfo.videoId"
            :start-seconds="previewInfo.startSeconds"
            :paused="false"
            autoplay
          />
        </div>
        <div class="max-w-md mx-auto flex items-center gap-2 mt-1.5">
          <p class="text-xs text-base-content/60 truncate">
            {{ previewingFavorite?.expand?.video?.title }}
          </p>
          <button
            type="button"
            class="btn btn-xs btn-ghost shrink-0 ml-auto"
            :title="t('track.stop_preview')"
            @click="previewInfo = null"
          >
            <span class="i-fa-solid-stop text-xs"></span>
          </button>
        </div>
      </div>

      <ul class="space-y-2">
        <li
          v-for="favorite in favorites"
          :key="favorite.id"
          class="rounded-lg bg-base-200 px-3 py-2"
        >
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="relative w-14 h-14 shrink-0 rounded overflow-hidden group"
              :title="isPreviewing(favorite) ? t('track.stop_preview') : t('track.play_preview')"
              @click="togglePreview(favorite)"
            >
              <img
                :src="`https://img.youtube.com/vi/${favorite.expand?.video?.video_id}/default.jpg`"
                class="w-full h-full object-cover bg-base-300"
                loading="lazy"
              />
              <span class="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors text-white">
                <span :class="isPreviewing(favorite) ? 'i-fa-solid-stop' : 'i-fa-solid-play'"></span>
              </span>
            </button>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">
                {{ favorite.expand?.video?.title }}
                <span v-if="favorite.guessed_right" class="ml-1" :title="t('favorites.guessed_badge')">🏆</span>
              </p>
              <p v-if="favorite.expand?.video?.artist" class="text-xs text-base-content/50 truncate">
                {{ favorite.expand?.video?.artist }}
              </p>
              <p class="text-xs text-base-content/40 mt-0.5 truncate">
                <template v-if="favorite.discovered_from_name">
                  {{ t('favorites.discovered_from', { name: favorite.discovered_from_name }) }} ·
                </template>
                <template v-if="favorite.session_name">{{ favorite.session_name }} · </template>
                {{ formatDate(favorite.created) }}
              </p>
            </div>
            <button
              type="button"
              class="btn btn-xs btn-ghost btn-circle shrink-0 text-base-content/40 hover:text-primary"
              :title="t('favorites.duplicate')"
              @click="duplicateFavorite(favorite)"
            >
              <span class="i-fa-solid-copy"></span>
            </button>
            <a
              :href="youtubeUrl(favorite)"
              target="_blank"
              rel="noopener"
              class="btn btn-xs btn-ghost btn-circle shrink-0 text-base-content/40 hover:text-error"
              :title="t('favorites.listen')"
            >
              <span class="i-fa-brands-youtube"></span>
            </a>
            <button
              v-if="deleteConfirmId === favorite.id"
              class="btn btn-xs btn-error shrink-0"
              @click="removeFavorite(favorite)"
            >
              {{ t('favorites.remove_confirm') }}
            </button>
            <button
              v-else
              class="btn btn-xs btn-ghost btn-circle shrink-0 text-base-content/40 hover:text-error"
              :title="t('favorites.remove')"
              @click="deleteConfirmId = favorite.id"
            >
              <span class="i-fa-solid-trash"></span>
            </button>
          </div>

          <TrackTimings
            class="mt-2"
            :track="favorite"
            :previewing-at="isPreviewing(favorite) ? previewInfo?.startSeconds ?? null : null"
            :get-preview-time="isPreviewing(favorite) ? previewTime : undefined"
            @save="saveTimings(favorite)"
            @preview="seconds => togglePreviewAt(favorite, seconds)"
          />
        </li>
      </ul>

      </template>

      <p v-else class="text-sm text-base-content/40 text-center py-8">
        {{ t('favorites.empty') }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'
import YoutubePlayer from '@game/components/YoutubePlayer.vue'
import TrackSearch from '@game/components/TrackSearch.vue'
import TrackTimings from '@game/components/TrackTimings.vue'
import { findOrCreateVideo } from '@game/composables/useVideos'

const { t } = useI36n()
const { user, pb } = useAuth()

const favorites = ref<any[]>([])
const loading = ref(false)
const deleteConfirmId = ref<string | null>(null)
const showSearch = ref(false)
const previewInfo = ref<{ videoId: string; startSeconds: number } | null>(null)

const previewPlayer = useTemplateRef<InstanceType<typeof YoutubePlayer>>('previewPlayer')

const isPreviewing = (favorite: any) => previewInfo.value?.videoId === favorite.expand?.video?.video_id

const previewingFavorite = computed(
  () => favorites.value.find(isPreviewing) ?? null,
)

const saveTimings = (favorite: any) => {
  const clean = (v: any) => (typeof v === 'number' && v > 0 ? Math.floor(v) : null)
  favorite.start_seconds = Math.max(0, Math.floor(favorite.start_seconds || 0))
  favorite.playback_duration = clean(favorite.playback_duration)
  favorite.reveal_seconds = clean(favorite.reveal_seconds)
  pb.collection('favorites').update(favorite.id, {
    start_seconds: favorite.start_seconds,
    playback_duration: favorite.playback_duration,
    reveal_seconds: favorite.reveal_seconds,
  })
}

// Capture the preview's current position, without restarting the player
// (previewInfo keeps its original startSeconds).
const previewTime = () => Math.floor(previewPlayer.value?.getCurrentTime() ?? 0)




// 'Résultat' is a resume position like 'Démarrage', so it must be auditionable
// the same way. Previewing compares the position too, to tell them apart.
const isPreviewingAt = (favorite: any, seconds: number) =>
  isPreviewing(favorite) && previewInfo.value?.startSeconds === seconds

const togglePreviewAt = (favorite: any, seconds: number) => {
  const at = Math.max(0, Math.floor(seconds || 0))
  if (isPreviewingAt(favorite, at)) {
    previewInfo.value = null
  } else {
    previewInfo.value = { videoId: favorite.expand?.video?.video_id, startSeconds: at }
  }
}

const togglePreview = (favorite: any) => {
  if (isPreviewing(favorite)) {
    previewInfo.value = null
  } else {
    previewInfo.value = {
      videoId: favorite.expand?.video?.video_id,
      startSeconds: favorite.start_seconds ?? 0,
    }
  }
}

const loadFavorites = async () => {
  if (!user.value?.id) { return }
  loading.value = true
  try {
    favorites.value = await pb.collection('favorites').getFullList({
      filter: pb.filter('user = {:user}', { user: user.value.id }),
      expand: 'video',
      sort: '-created',
      requestKey: null,
    })
  } finally {
    loading.value = false
  }
}

watch(() => user.value?.id, (id) => { if (id) { loadFavorites() } }, { immediate: true })

const youtubeUrl = (favorite: any) => {
  const videoId = favorite.expand?.video?.video_id
  const start = favorite.start_seconds > 0 ? `&t=${favorite.start_seconds}s` : ''
  return `https://www.youtube.com/watch?v=${videoId}${start}`
}

const removeFavorite = async (favorite: any) => {
  await pb.collection('favorites').delete(favorite.id)
  favorites.value = favorites.value.filter(f => f.id !== favorite.id)
  deleteConfirmId.value = null
  if (isPreviewing(favorite)) {
    previewInfo.value = null
  }
}


const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

// Adding from the search: no discovery context, unlike a favorite starred in
// a game. Returns the id so TrackSearch can offer to undo the add.
const addFavorite = async (data: {
  video_id: string
  title?: string
  artist?: string
  duration?: number
  start_seconds?: number
  playback_duration?: number
  reveal_seconds?: number
}) => {
  if (!user.value?.id) { return }
  const video = await findOrCreateVideo(data)
  const favorite = await pb.collection('favorites').create({
    user: user.value.id,
    video: video.id,
    start_seconds: data.start_seconds ?? 0,
    playback_duration: data.playback_duration || null,
    reveal_seconds: data.reveal_seconds ?? null,
  })
  favorites.value.unshift({ ...favorite, expand: { video } })
  return { id: favorite.id }
}

const removeFavoriteById = async (favoriteId: string) => {
  await pb.collection('favorites').delete(favoriteId)
  favorites.value = favorites.value.filter(f => f.id !== favoriteId)
}

// Same video, own timings: the point of dropping the unique (user, video) index.
const duplicateFavorite = async (favorite: any) => {
  const copy = await pb.collection('favorites').create({
    user: favorite.user,
    video: favorite.video,
    discovered_from_name: favorite.discovered_from_name,
    discovered_from_user: favorite.discovered_from_user || null,
    session_name: favorite.session_name,
    guessed_right: favorite.guessed_right,
    start_seconds: favorite.start_seconds ?? 0,
    playback_duration: favorite.playback_duration || null,
    reveal_seconds: favorite.reveal_seconds ?? null,
  })
  const index = favorites.value.findIndex(f => f.id === favorite.id)
  favorites.value.splice(index + 1, 0, { ...copy, expand: favorite.expand })
}
</script>
