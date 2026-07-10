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

      <ul v-else-if="favorites.length > 0" class="space-y-2">
        <li
          v-for="favorite in favorites"
          :key="favorite.id"
          class="flex items-center gap-3 rounded-lg bg-base-200 px-3 py-2"
        >
          <a
            :href="youtubeUrl(favorite)"
            target="_blank"
            rel="noopener"
            class="relative w-14 h-14 shrink-0 rounded overflow-hidden group"
            :title="t('favorites.listen')"
          >
            <img
              :src="`https://img.youtube.com/vi/${favorite.expand?.video?.video_id}/default.jpg`"
              class="w-full h-full object-cover bg-base-300"
              loading="lazy"
            />
            <span class="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors text-white">
              <span class="i-fa-solid-play"></span>
            </span>
          </a>
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
          </div>
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

      <p v-else class="text-sm text-base-content/40 text-center py-8">
        {{ t('favorites.empty') }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'

const { t } = useI36n()
const { user, pb } = useAuth()

const favorites = ref<any[]>([])
const loading = ref(false)
const deleteConfirmId = ref<string | null>(null)

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
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
</script>
