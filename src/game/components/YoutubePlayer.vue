<template>
  <div class="aspect-video w-full bg-black rounded-lg overflow-hidden">
    <div ref="playerEl" class="w-full h-full"></div>
  </div>
</template>

<style scoped>
.aspect-video :deep(iframe) {
  width: 100%;
  height: 100%;
}
</style>

<script setup lang="ts">
import { watch, onMounted, onUnmounted, useTemplateRef } from 'vue'

const props = defineProps<{
  videoId: string | null
  startSeconds: number
  paused: boolean
  autoplay?: boolean
  // Declarative seek: bump the token to seek to `seconds` (even to the same
  // position twice). The player applies it once it is ready.
  seekRequest?: { seconds: number; token: number } | null
}>()

const emit = defineEmits<{ playing: [] }>()

const playerEl = useTemplateRef<HTMLElement>('playerEl')
let ytPlayer: any = null
let playerReadyPromise: Promise<void> = Promise.resolve()
let playerReadyResolve: (() => void) | null = null

const ytReady = (): Promise<void> => {
  const w = window as any
  if (w.YT?.Player) return Promise.resolve()
  return new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => { prev?.(); resolve() }
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    }
  })
}

const createPlayer = (videoId: string) => {
  if (!playerEl.value) return
  playerEl.value.innerHTML = ''
  const container = document.createElement('div')
  playerEl.value.appendChild(container)
  playerReadyPromise = new Promise((resolve) => { playerReadyResolve = resolve })
  ytPlayer = new (window as any).YT.Player(container, {
    videoId,
    playerVars: { start: props.startSeconds, autoplay: props.autoplay ? 1 : 0, controls: 1, rel: 0, modestbranding: 1, playsinline: 1 },
    events: {
      onReady: () => { playerReadyResolve?.(); if (props.autoplay) ytPlayer?.playVideo() },
      onStateChange: (e: any) => {
        if (e.data === 1) emit('playing')
        // YouTube re-claims the media session on each state change — re-claim it,
        // and (re)start the silent loop in case its first play() was blocked.
        startSilentAudio()
        claimMediaSession()
      },
    },
  })
}

// The YouTube iframe is cross-origin and owns its OWN navigator.mediaSession, so
// it sets the song title + cover art in the OS / browser "Now Playing" widget —
// which leaks the answer when the player switches tab. We can't reach the
// iframe's session from here, so instead the parent page plays a truly-silent
// (but full-volume, hence "active") audio loop and claims the media session with
// neutral metadata, making it win over YouTube's.
let mediaSessionTimer: ReturnType<typeof setInterval> | undefined
let silentAudio: HTMLAudioElement | undefined
let silentUrl = ''

const makeSilentWavUrl = () => {
  const sampleRate = 8000
  const numSamples = sampleRate // 1s loop
  const buffer = new ArrayBuffer(44 + numSamples)
  const view = new DataView(buffer)
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) { view.setUint8(off + i, s.charCodeAt(i)) } }
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + numSamples, true); writeStr(8, 'WAVE')
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true)
  writeStr(36, 'data'); view.setUint32(40, numSamples, true)
  for (let i = 0; i < numSamples; i++) { view.setUint8(44 + i, 128) } // 8-bit midpoint = silence
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

const claimMediaSession = () => {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'Blablind', artist: '', album: '', artwork: [] })
    navigator.mediaSession.playbackState = 'playing'
    for (const a of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto', 'stop'] as const) {
      try { navigator.mediaSession.setActionHandler(a, () => {}) } catch (_) { /* unsupported action */ }
    }
  } catch (_) { /* MediaMetadata unsupported — ignore */ }
}

const startSilentAudio = () => {
  if (silentAudio) return
  silentUrl = makeSilentWavUrl()
  silentAudio = new Audio(silentUrl)
  silentAudio.loop = true
  silentAudio.play().catch(() => { /* needs a gesture — retried on state change */ })
}

const onVisibilityChange = () => { if (document.hidden) { startSilentAudio(); claimMediaSession() } }

onMounted(async () => {
  startSilentAudio()
  claimMediaSession()
  mediaSessionTimer = setInterval(claimMediaSession, 1000)
  document.addEventListener('visibilitychange', onVisibilityChange)
  await ytReady()
  if (props.videoId) createPlayer(props.videoId)
})

watch(() => props.videoId, async (newId) => {
  await ytReady()
  if (!newId) { await playerReadyPromise; ytPlayer?.stopVideo(); return }
  if (ytPlayer) { await playerReadyPromise; ytPlayer.loadVideoById({ videoId: newId, startSeconds: props.startSeconds }) }
  else createPlayer(newId)
})

watch(() => props.paused, (paused) => {
  if (!ytPlayer) return
  paused ? ytPlayer.pauseVideo() : ytPlayer.playVideo()
})

watch(() => props.seekRequest?.token, async () => {
  const req = props.seekRequest
  if (!req) return
  await ytReady()
  await playerReadyPromise
  // seekTo(_, true) keeps the current play/pause state, owned by the paused prop.
  ytPlayer?.seekTo(req.seconds, true)
})

onUnmounted(() => {
  ytPlayer?.destroy(); ytPlayer = null
  if (mediaSessionTimer) clearInterval(mediaSessionTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  silentAudio?.pause(); silentAudio = undefined
  if (silentUrl) { URL.revokeObjectURL(silentUrl); silentUrl = '' }
})

defineExpose({
  getCurrentTime: () => ytPlayer?.getCurrentTime() ?? 0,
})
</script>
