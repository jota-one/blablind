<template>
  <div class="space-y-3">

    <!-- Search input -->
    <form class="flex gap-2" @submit.prevent="search">
      <input
        v-model="query"
        type="text"
        :placeholder="t('search.placeholder')"
        class="input input-bordered flex-1"
      />
      <button type="submit" class="btn btn-primary" :disabled="!query.trim() || searching">
        <span v-if="searching" class="loading loading-spinner loading-sm"></span>
        <span v-else class="i-fa6-solid-magnifying-glass"></span>
      </button>
    </form>

    <!-- Preview player -->
    <div v-if="previewInfo" class="rounded-lg overflow-hidden aspect-video">
      <iframe
        :key="`${previewInfo.videoId}-${previewInfo.startSeconds}`"
        :src="`https://www.youtube.com/embed/${previewInfo.videoId}?autoplay=1&controls=1&rel=0&playsinline=1&modestbranding=1&start=${previewInfo.startSeconds}`"
        allow="autoplay; encrypted-media"
        allowfullscreen
        class="w-full h-full"
      ></iframe>
    </div>

    <!-- Local results -->
    <template v-if="localResults.length > 0">
      <p class="text-xs text-base-content/50 uppercase tracking-wide font-semibold">{{ t('search.library_label') }}</p>
      <ul class="space-y-1">
        <li v-for="v in localResults" :key="v.id">
          <TrackResultRow
            :video="{ videoId: v.video_id, title: v.title, artist: v.artist, duration: v.duration }"
            :added="addedIds.has(v.video_id)"
            :previewing="previewInfo?.videoId === v.video_id"
            @add="addVideo"
            @preview="togglePreview"
          />
        </li>
      </ul>
      <button class="btn btn-sm btn-ghost w-full mt-1" :disabled="searchingYt" @click="searchYoutube">
        <span v-if="searchingYt" class="loading loading-spinner loading-xs"></span>
        <span v-else class="i-fa-brands-youtube text-error"></span>
        {{ t('search.youtube_button') }}
      </button>
    </template>

    <!-- YouTube results -->
    <template v-if="ytResults.length > 0">
      <p class="text-xs text-base-content/50 uppercase tracking-wide font-semibold">{{ t('search.youtube_label') }}</p>
      <ul class="space-y-1">
        <li v-for="v in ytResults" :key="v.videoId">
          <TrackResultRow
            :video="v"
            :added="addedIds.has(v.videoId)"
            :previewing="previewInfo?.videoId === v.videoId"
            @add="addVideo"
            @preview="togglePreview"
          />
        </li>
      </ul>
    </template>

    <!-- No results -->
    <p v-if="noResults" class="text-sm text-base-content/40 text-center py-2">{{ t('search.no_results') }}</p>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI36n } from '@jota-one/i36n'
import { pb } from '@game/pb'
import { normalizeSearch } from '@game/utils'
import TrackResultRow from '@game/components/TrackResultRow.vue'

const { t } = useI36n()

interface SearchVideo { videoId: string; title: string; artist: string; duration: number }

const props = defineProps<{
  addTrack: (data: { video_id: string; title?: string; artist?: string; duration?: number; start_seconds?: number }) => Promise<void>
}>()

const query = ref('')
const localResults = ref<any[]>([])
const ytResults = ref<SearchVideo[]>([])
const addedIds = ref(new Set<string>())
const previewInfo = ref<{ videoId: string; startSeconds: number } | null>(null)
const searching = ref(false)
const searchingYt = ref(false)
const searched = ref(false)

const noResults = computed(() =>
  searched.value && !searching.value && !searchingYt.value &&
  localResults.value.length === 0 && ytResults.value.length === 0
)

const togglePreview = (video: SearchVideo, startSeconds: number) => {
  if (previewInfo.value?.videoId === video.videoId && previewInfo.value?.startSeconds === startSeconds) {
    previewInfo.value = null
  } else {
    previewInfo.value = { videoId: video.videoId, startSeconds }
  }
}

const search = async () => {
  const q = query.value.trim()
  if (!q) return
  searching.value = true
  localResults.value = []
  ytResults.value = []
  searched.value = false

  const tokens = normalizeSearch(q).split(/\s+/).filter(t => t.length >= 2)

  try {
    if (tokens.length > 0) {
      const filter = tokens.map(t => `search_text ~ "${t.replace(/"/g, '\\"')}"`).join(' || ')
      const res = await pb.collection('videos').getList(1, 20, { filter })
      localResults.value = res.items
        .map(item => ({ item, score: tokens.filter(t => item.search_text?.includes(t)).length }))
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item)
    }
    searched.value = true
    if (localResults.value.length === 0) await searchYoutube()
  } catch {
    await searchYoutube()
    searched.value = true
  } finally {
    searching.value = false
  }
}

const searchYoutube = async () => {
  const q = query.value.trim()
  if (!q) return
  searchingYt.value = true
  try {
    const res = await fetch(`/proxy/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    ytResults.value = data.results ?? []
  } finally {
    searchingYt.value = false
  }
}

const addVideo = async (video: SearchVideo, startSeconds: number) => {
  addedIds.value = new Set([...addedIds.value, video.videoId])
  await props.addTrack({
    video_id: video.videoId,
    title: video.title,
    artist: video.artist,
    duration: video.duration,
    start_seconds: startSeconds || undefined,
  })
}
</script>
