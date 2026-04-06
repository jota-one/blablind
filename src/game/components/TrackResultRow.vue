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
    <button
      class="btn btn-xs shrink-0"
      :class="added ? 'btn-success btn-outline' : 'btn-primary'"
      :disabled="added"
      @click="$emit('add', video)"
    >
      <span :class="added ? 'i-fa-solid-check' : 'i-fa-solid-plus'"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
interface SearchVideo { videoId: string; title: string; artist: string; duration: number }

defineProps<{ video: SearchVideo; added: boolean }>()
defineEmits<{ add: [video: SearchVideo] }>()

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
</script>
