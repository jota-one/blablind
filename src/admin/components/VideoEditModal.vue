<template>
  <dialog ref="dialog" class="modal">
    <div class="modal-box max-w-lg">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <h3 class="font-bold text-lg mb-4">Modifier le morceau</h3>

      <div class="mb-4 p-3 bg-base-200 rounded-lg">
        <div class="text-xs text-base-content/60 mb-1">Video ID</div>
        <a
          :href="`https://youtube.com/watch?v=${videoId}`"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 link link-hover font-mono text-sm"
        >
          {{ videoId }}
          <span class="i-fa-solid-arrow-up-right-from-square text-xs opacity-60"></span>
        </a>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="label">
            <span class="label-text">Titre</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            placeholder="Titre du morceau…"
            class="input input-bordered w-full"
            required
          />
        </div>

        <div>
          <label class="label">
            <span class="label-text">Artiste</span>
          </label>
          <input
            v-model="form.artist"
            type="text"
            placeholder="Nom de l'artiste…"
            class="input input-bordered w-full"
            required
          />
        </div>

        <div>
          <label class="label">
            <span class="label-text">Durée (secondes)</span>
          </label>
          <input
            v-model.number="form.duration"
            type="number"
            min="0"
            placeholder="Durée en secondes"
            class="input input-bordered w-full"
          />
        </div>

        <div v-if="errorMessage" class="alert alert-error">
          <span>{{ errorMessage }}</span>
        </div>

        <div class="modal-action">
          <button type="button" @click="close" class="btn">Annuler</button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ loading ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import useVideos, { type TVideo } from '@admin/composables/useVideos'

const { updateVideo } = useVideos()
const emit = defineEmits<{ saved: [] }>()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const videoId = ref('')
const currentId = ref('')
const form = ref({ title: '', artist: '', duration: 0 })
const errorMessage = ref('')
const loading = ref(false)

const open = (video: TVideo) => {
  currentId.value = video.id
  videoId.value = video.video_id
  form.value = {
    title: video.title || '',
    artist: video.artist || '',
    duration: video.duration || 0,
  }
  errorMessage.value = ''
  dialog.value?.showModal()
}

const close = () => {
  dialog.value?.close()
}

const handleSubmit = async () => {
  errorMessage.value = ''
  loading.value = true
  try {
    await updateVideo(currentId.value, form.value)
    emit('saved')
    close()
  } catch (error: any) {
    console.error('Error updating video:', error)
    errorMessage.value = error.message || 'Erreur lors de la sauvegarde'
  } finally {
    loading.value = false
  }
}

defineExpose({ open, close })
</script>
