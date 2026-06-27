<template>
  <div v-if="hasTiming" class="flex items-center gap-2 text-xs text-base-content/50">
    <span v-if="track.start_seconds" class="inline-flex items-center gap-1" :title="t('track.start_title')">
      <span class="i-fa-solid-play text-[0.6rem]"></span>{{ formatTime(track.start_seconds) }}
    </span>
    <span v-if="track.playback_duration" class="inline-flex items-center gap-1" :title="t('track.playback_duration_title')">
      <span class="i-fa-solid-stopwatch text-[0.7rem]"></span>{{ track.playback_duration }}s
    </span>
    <span v-if="track.reveal_seconds" class="inline-flex items-center gap-1" :title="t('track.reveal_seconds_title')">
      <span class="i-fa-solid-flag text-[0.6rem]"></span>{{ formatTime(track.reveal_seconds) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI36n } from '@jota-one/i36n'

const { t } = useI36n()

type Props = {
  track: { start_seconds?: number; playback_duration?: number; reveal_seconds?: number }
}

const props = defineProps<Props>()

const hasTiming = computed(() =>
  !!props.track.start_seconds || !!props.track.playback_duration || !!props.track.reveal_seconds,
)

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
</script>
