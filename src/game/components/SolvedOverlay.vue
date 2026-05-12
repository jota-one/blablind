<template>
  <div :class="['solved-overlay fixed inset-0 z-50 flex items-center justify-center', (isWinner || type === 'buzzed') ? 'bg-success/85' : 'bg-black/70']">
    <div :class="['solved-card rounded-2xl p-8 flex flex-col items-center gap-3 shadow-2xl text-center max-w-xs mx-4', (isWinner || type === 'buzzed') ? 'bg-success text-success-content' : 'bg-base-100']">
      <template v-if="type === 'buzzed'">
        <span class="winner-icon i-fa6-solid-bell text-success-content text-9xl"></span>
        <p class="text-3xl font-bold font-display">{{ t('room.buzz_won') }}</p>
      </template>
      <template v-else-if="type === 'skipped'">
        <span class="i-fa6-solid-forward-fast text-base-content/40 text-7xl"></span>
        <p class="text-xl font-bold font-display mt-1">{{ t('overlay.skipped') }}</p>
      </template>
      <template v-else-if="isWinner">
        <span class="winner-icon i-fa6-solid-circle-check text-success-content text-9xl"></span>
        <p class="text-3xl font-bold font-display">{{ t('overlay.you_solved') }}</p>
      </template>
      <template v-else>
        <span class="i-fa6-solid-trophy text-warning text-7xl"></span>
        <p class="text-xl font-bold font-display mt-1">{{ t('overlay.solved', { player: playerName }) }}</p>
      </template>
      <div v-if="title || artist" class="space-y-0.5 mt-1">
        <p v-if="title" class="text-lg font-semibold">{{ title }}</p>
        <p v-if="artist" :class="['text-base', (isWinner || type === 'buzzed') ? 'text-success-content/70' : 'text-base-content/60']">{{ artist }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI36n } from '@jota-one/i36n'

const { t } = useI36n()

withDefaults(defineProps<{
  type?: 'solved' | 'skipped' | 'buzzed'
  playerName?: string
  title?: string
  artist?: string
  isWinner?: boolean
}>(), {
  type: 'solved',
  playerName: '',
  title: '',
  artist: '',
  isWinner: false,
})
</script>

<style scoped>
.solved-overlay {
  animation: fadeIn 0.3s ease-out forwards;
}

.solved-card {
  animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.winner-icon {
  animation: winnerPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0 }
  to { opacity: 1 }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.6) }
  to { opacity: 1; transform: scale(1) }
}

@keyframes winnerPop {
  0% { opacity: 0; transform: scale(0.3) rotate(-15deg) }
  70% { transform: scale(1.15) rotate(5deg) }
  100% { opacity: 1; transform: scale(1) rotate(0deg) }
}
</style>
