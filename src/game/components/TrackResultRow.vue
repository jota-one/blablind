<template>
  <div class="flex gap-2 rounded-lg px-2 py-2 hover:bg-base-300 transition-colors">
    <img
      :src="`https://img.youtube.com/vi/${video.videoId}/default.jpg`"
      class="w-12 h-12 object-cover rounded shrink-0 bg-base-300 self-center"
      loading="lazy"
    />
    <div class="flex-1 min-w-0 flex flex-col gap-1.5">
      <div class="min-w-0">
        <p class="text-sm font-medium truncate">{{ video.title }}</p>
        <p class="text-xs text-base-content/50 truncate">
          <span v-if="video.artist">{{ video.artist }}</span>
          <span v-if="video.artist && video.duration"> · </span>
          <span v-if="video.duration">{{ formatDuration(video.duration) }}</span>
        </p>
      </div>
      <div class="flex items-center gap-1.5">
        <input
          v-model.number="startSeconds"
          type="number"
          min="0"
          placeholder="0s"
          class="input input-xs w-16 text-center shrink-0"
          :title="t('track.start_title')"
        />
        <button
          v-if="getPreviewTime && previewing"
          class="btn btn-xs btn-ghost shrink-0 text-primary"
          :title="t('track.capture_start_title')"
          @click="captureStart"
        >
          <span class="i-fa-solid-flag text-xs"></span>
        </button>
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
          :disabled="added || disabled"
          @click="$emit('add', video, startSeconds, playbackDuration || null, revealSeconds || null)"
        >
          <span :class="added ? 'i-fa-solid-check' : 'i-fa-solid-plus'"></span>
          <span>{{ added ? t('track.added') : t('track.add') }}</span>
        </button>
      </div>
      <div class="flex items-center gap-1.5 text-xs">
        <span class="text-base-content/40 shrink-0">{{ t('track.playback_duration_label') }}</span>
        <input
          v-model.number="playbackDuration"
          type="number"
          min="1"
          class="input input-xs w-16 text-center shrink-0"
          :placeholder="t('track.playback_duration_placeholder')"
          :title="t('track.playback_duration_title')"
        />
        <button
          v-if="getPreviewTime && previewing"
          class="btn btn-xs btn-ghost shrink-0 text-base-content/50"
          :title="t('track.capture_end_title')"
          @click="captureEnd"
        >
          <span class="i-fa-solid-stop text-xs"></span>
        </button>
        <span class="text-base-content/20 shrink-0">·</span>
        <span class="text-base-content/40 shrink-0">{{ t('track.reveal_seconds_label') }}</span>
        <input
          v-model.number="revealSeconds"
          type="number"
          min="0"
          class="input input-xs w-16 text-center shrink-0"
          :placeholder="t('track.reveal_seconds_placeholder')"
          :title="t('track.reveal_seconds_title')"
        />
        <button
          v-if="getPreviewTime && previewing"
          class="btn btn-xs btn-ghost shrink-0 text-base-content/50"
          :title="t('track.capture_reveal_title')"
          @click="captureReveal"
        >
          <span class="i-fa-solid-flag text-xs"></span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI36n } from '@jota-one/i36n'

const { t } = useI36n()

interface SearchVideo { videoId: string; title: string; artist: string; duration: number }

type Props = {
  video: SearchVideo
  added: boolean
  previewing: boolean
  disabled?: boolean
  getPreviewTime?: () => number
}

const props = defineProps<Props>()
defineEmits<{
  add: [video: SearchVideo, startSeconds: number, playbackDuration: number | null, revealSeconds: number | null]
  preview: [video: SearchVideo, startSeconds: number]
}>()

const startSeconds = ref(0)
const playbackDuration = ref(0)
const revealSeconds = ref(0)

const captureStart = () => { startSeconds.value = Math.floor(props.getPreviewTime!()) }
const captureEnd = () => { playbackDuration.value = Math.max(1, Math.floor(props.getPreviewTime!()) - startSeconds.value) }
const captureReveal = () => { revealSeconds.value = Math.floor(props.getPreviewTime!()) }

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
</script>
