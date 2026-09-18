<template>
  <div :class="wrap">
    <div v-for="field in fields" :key="field.key" class="flex items-center gap-1">
      <span class="text-xs text-base-content/50 w-28 shrink-0">{{ t(field.label) }}</span>
      <label class="input input-xs w-20 px-2 shrink-0">
        <input
          v-model.number="track[field.key]"
          type="number"
          min="0"
          class="grow w-full min-w-0 text-center"
          :title="t(field.title)"
          @change="emit('save')"
        />
        <span class="opacity-50">s</span>
      </label>

      <!-- Positions can be auditioned; a duration cannot. -->
      <button
        v-if="field.position"
        type="button"
        class="btn btn-xs btn-ghost shrink-0 px-1"
        :title="isPreviewingAt(field) ? t('track.stop_preview') : t('track.play_preview')"
        @click="emit('preview', value(field), excerptFor(field))"
      >
        <span :class="[isPreviewingAt(field) ? 'i-fa-solid-stop' : 'i-fa-solid-play', 'text-xs']"></span>
      </button>

      <button
        v-if="getPreviewTime"
        type="button"
        class="btn btn-xs btn-ghost shrink-0 text-primary px-1"
        :title="t(field.captureTitle)"
        @click="capture(field)"
      >
        <span :class="[field.icon, 'text-xs']"></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI36n } from '@jota-one/i36n'

const { t } = useI36n()

type TimingKey = 'start_seconds' | 'playback_duration' | 'reveal_seconds'

type Field = {
  key: TimingKey
  label: string
  title: string
  captureTitle: string
  icon: string
  // A timestamp the player can jump to, as opposed to a duration.
  position: boolean
}

type Props = {
  // Mutated in place: both callers hold the record and persist it on 'save'.
  track: Record<TimingKey, number | null>
  // Position currently previewed for THIS track, null when it is not playing.
  previewingAt?: number | null
  // Only provided while previewing, which is also what reveals the capture buttons.
  getPreviewTime?: () => number
  wrap?: string
}

const props = withDefaults(defineProps<Props>(), {
  previewingAt: null,
  wrap: 'flex flex-wrap gap-x-4 gap-y-1',
})

const emit = defineEmits<{
  save: []
  // The excerpt length applies to the start only: a reveal position is a resume
  // point, it is meant to run on.
  preview: [seconds: number, durationSeconds: number | null]
}>()

const fields: Field[] = [
  {
    key: 'start_seconds',
    label: 'track.start_label',
    title: 'track.start_title',
    captureTitle: 'track.capture_start_title',
    icon: 'i-fa-solid-flag',
    position: true,
  },
  {
    key: 'playback_duration',
    label: 'track.playback_duration_label',
    title: 'track.playback_duration_title',
    captureTitle: 'track.capture_end_title',
    icon: 'i-fa-solid-flag-checkered',
    position: false,
  },
  {
    key: 'reveal_seconds',
    label: 'track.reveal_seconds_label',
    title: 'track.reveal_seconds_title',
    captureTitle: 'track.capture_reveal_title',
    icon: 'i-fa-solid-eye',
    position: true,
  },
]

const value = (field: Field) => Math.max(0, Math.floor(props.track[field.key] || 0))

const excerptFor = (field: Field) =>
  field.key === 'start_seconds' ? props.track.playback_duration || null : null

const isPreviewingAt = (field: Field) =>
  props.previewingAt !== null && props.previewingAt === value(field)

const capture = (field: Field) => {
  const at = Math.floor(props.getPreviewTime!())
  props.track[field.key] =
    field.key === 'playback_duration'
      ? Math.max(1, at - (props.track.start_seconds ?? 0))
      : at
  emit('save')
}
</script>
