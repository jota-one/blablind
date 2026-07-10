<template>
  <div class="space-y-3">

    <!-- Preview player -->
    <div v-if="previewInfo" class="rounded-lg overflow-hidden aspect-video max-w-md mx-auto">
      <YoutubePlayer
        :key="`${previewInfo.videoId}-${previewInfo.startSeconds}`"
        ref="previewPlayer"
        :video-id="previewInfo.videoId"
        :start-seconds="previewInfo.startSeconds"
        :paused="false"
        autoplay
      />
    </div>

    <p v-if="favorites.length === 0" class="text-sm text-base-content/40 text-center py-4">
      {{ t('favorites.empty') }}
    </p>
    <ul v-else class="space-y-1">
      <li v-for="favorite in favorites" :key="favorite.id">
        <TrackResultRow
          :video="toSearchVideo(favorite)"
          :added="addedIds.has(favorite.expand?.video?.video_id)"
          :disabled="disabled"
          :previewing="previewInfo?.videoId === favorite.expand?.video?.video_id"
          :get-preview-time="previewInfo?.videoId === favorite.expand?.video?.video_id ? getPreviewTime : undefined"
          :initial-start="favorite.start_seconds ?? 0"
          @add="addVideo"
          @remove="removeVideo"
          @preview="togglePreview"
        />
      </li>
    </ul>

  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import TrackResultRow from '@game/components/TrackResultRow.vue'
import YoutubePlayer from '@game/components/YoutubePlayer.vue'

const { t } = useI36n()

interface SearchVideo { videoId: string; title: string; artist: string; duration: number }

type Props = {
  favorites: any[]
  addTrack: (data: { video_id: string; title?: string; artist?: string; duration?: number; start_seconds?: number; playback_duration?: number; reveal_seconds?: number }) => Promise<{ id: string } | void> | undefined
  removeTrack: (trackId: string) => Promise<void>
  disabled?: boolean
}

const props = defineProps<Props>()

const addedIds = ref(new Set<string>())
const addedTrackIds = new Map<string, string>()
const previewInfo = ref<{ videoId: string; startSeconds: number } | null>(null)

const previewPlayer = useTemplateRef<InstanceType<typeof YoutubePlayer>>('previewPlayer')
const getPreviewTime = () => previewPlayer.value?.getCurrentTime() ?? 0

const toSearchVideo = (favorite: any): SearchVideo => {
  const video = favorite.expand?.video
  return { videoId: video?.video_id, title: video?.title, artist: video?.artist, duration: video?.duration }
}

const togglePreview = (video: SearchVideo, startSeconds: number) => {
  if (previewInfo.value?.videoId === video.videoId && previewInfo.value?.startSeconds === startSeconds) {
    previewInfo.value = null
  } else {
    previewInfo.value = { videoId: video.videoId, startSeconds }
  }
}

const stopPreview = () => {
  previewInfo.value = null
}

const addVideo = async (video: SearchVideo, startSeconds: number, playbackDuration: number | null, revealSeconds: number | null) => {
  addedIds.value = new Set([...addedIds.value, video.videoId])
  if (previewInfo.value?.videoId === video.videoId) {
    previewInfo.value = null
  }
  const track = await props.addTrack({
    video_id: video.videoId,
    title: video.title,
    artist: video.artist,
    duration: video.duration,
    start_seconds: startSeconds || undefined,
    playback_duration: playbackDuration ?? undefined,
    reveal_seconds: revealSeconds ?? undefined,
  })
  if (track) {
    addedTrackIds.set(video.videoId, track.id)
  }
}

const removeVideo = async (video: SearchVideo) => {
  const trackId = addedTrackIds.get(video.videoId)
  if (!trackId) {
    return
  }
  await props.removeTrack(trackId)
  addedTrackIds.delete(video.videoId)
  const next = new Set(addedIds.value)
  next.delete(video.videoId)
  addedIds.value = next
}

defineExpose({ stopPreview })
</script>
