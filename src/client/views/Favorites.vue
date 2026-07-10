<template>
  <div class="space-y-8">
    <section>
      <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
        <span class="i-fa-solid-star text-primary"></span>
        {{ t('favorites.title') }}
      </h2>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-sm"></span>
      </div>

      <template v-else-if="favorites.length > 0">

      <!-- In-app preview player, same pattern as the game's track search -->
      <div v-if="previewInfo" class="rounded-lg overflow-hidden aspect-video max-w-md mx-auto mb-3">
        <YoutubePlayer
          :key="`${previewInfo.videoId}-${previewInfo.startSeconds}`"
          ref="previewPlayer"
          :video-id="previewInfo.videoId"
          :start-seconds="previewInfo.startSeconds"
          :paused="false"
          autoplay
        />
      </div>

      <ul class="space-y-2">
        <li
          v-for="favorite in favorites"
          :key="favorite.id"
          class="flex items-center gap-3 rounded-lg bg-base-200 px-3 py-2"
        >
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
              {{ favorite.session_name }} · {{ formatDate(favorite.created) }}
            </p>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="text-xs text-base-content/50">{{ t('track.start_label') }}</span>
              <label class="input input-xs w-20 shrink-0">
                <input
                  v-model.number="favorite.start_seconds"
                  type="number"
                  min="0"
                  class="grow w-full min-w-0 text-center"
                  :title="t('track.start_title')"
                  @change="saveStart(favorite)"
                />
                <span class="opacity-50">s</span>
              </label>
              <button
                v-if="isPreviewing(favorite)"
                type="button"
                class="btn btn-xs btn-ghost shrink-0 text-primary"
                :title="t('track.capture_start_title')"
                @click="captureStart(favorite)"
              >
                <span class="i-fa-solid-flag text-xs"></span>
              </button>
            </div>
          </div>
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
import { ref, watch, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'
import YoutubePlayer from '@game/components/YoutubePlayer.vue'

const { t } = useI36n()
const { user, pb } = useAuth()

const favorites = ref<any[]>([])
const loading = ref(false)
const deleteConfirmId = ref<string | null>(null)
const previewInfo = ref<{ videoId: string; startSeconds: number } | null>(null)

const previewPlayer = useTemplateRef<InstanceType<typeof YoutubePlayer>>('previewPlayer')

const isPreviewing = (favorite: any) => previewInfo.value?.videoId === favorite.expand?.video?.video_id

const saveStart = (favorite: any) => {
  const start = Math.max(0, Math.floor(favorite.start_seconds || 0))
  favorite.start_seconds = start
  pb.collection('favorites').update(favorite.id, { start_seconds: start })
}

// Capture the preview's current position as the new start, without restarting
// the player (previewInfo keeps its original startSeconds).
const captureStart = (favorite: any) => {
  favorite.start_seconds = Math.floor(previewPlayer.value?.getCurrentTime() ?? 0)
  saveStart(favorite)
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
</script>
