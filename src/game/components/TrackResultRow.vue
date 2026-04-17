<template>
  <div class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-base-300 transition-colors">
    <img
      :src="`https://img.youtube.com/vi/${video.videoId}/default.jpg`"
      class="w-12 h-9 object-cover rounded shrink-0 bg-base-300"
      loading="lazy"
    />
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate">{{ video.title }}</p>
      <p class="text-xs text-base-content/50 truncate">
        <span v-if="video.artist">{{ video.artist }}</span>
        <span v-if="video.artist && video.duration"> · </span>
        <span v-if="video.duration">{{ formatDuration(video.duration) }}</span>
      </p>
    </div>
    <input
      v-model.number="startSeconds"
      type="number"
      min="0"
      placeholder="0s"
      class="input input-xs w-16 text-center shrink-0"
      :title="t('track.start_title')"
    />
    <button
      class="btn btn-xs btn-ghost shrink-0"
      :class="previewing ? 'text-error' : 'text-base-content/50'"
      @click="$emit('preview', video, startSeconds)"
    >
      <span :class="previewing ? 'i-fa-solid-stop' : 'i-fa-solid-play'"></span>
    </button>
    <button
      class="btn btn-xs shrink-0"
      :class="added ? 'btn-success btn-outline' : 'btn-primary'"
      :disabled="added"
      @click="$emit('add', video, startSeconds)"
    >
      <span :class="added ? 'i-fa-solid-check' : 'i-fa-solid-plus'"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI36n } from '@jota-one/i36n'

const { t } = useI36n()

interface SearchVideo { videoId: string; title: string; artist: string; duration: number }

defineProps<{ video: SearchVideo; added: boolean; previewing: boolean }>()
defineEmits<{ add: [video: SearchVideo, startSeconds: number]; preview: [video: SearchVideo, startSeconds: number] }>()

const startSeconds = ref(0)

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
</script>
