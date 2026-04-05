<template>
  <div class="aspect-video w-full bg-black rounded-lg overflow-hidden">
    <div ref="playerEl" class="w-full h-full"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  videoId: string | null
  startSeconds: number
  paused: boolean
}>()

const emit = defineEmits<{ playing: [] }>()

const playerEl = ref<HTMLElement>()
let ytPlayer: any = null

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
  ytPlayer = new (window as any).YT.Player(container, {
    videoId,
    playerVars: { start: props.startSeconds, autoplay: 0, controls: 1, rel: 0, modestbranding: 1, playsinline: 1 },
    events: {
      onStateChange: (e: any) => {
        if (e.data === 1) emit('playing')
      },
    },
  })
}

onMounted(async () => {
  await ytReady()
  if (props.videoId) createPlayer(props.videoId)
})

watch(() => props.videoId, async (newId) => {
  await ytReady()
  if (!newId) { ytPlayer?.stopVideo(); return }
  if (ytPlayer) ytPlayer.loadVideoById({ videoId: newId, startSeconds: props.startSeconds })
  else createPlayer(newId)
})

watch(() => props.paused, (paused) => {
  if (!ytPlayer) return
  paused ? ytPlayer.pauseVideo() : ytPlayer.playVideo()
})

onUnmounted(() => { ytPlayer?.destroy(); ytPlayer = null })
</script>
