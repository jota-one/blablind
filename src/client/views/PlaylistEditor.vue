<template>
  <div class="space-y-8">
    <section v-if="playlist">
      <div class="flex items-center gap-2 mb-4">
        <RouterLink to="/playlists" class="btn btn-sm btn-ghost btn-circle" :title="t('playlists.back')">
          <span class="i-fa-solid-arrow-left"></span>
        </RouterLink>
        <h2 class="text-xl font-semibold flex items-center gap-2 flex-1 min-w-0">
          <span class="i-fa-solid-list-ol text-primary shrink-0"></span>
          <span class="truncate">{{ playlist.name }}</span>
        </h2>
      </div>

      <!-- Metadata -->
      <div class="space-y-3 rounded-lg bg-base-200 p-4 mb-6">
        <label class="form-control w-full">
          <span class="label-text text-xs mb-1">{{ t('playlists.name_label') }}</span>
          <input v-model="playlist.name" type="text" class="input input-bordered input-sm w-full" @change="saveMeta" />
        </label>
        <label class="form-control w-full">
          <span class="label-text text-xs mb-1">{{ t('playlists.description_label') }}</span>
          <textarea
            v-model="playlist.description"
            class="textarea textarea-bordered textarea-sm w-full"
            rows="2"
            @change="saveMeta"
          ></textarea>
        </label>
        <label class="form-control w-full">
          <span class="label-text text-xs mb-1">{{ t('playlists.tags_label') }}</span>
          <input
            v-model="tagsInput"
            type="text"
            :placeholder="t('playlists.tags_placeholder')"
            class="input input-bordered input-sm w-full"
            @change="saveMeta"
          />
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="playlist.public" type="checkbox" class="toggle toggle-sm toggle-primary" @change="saveMeta" />
          <span class="text-sm">{{ t('playlists.public_label') }}</span>
          <span class="text-xs text-base-content/40">{{ t('playlists.public_hint') }}</span>
        </label>
        <p v-if="savedFlash" class="text-xs text-success">{{ t('playlists.saved') }}</p>
      </div>

      <!-- Preview player -->
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

      <!-- Tracks -->
      <h3 class="font-semibold mb-2">
        {{ t('playlists.tracks_title', { count: rows.length }) }}
      </h3>
      <ul ref="rowListEl" class="space-y-2 mb-6">
        <li
          v-for="row in rows"
          :key="row.id"
          :data-id="row.id"
          class="flex items-start gap-2 rounded-lg bg-base-200 px-3 py-2 draggable-row"
        >
          <span class="drag-handle cursor-grab text-base-content/30 pt-4 shrink-0">
            <span class="i-fa-solid-grip-vertical"></span>
          </span>
          <button
            type="button"
            class="relative w-14 h-14 shrink-0 rounded overflow-hidden group mt-1"
            :title="isPreviewing(row) ? t('track.stop_preview') : t('track.play_preview')"
            @click="togglePreview(row)"
          >
            <img
              :src="`https://img.youtube.com/vi/${row.expand?.video?.video_id}/default.jpg`"
              class="w-full h-full object-cover bg-base-300"
              loading="lazy"
            />
            <span class="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors text-white">
              <span :class="isPreviewing(row) ? 'i-fa-solid-stop' : 'i-fa-solid-play'"></span>
            </span>
          </button>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ row.expand?.video?.title }}</p>
            <p v-if="row.expand?.video?.artist" class="text-xs text-base-content/50 truncate">
              {{ row.expand?.video?.artist }}
            </p>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <div class="flex items-center gap-1">
                <span class="text-xs text-base-content/50">{{ t('track.start_label') }}</span>
                <label class="input input-xs w-18 shrink-0">
                  <input
                    v-model.number="row.start_seconds"
                    type="number"
                    min="0"
                    class="grow w-full min-w-0 text-center"
                    :title="t('track.start_title')"
                    @change="saveTiming(row)"
                  />
                  <span class="opacity-50">s</span>
                </label>
                <button
                  v-if="isPreviewing(row)"
                  type="button"
                  class="btn btn-xs btn-ghost shrink-0 text-primary px-1"
                  :title="t('track.capture_start_title')"
                  @click="captureStart(row)"
                >
                  <span class="i-fa-solid-flag text-xs"></span>
                </button>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-xs text-base-content/50">{{ t('track.playback_duration_label') }}</span>
                <label class="input input-xs w-18 shrink-0">
                  <input
                    v-model.number="row.playback_duration"
                    type="number"
                    min="0"
                    class="grow w-full min-w-0 text-center"
                    :title="t('track.playback_duration_title')"
                    @change="saveTiming(row)"
                  />
                  <span class="opacity-50">s</span>
                </label>
                <button
                  v-if="isPreviewing(row)"
                  type="button"
                  class="btn btn-xs btn-ghost shrink-0 text-primary px-1"
                  :title="t('track.capture_end_title')"
                  @click="captureDuration(row)"
                >
                  <span class="i-fa-solid-flag-checkered text-xs"></span>
                </button>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-xs text-base-content/50">{{ t('track.reveal_seconds_label') }}</span>
                <label class="input input-xs w-18 shrink-0">
                  <input
                    v-model.number="row.reveal_seconds"
                    type="number"
                    min="0"
                    class="grow w-full min-w-0 text-center"
                    :title="t('track.reveal_seconds_title')"
                    @change="saveTiming(row)"
                  />
                  <span class="opacity-50">s</span>
                </label>
                <button
                  v-if="isPreviewing(row)"
                  type="button"
                  class="btn btn-xs btn-ghost shrink-0 text-primary px-1"
                  :title="t('track.capture_reveal_title')"
                  @click="captureReveal(row)"
                >
                  <span class="i-fa-solid-eye text-xs"></span>
                </button>
              </div>
            </div>
          </div>
          <button
            v-if="deleteConfirmId === row.id"
            class="btn btn-xs btn-error shrink-0 mt-1"
            @click="removeRow(row)"
          >
            {{ t('playlists.delete_confirm') }}
          </button>
          <button
            v-else
            class="btn btn-xs btn-ghost btn-circle shrink-0 text-base-content/40 hover:text-error mt-1"
            :title="t('playlists.remove_track')"
            @click="deleteConfirmId = row.id"
          >
            <span class="i-fa-solid-trash"></span>
          </button>
        </li>
      </ul>
      <p v-if="rows.length === 0" class="text-sm text-base-content/40 text-center py-4 -mt-4">
        {{ t('playlists.no_tracks') }}
      </p>

      <!-- Add tracks -->
      <h3 class="font-semibold mb-2">{{ t('playlists.add_tracks') }}</h3>
      <div class="tabs tabs-bordered mb-3">
        <button :class="['tab', addMode === 'search' ? 'tab-active' : '']" @click="addMode = 'search'">
          <span class="i-fa-solid-magnifying-glass mr-1"></span>
          {{ t('room.add_tab_search') }}
        </button>
        <button :class="['tab', addMode === 'favorites' ? 'tab-active' : '']" @click="addMode = 'favorites'">
          <span class="i-fa-solid-star mr-1"></span>
          {{ t('room.add_tab_favorites') }}
        </button>
      </div>
      <!-- v-show keeps search results / previews alive across tab switches -->
      <TrackSearch v-show="addMode === 'search'" ref="trackSearch" :add-track="addRow" :remove-track="deleteRowById" can-add-track />
      <FavoritesPicker
        v-show="addMode === 'favorites'"
        ref="favoritesPane"
        :favorites="favorites"
        :add-track="addRow"
        :remove-track="deleteRowById"
      />
    </section>

    <div v-else class="flex justify-center py-8">
      <span class="loading loading-spinner loading-sm"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { useI36n } from '@jota-one/i36n'
import Sortable from 'sortablejs'
import useAuth from '@admin/composables/useAuth'
import { findOrCreateVideo } from '@game/composables/useVideos'
import YoutubePlayer from '@game/components/YoutubePlayer.vue'
import TrackSearch from '@game/components/TrackSearch.vue'
import FavoritesPicker from '@game/components/FavoritesPicker.vue'

const { t } = useI36n()
const { user, pb } = useAuth()
const route = useRoute()

const playlist = ref<any>(null)
const rows = ref<any[]>([])
const addMode = ref<'search' | 'favorites'>('search')
const favorites = ref<any[]>([])

const favoritesPane = useTemplateRef<InstanceType<typeof FavoritesPicker>>('favoritesPane')

const loadFavorites = async () => {
  if (!user.value?.id) { return }
  favorites.value = await pb.collection('favorites').getFullList({
    filter: pb.filter('user = {:user}', { user: user.value.id }),
    expand: 'video',
    sort: '-created',
    requestKey: null,
  })
}

watch(() => user.value?.id, (id) => { if (id) { loadFavorites() } }, { immediate: true })

// Stop the favorites preview when leaving the tab
watch(addMode, (mode) => {
  if (mode !== 'favorites') {
    favoritesPane.value?.stopPreview()
  }
})
const tagsInput = ref('')
const savedFlash = ref(false)
const deleteConfirmId = ref<string | null>(null)
const previewInfo = ref<{ videoId: string; startSeconds: number } | null>(null)

const previewPlayer = useTemplateRef<InstanceType<typeof YoutubePlayer>>('previewPlayer')
const rowListEl = useTemplateRef<HTMLElement>('rowListEl')

const playlistId = computed(() => route.params.id as string)

const load = async () => {
  playlist.value = await pb.collection('playlists').getOne(playlistId.value, { requestKey: null })
  tagsInput.value = (Array.isArray(playlist.value.tags) ? playlist.value.tags : []).join(', ')
  rows.value = await pb.collection('playlist_tracks').getFullList({
    filter: pb.filter('playlist = {:playlist}', { playlist: playlistId.value }),
    expand: 'video',
    sort: 'order,created',
    requestKey: null,
  })
}

watch(playlistId, () => { load() }, { immediate: true })

let savedFlashTimer: ReturnType<typeof setTimeout> | null = null
const flashSaved = () => {
  savedFlash.value = true
  if (savedFlashTimer) { clearTimeout(savedFlashTimer) }
  savedFlashTimer = setTimeout(() => { savedFlash.value = false }, 2000)
}

const saveMeta = async () => {
  const tags = tagsInput.value.split(',').map(s => s.trim()).filter(Boolean)
  await pb.collection('playlists').update(playlist.value.id, {
    name: playlist.value.name,
    description: playlist.value.description,
    tags,
    public: playlist.value.public,
  })
  flashSaved()
}

// --- Timings ---

const isPreviewing = (row: any) => previewInfo.value?.videoId === row.expand?.video?.video_id

const togglePreview = (row: any) => {
  if (isPreviewing(row)) {
    previewInfo.value = null
  } else {
    previewInfo.value = {
      videoId: row.expand?.video?.video_id,
      startSeconds: row.start_seconds ?? 0,
    }
  }
}

const saveTiming = (row: any) => {
  const clean = (v: any) => (typeof v === 'number' && v > 0 ? Math.floor(v) : null)
  row.start_seconds = Math.max(0, Math.floor(row.start_seconds || 0))
  row.playback_duration = clean(row.playback_duration)
  row.reveal_seconds = clean(row.reveal_seconds)
  pb.collection('playlist_tracks').update(row.id, {
    start_seconds: row.start_seconds,
    playback_duration: row.playback_duration,
    reveal_seconds: row.reveal_seconds,
  }, { requestKey: null })
}

const previewTime = () => Math.floor(previewPlayer.value?.getCurrentTime() ?? 0)

const captureStart = (row: any) => {
  row.start_seconds = previewTime()
  saveTiming(row)
}

const captureDuration = (row: any) => {
  row.playback_duration = Math.max(1, previewTime() - (row.start_seconds ?? 0))
  saveTiming(row)
}

const captureReveal = (row: any) => {
  row.reveal_seconds = previewTime()
  saveTiming(row)
}

// --- Add / remove ---

const addRow = async (data: {
  video_id: string
  title?: string
  artist?: string
  duration?: number
  start_seconds?: number
  playback_duration?: number
  reveal_seconds?: number
}) => {
  const video = await findOrCreateVideo(data)
  const maxOrder = rows.value.reduce((max, r) => Math.max(max, r.order ?? 0), 0)
  const row = await pb.collection('playlist_tracks').create({
    playlist: playlistId.value,
    video: video.id,
    start_seconds: data.start_seconds ?? 0,
    playback_duration: data.playback_duration || null,
    reveal_seconds: data.reveal_seconds ?? null,
    order: maxOrder + 1,
  })
  rows.value.push({ ...row, expand: { video } })
  return { id: row.id }
}

const deleteRowById = async (rowId: string) => {
  await pb.collection('playlist_tracks').delete(rowId)
  rows.value = rows.value.filter(r => r.id !== rowId)
}

const removeRow = (row: any) => {
  if (isPreviewing(row)) {
    previewInfo.value = null
  }
  deleteConfirmId.value = null
  deleteRowById(row.id)
}

// --- Drag & drop reorder ---

let sortableInstance: Sortable | null = null

watch(rowListEl, (el) => {
  if (el) {
    sortableInstance = Sortable.create(el, {
      draggable: '.draggable-row',
      handle: '.drag-handle',
      animation: 150,
      onEnd() {
        const ordered = Array.from(el.querySelectorAll('[data-id]'))
          .map(node => node.getAttribute('data-id'))
          .map(id => rows.value.find(r => r.id === id))
          .filter((r): r is any => !!r)
        ordered.forEach((row, i) => {
          const newOrder = i + 1
          if (row.order !== newOrder) {
            row.order = newOrder
            pb.collection('playlist_tracks').update(row.id, { order: newOrder }, { requestKey: null })
          }
        })
        rows.value = [...rows.value].sort((a, b) => a.order - b.order)
      },
    })
  } else {
    sortableInstance?.destroy()
    sortableInstance = null
  }
})

onUnmounted(() => {
  sortableInstance?.destroy()
  if (savedFlashTimer) { clearTimeout(savedFlashTimer) }
})
</script>
