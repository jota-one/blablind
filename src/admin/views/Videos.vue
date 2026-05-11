<template>
  <div class="p-8">
    <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <span class="i-fa-solid-music"></span>
      Morceaux
    </h2>
    <div class="card">
      <div class="flex justify-end mb-2">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher (titre, artiste…)"
          class="input input-bordered input-sm w-64"
        />
      </div>
      <div class="text-sm text-base-content/60 mb-2">
        <span v-if="debouncedQuery">{{ videos.length }} résultat(s) pour « {{ debouncedQuery }} »</span>
        <span v-else>{{ videos.length }} chargés sur un total de {{ totalVideos }}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Artiste</th>
              <th>Durée</th>
              <th>Video ID</th>
              <th>Ajouté le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="video in videos" :key="video.id">
              <td>{{ video.title || '-' }}</td>
              <td>{{ video.artist || '-' }}</td>
              <td>{{ formatDuration(video.duration) }}</td>
              <td>
                <a
                  :href="`https://youtube.com/watch?v=${video.video_id}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 link link-hover font-mono text-sm"
                >
                  {{ video.video_id }}
                  <span class="i-fa-solid-arrow-up-right-from-square text-xs opacity-60"></span>
                </a>
              </td>
              <td>{{ formatDate(video.created) }}</td>
              <td>
                <div class="flex gap-2">
                  <button
                    class="btn btn-xs btn-ghost"
                    title="Modifier"
                    @click="editVideo(video)"
                  >
                    <span class="i-fa-solid-pen"></span>
                  </button>
                  <button
                    class="btn btn-xs btn-ghost text-red-600"
                    title="Supprimer"
                    @click="confirmDelete(video)"
                  >
                    <span class="i-fa-solid-trash"></span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <VideoEditModal ref="editModalRef" @saved="reload" />
    <ConfirmModal
      v-model="showDeleteModal"
      title="Supprimer le morceau ?"
      :message="deleteMessage"
      @confirm="deleteVideoConfirmed"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, useTemplateRef } from 'vue'
import { refDebounced } from '@vueuse/core'
import dayjs from 'dayjs'
import useVideos, { type TVideo } from '@admin/composables/useVideos'
import VideoEditModal from '@admin/components/VideoEditModal.vue'
import ConfirmModal from '@components/ConfirmModal.vue'

const { videos, totalVideos, loadVideos, deleteVideo } = useVideos()
const editModalRef = useTemplateRef<InstanceType<typeof VideoEditModal>>('editModalRef')

const searchQuery = ref('')
const debouncedQuery = refDebounced(searchQuery, 350)

const showDeleteModal = ref(false)
const videoToDelete = ref<TVideo | null>(null)
const deleteMessage = ref('')

watch(debouncedQuery, q => loadVideos(q))

const reload = () => loadVideos(debouncedQuery.value)

const formatDuration = (seconds: number) => {
  if (!seconds) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const formatDate = (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm')

const editVideo = (video: TVideo) => {
  editModalRef.value?.open(video)
}

const confirmDelete = (video: TVideo) => {
  videoToDelete.value = video
  deleteMessage.value = `Voulez-vous vraiment supprimer « ${video.title || video.video_id} » ? Cette action est irréversible.`
  showDeleteModal.value = true
}

const deleteVideoConfirmed = async () => {
  if (!videoToDelete.value) return
  try {
    await deleteVideo(videoToDelete.value.id)
    await reload()
    showDeleteModal.value = false
    videoToDelete.value = null
  } catch (error) {
    console.error('Error deleting video:', error)
  }
}

onMounted(loadVideos)
</script>
