<template>
  <div class="flex flex-col gap-2 rounded-lg px-2 py-2 hover:bg-base-300 transition-colors">
    <!-- Thumbnail + title (full width) -->
    <div class="flex gap-3">
      <!-- Thumbnail with play/stop preview overlay -->
      <button
        type="button"
        class="relative w-14 h-14 shrink-0 self-start rounded overflow-hidden group/thumb"
        :title="previewing ? t('track.stop_preview') : t('track.play_preview')"
        @click="$emit('preview', video, startSeconds)"
      >
        <img
          :src="`https://img.youtube.com/vi/${video.videoId}/default.jpg`"
          class="w-full h-full object-cover bg-base-300"
          loading="lazy"
        />
        <span class="absolute inset-0 flex items-center justify-center bg-black/40 group-hover/thumb:bg-black/60 transition-colors text-white">
          <span :class="previewing ? 'i-fa-solid-stop' : 'i-fa-solid-play'"></span>
        </span>
      </button>
      <div class="min-w-0 flex-1 self-center">
        <p class="text-sm font-medium truncate">{{ video.title }}</p>
        <p class="text-xs text-base-content/50 truncate">
          <span v-if="video.artist">{{ video.artist }}</span>
          <span v-if="video.artist && video.duration"> · </span>
          <span v-if="video.duration">{{ formatDuration(video.duration) }}</span>
        </p>
      </div>
    </div>

    <!-- Timing fields + add button -->
    <div class="flex gap-3">
      <div class="flex-1 min-w-0 flex flex-col gap-1.5 sm:flex-row sm:gap-3">
        <div class="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-0.5">
          <span class="text-xs text-base-content/50 w-28 sm:w-auto shrink-0">{{ t('track.start_label') }}</span>
          <div class="flex items-center gap-1">
            <label class="input input-xs w-20 shrink-0" :class="{ 'opacity-60': added }">
              <input
                v-model.number="startSeconds"
                type="number"
                min="0"
                class="grow w-full min-w-0 text-center"
                placeholder="0"
                :title="t('track.start_title')"
                :disabled="added"
              />
              <span class="opacity-50">s</span>
            </label>
            <button
              v-if="getPreviewTime && previewing && !added"
              type="button"
              class="btn btn-xs btn-ghost shrink-0 text-primary"
              :title="t('track.capture_start_title')"
              @click="captureStart"
            >
              <span class="i-fa-solid-flag text-xs"></span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-0.5">
          <span class="text-xs text-base-content/50 w-28 sm:w-auto shrink-0">{{ t('track.playback_duration_label') }}</span>
          <div class="flex items-center gap-1">
            <label class="input input-xs w-20 shrink-0" :class="{ 'opacity-60': added }">
              <input
                v-model.number="playbackDuration"
                type="number"
                min="1"
                class="grow w-full min-w-0 text-center"
                placeholder="0"
                :title="t('track.playback_duration_title')"
                :disabled="added"
              />
              <span class="opacity-50">s</span>
            </label>
            <button
              v-if="getPreviewTime && previewing && !added"
              type="button"
              class="btn btn-xs btn-ghost shrink-0 text-base-content/50"
              :title="t('track.capture_end_title')"
              @click="captureEnd"
            >
              <span class="i-fa-solid-stop text-xs"></span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-0.5">
          <span class="text-xs text-base-content/50 w-28 sm:w-auto shrink-0">{{ t('track.reveal_seconds_label') }}</span>
          <div class="flex items-center gap-1">
            <label class="input input-xs w-20 shrink-0" :class="{ 'opacity-60': added }">
              <input
                v-model.number="revealSeconds"
                type="number"
                min="0"
                class="grow w-full min-w-0 text-center"
                placeholder="0"
                :title="t('track.reveal_seconds_title')"
                :disabled="added"
              />
              <span class="opacity-50">s</span>
            </label>
            <button
              v-if="getPreviewTime && previewing && !added"
              type="button"
              class="btn btn-xs btn-ghost shrink-0 text-base-content/50"
              :title="t('track.capture_reveal_title')"
              @click="captureReveal"
            >
              <span class="i-fa-solid-flag text-xs"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Add / undo button: aligned with the fields, full height of that block -->
      <button
        v-if="added"
        class="btn btn-success btn-outline shrink-0 group h-auto flex-col gap-1 self-stretch sm:self-center sm:flex-row sm:btn-sm"
        :title="t('track.undo_title')"
        @click="$emit('remove', video)"
      >
        <span class="i-fa-solid-check group-hover:hidden"></span>
        <span class="i-fa-solid-xmark hidden group-hover:inline"></span>
        <span class="group-hover:hidden">{{ t('track.added') }}</span>
        <span class="hidden group-hover:inline">{{ t('track.undo') }}</span>
      </button>
      <button
        v-else
        class="btn btn-primary shrink-0 h-auto flex-col gap-1 self-stretch sm:self-center sm:flex-row sm:btn-sm"
        :disabled="disabled"
        @click="$emit('add', video, startSeconds, playbackDuration || null, revealSeconds || null)"
      >
        <span class="i-fa-solid-plus"></span>
        <span>{{ t('track.add') }}</span>
      </button>
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
  remove: [video: SearchVideo]
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
