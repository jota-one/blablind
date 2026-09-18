import { onUnmounted, ref } from 'vue'

export type PreviewInfo = {
  videoId: string
  startSeconds: number
  // Excerpt length for this preview, when the position is a start. A reveal
  // position is a resume point and runs on.
  durationSeconds: number | null
}

// In-app preview shared by the favorites list and the playlist editor: both
// audition a track from a chosen position and need the excerpt to stop where
// the playback duration says it should.
export default function useTrackPreview(options: { onStart?: () => void } = {}) {
  const player = ref<{ getCurrentTime: () => number } | null>(null)
  const info = ref<PreviewInfo | null>(null)
  const paused = ref(false)

  let excerptTimer: ReturnType<typeof setTimeout> | undefined
  const clearTimer = () => {
    if (excerptTimer) {
      clearTimeout(excerptTimer)
      excerptTimer = undefined
    }
  }

  const isPreviewing = (videoId?: string) => !!videoId && info.value?.videoId === videoId

  const isPreviewingAt = (videoId: string | undefined, seconds: number) =>
    isPreviewing(videoId) && info.value?.startSeconds === seconds

  const stop = () => {
    clearTimer()
    paused.value = false
    info.value = null
  }

  const playAt = (videoId: string, seconds: number, durationSeconds: number | null = null) => {
    clearTimer()
    options.onStart?.()
    paused.value = false
    info.value = {
      videoId,
      startSeconds: Math.max(0, Math.floor(seconds || 0)),
      durationSeconds: durationSeconds && durationSeconds > 0 ? Math.floor(durationSeconds) : null,
    }
  }

  const toggleAt = (videoId: string, seconds: number, durationSeconds: number | null = null) => {
    const at = Math.max(0, Math.floor(seconds || 0))
    if (isPreviewingAt(videoId, at)) {
      stop()
    } else {
      playAt(videoId, at, durationSeconds)
    }
  }

  // Armed on the player's own 'playing' event rather than at click time, so
  // buffering does not eat part of the excerpt.
  const onPlaying = () => {
    clearTimer()
    const seconds = info.value?.durationSeconds
    if (seconds) {
      excerptTimer = setTimeout(() => {
        paused.value = true
      }, seconds * 1000)
    }
  }

  const currentTime = () => Math.floor(player.value?.getCurrentTime?.() ?? 0)

  onUnmounted(clearTimer)

  return { player, info, paused, isPreviewing, isPreviewingAt, playAt, toggleAt, stop, onPlaying, currentTime }
}
