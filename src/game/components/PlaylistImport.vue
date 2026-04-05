<template>
  <div class="space-y-3">
    <!-- URL input -->
    <div class="flex gap-2">
      <input
        v-model="url"
        type="url"
        placeholder="URL de la playlist YouTube..."
        class="input input-bordered flex-1"
        :disabled="fetching"
        @keyup.enter="fetchPlaylist"
      />
      <button class="btn btn-primary" :disabled="fetching || !url.trim()" @click="fetchPlaylist">
        <span v-if="fetching" class="loading loading-spinner loading-sm"></span>
        <span v-else class="i-fa6-solid-magnifying-glass"></span>
      </button>
    </div>

    <p v-if="error" class="text-error text-sm">{{ error }}</p>

    <template v-if="playlist">
      <!-- En-tête playlist -->
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-semibold truncate flex-1">
          {{ playlist.name }}
          <span class="text-base-content/40 font-normal">({{ playlist.tracks.length }})</span>
        </span>
        <button class="btn btn-xs btn-ghost shrink-0" @click="toggleAll">
          {{ allSelected ? 'Tout désélectionner' : 'Tout sélectionner' }}
        </button>
      </div>

      <!-- Liste des morceaux -->
      <ul class="max-h-52 overflow-y-auto space-y-1 pr-1">
        <li
          v-for="track in playlist.tracks"
          :key="track.videoId"
          class="flex items-center gap-2 rounded px-1 hover:bg-base-300 transition-colors"
        >
          <input
            :id="track.videoId"
            v-model="selected"
            type="checkbox"
            :value="track.videoId"
            class="checkbox checkbox-sm shrink-0"
          />
          <label :for="track.videoId" class="flex-1 min-w-0 cursor-pointer py-1">
              <span class="text-sm truncate block">{{ track.title }}</span>
              <span v-if="track.artist" class="text-xs text-base-content/40 truncate block">{{ track.artist }}</span>
            </label>
          <span class="text-xs text-base-content/40 shrink-0">{{ formatDuration(track.duration) }}</span>
        </li>
      </ul>

      <!-- Bouton import -->
      <button
        class="btn btn-primary w-full"
        :disabled="selected.length === 0 || importing"
        @click="importSelected"
      >
        <span v-if="importing" class="loading loading-spinner loading-sm"></span>
        <span v-else class="i-fa-solid-file-import"></span>
        Importer {{ selected.length }} morceau{{ selected.length > 1 ? 'x' : '' }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getPlaylistId } from '@game/utils'

interface PlaylistTrack {
  videoId: string
  title: string
  artist: string
  duration: number
}

const props = defineProps<{
  addTrack: (data: { video_id: string; title?: string; artist?: string; duration?: number }) => Promise<void>
}>()

const emit = defineEmits<{ done: [] }>()

const url = ref('')
const fetching = ref(false)
const importing = ref(false)
const error = ref('')
const selected = ref<string[]>([])
const playlist = ref<{ name: string; tracks: PlaylistTrack[] } | null>(null)

const allSelected = computed(() => selected.value.length === playlist.value?.tracks.length)

const toggleAll = () => {
  if (!playlist.value) return
  selected.value = allSelected.value ? [] : playlist.value.tracks.map(t => t.videoId)
}

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const fetchPlaylist = async () => {
  error.value = ''
  playlist.value = null
  selected.value = []

  const playlistId = getPlaylistId(url.value)
  if (!playlistId) {
    error.value = "URL invalide — colle l'URL complète d'une playlist YouTube"
    return
  }

  fetching.value = true
  try {
    const res = await fetch(`/proxy/playlist?id=${playlistId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    playlist.value = data
    selected.value = data.tracks.map((t: PlaylistTrack) => t.videoId)
  } catch (e: any) {
    error.value = e.message || 'Impossible de charger la playlist.'
  } finally {
    fetching.value = false
  }
}

const importSelected = async () => {
  if (!playlist.value || selected.value.length === 0) return
  importing.value = true
  try {
    const toImport = playlist.value.tracks.filter(t => selected.value.includes(t.videoId))
    for (const track of toImport) {
      await props.addTrack({
        video_id: track.videoId,
        title: track.title,
        artist: track.artist || undefined,
        duration: track.duration,
      })
    }
    emit('done')
    url.value = ''
    playlist.value = null
    selected.value = []
  } finally {
    importing.value = false
  }
}
</script>
