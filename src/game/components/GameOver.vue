<template>
  <div class="flex flex-col items-center gap-8 p-6 text-center">

    <div>
      <p class="text-5xl mb-2">🏆</p>
      <h2 class="text-2xl font-bold font-display">{{ t('gameover.title') }}</h2>
      <p v-if="sorted[0]" class="text-base-content/60 mt-1">
        {{ t('gameover.bravo', { name: sorted[0].name }) }}
      </p>
    </div>

    <!-- Podium -->
    <div v-if="sorted.length >= 2" class="flex items-end justify-center gap-3 w-full max-w-sm">

      <!-- 2ème -->
      <div class="flex flex-col items-center gap-2 flex-1">
        <span class="text-2xl">🥈</span>
        <p class="text-sm font-semibold truncate w-full" :class="sorted[1]?.id === currentPlayer.id ? 'text-primary' : ''">{{ sorted[1]?.name }}</p>
        <p class="text-lg font-bold font-mono">{{ scoreLabel(sorted[1]) }}</p>
        <div class="w-full bg-base-content/20 rounded-t-lg h-20 flex items-center justify-center text-2xl font-bold text-base-content/40">2</div>
      </div>

      <!-- 1er -->
      <div class="flex flex-col items-center gap-2 flex-1">
        <span class="text-3xl">🥇</span>
        <p class="text-sm font-bold truncate w-full text-warning" :class="sorted[0]?.id === currentPlayer.id ? 'text-primary' : ''">{{ sorted[0]?.name }}</p>
        <p class="text-xl font-bold font-mono text-warning">{{ scoreLabel(sorted[0]) }}</p>
        <div class="w-full bg-warning/30 rounded-t-lg h-32 flex items-center justify-center text-2xl font-bold text-warning/60">1</div>
      </div>

      <!-- 3ème -->
      <div v-if="sorted[2]" class="flex flex-col items-center gap-2 flex-1">
        <span class="text-xl">🥉</span>
        <p class="text-sm font-semibold truncate w-full" :class="sorted[2]?.id === currentPlayer.id ? 'text-primary' : ''">{{ sorted[2]?.name }}</p>
        <p class="text-lg font-bold font-mono">{{ scoreLabel(sorted[2]) }}</p>
        <div class="w-full bg-base-content/10 rounded-t-lg h-16 flex items-center justify-center text-2xl font-bold text-base-content/30">3</div>
      </div>

    </div>

    <!-- Classement complet (si > 3 joueurs) -->
    <div v-if="sorted.length > 3" class="w-full max-w-sm space-y-1">
      <p class="text-xs text-base-content/40 uppercase tracking-wide mb-2">{{ t('gameover.ranking_rest') }}</p>
      <div
        v-for="(p, i) in sorted.slice(3)"
        :key="p.id"
        :class="['flex items-center gap-3 rounded-lg px-3 py-2', p.id === currentPlayer.id ? 'bg-primary/10 border border-primary/30' : 'bg-base-200']"
      >
        <span class="text-sm text-base-content/40 w-4">{{ i + 4 }}</span>
        <span class="flex-1 text-sm font-medium truncate">{{ p.name }}</span>
        <span class="font-mono font-bold">{{ scoreLabel(p) }}</span>
      </div>
    </div>

    <!-- Played tracks: last chance to favorite a discovery before leaving -->
    <div v-if="doneTracks.length > 0" class="w-full max-w-sm space-y-1 text-left">
      <p class="text-xs text-base-content/40 uppercase tracking-wide mb-2">{{ t('gameover.tracks_title') }}</p>
      <div
        v-for="track in doneTracks"
        :key="track.id"
        class="flex items-center gap-3 rounded-lg px-3 py-2 bg-base-200"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ track.expand?.video?.title || t('room.no_title') }}</p>
          <p v-if="track.expand?.video?.artist" class="text-xs text-base-content/50 truncate">{{ track.expand?.video?.artist }}</p>
        </div>
        <FavoriteButton :active="isFavorite(track)" @toggle="$emit('toggleFavorite', track)" />
      </div>
    </div>

    <a href="/" class="btn btn-ghost">{{ t('gameover.back_home') }}</a>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI36n } from '@jota-one/i36n'
import FavoriteButton from '@game/components/FavoriteButton.vue'

const { t } = useI36n()

type Props = {
  players: any[]
  currentPlayer: any
  doneTracks: any[]
  isFavorite: (track: any) => boolean
}

const props = defineProps<Props>()
defineEmits<{ toggleFavorite: [track: any] }>()

const playerRatio = (player: any) => {
  const guessable = props.doneTracks.filter(t => t.added_by !== player.id).length
  const guessed = props.doneTracks.filter(t => t.solved_by === player.id).length
  return { guessed, guessable, ratio: guessable > 0 ? guessed / guessable : 0 }
}

const scoreLabel = (player: any) => {
  if (!player) return ''
  const { guessed, guessable, ratio } = playerRatio(player)
  if (guessable === 0) return '—'
  return `${parseFloat((ratio * 100).toFixed(2))}% (${guessed}/${guessable})`
}

const sorted = computed(() =>
  [...props.players].sort((a, b) => {
    const ra = playerRatio(a)
    const rb = playerRatio(b)
    if (rb.ratio !== ra.ratio) return rb.ratio - ra.ratio
    return rb.guessed - ra.guessed
  })
)
</script>
