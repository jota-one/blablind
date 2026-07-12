<template>
  <div class="space-y-8">
    <section>
      <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
        <span class="i-fa-solid-list-ol text-primary"></span>
        {{ t('playlists.title') }}
      </h2>

      <form class="flex gap-2 mb-4" @submit.prevent="createPlaylist">
        <input
          v-model="newName"
          type="text"
          :placeholder="t('playlists.name_placeholder')"
          class="input input-bordered flex-1"
        />
        <button type="submit" class="btn btn-primary" :disabled="!newName.trim() || creating">
          <span v-if="creating" class="loading loading-spinner loading-sm"></span>
          <span v-else class="i-fa-solid-plus"></span>
          {{ t('playlists.create') }}
        </button>
      </form>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-sm"></span>
      </div>

      <ul v-else-if="playlists.length > 0" class="space-y-2">
        <li
          v-for="playlist in playlists"
          :key="playlist.id"
          class="flex items-center gap-3 rounded-lg bg-base-200 px-3 py-2"
        >
          <RouterLink :to="`/playlists/${playlist.id}`" class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">
              {{ playlist.name }}
              <span v-if="playlist.public" class="badge badge-xs badge-info ml-1 align-middle">
                {{ t('playlists.public_badge') }}
              </span>
            </p>
            <p class="text-xs text-base-content/50 truncate">
              {{ t('playlists.track_count', { count: trackCount(playlist) }) }}
              <template v-if="tags(playlist).length"> · {{ tags(playlist).join(', ') }}</template>
            </p>
          </RouterLink>
          <RouterLink
            :to="`/playlists/${playlist.id}`"
            class="btn btn-xs btn-ghost btn-circle shrink-0 text-base-content/40"
            :title="t('playlists.edit')"
          >
            <span class="i-fa-solid-pen"></span>
          </RouterLink>
          <button
            v-if="deleteConfirmId === playlist.id"
            class="btn btn-xs btn-error shrink-0"
            @click="removePlaylist(playlist)"
          >
            {{ t('playlists.delete_confirm') }}
          </button>
          <button
            v-else
            class="btn btn-xs btn-ghost btn-circle shrink-0 text-base-content/40 hover:text-error"
            :title="t('playlists.delete')"
            @click="deleteConfirmId = playlist.id"
          >
            <span class="i-fa-solid-trash"></span>
          </button>
        </li>
      </ul>

      <p v-else class="text-sm text-base-content/40 text-center py-8">
        {{ t('playlists.empty') }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'

const { t } = useI36n()
const { user, pb } = useAuth()
const router = useRouter()

const playlists = ref<any[]>([])
const loading = ref(false)
const creating = ref(false)
const newName = ref('')
const deleteConfirmId = ref<string | null>(null)

const trackCount = (playlist: any) => playlist.expand?.playlist_tracks_via_playlist?.length ?? 0
const tags = (playlist: any) => (Array.isArray(playlist.tags) ? playlist.tags : [])

const loadPlaylists = async () => {
  if (!user.value?.id) { return }
  loading.value = true
  try {
    playlists.value = await pb.collection('playlists').getFullList({
      filter: pb.filter('owner = {:owner}', { owner: user.value.id }),
      expand: 'playlist_tracks_via_playlist',
      sort: '-updated',
      requestKey: null,
    })
  } finally {
    loading.value = false
  }
}

watch(() => user.value?.id, (id) => { if (id) { loadPlaylists() } }, { immediate: true })

const createPlaylist = async () => {
  const name = newName.value.trim()
  if (!name || !user.value?.id) { return }
  creating.value = true
  try {
    const playlist = await pb.collection('playlists').create({ name, owner: user.value.id })
    router.push(`/playlists/${playlist.id}`)
  } finally {
    creating.value = false
  }
}

const removePlaylist = async (playlist: any) => {
  await pb.collection('playlists').delete(playlist.id)
  playlists.value = playlists.value.filter(p => p.id !== playlist.id)
  deleteConfirmId.value = null
}
</script>
