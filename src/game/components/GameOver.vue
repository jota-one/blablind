<template>
  <div class="flex flex-col items-center gap-8 p-6 text-center">

    <div>
      <p class="text-5xl mb-2">🏆</p>
      <h2 class="text-2xl font-bold font-display">Blindtest terminé !</h2>
      <p v-if="sorted[0]" class="text-base-content/60 mt-1">
        Bravo <strong class="text-warning">{{ sorted[0].name }}</strong> !
      </p>
    </div>

    <!-- Podium -->
    <div v-if="sorted.length >= 2" class="flex items-end justify-center gap-3 w-full max-w-sm">

      <!-- 2ème -->
      <div class="flex flex-col items-center gap-2 flex-1">
        <span class="text-2xl">🥈</span>
        <p class="text-sm font-semibold truncate w-full" :class="sorted[1]?.id === currentPlayer.id ? 'text-primary' : ''">{{ sorted[1]?.name }}</p>
        <p class="text-lg font-bold font-mono">{{ sorted[1]?.score }}</p>
        <div class="w-full bg-base-content/20 rounded-t-lg h-20 flex items-center justify-center text-2xl font-bold text-base-content/40">2</div>
      </div>

      <!-- 1er -->
      <div class="flex flex-col items-center gap-2 flex-1">
        <span class="text-3xl">🥇</span>
        <p class="text-sm font-bold truncate w-full text-warning" :class="sorted[0]?.id === currentPlayer.id ? 'text-primary' : ''">{{ sorted[0]?.name }}</p>
        <p class="text-xl font-bold font-mono text-warning">{{ sorted[0]?.score }}</p>
        <div class="w-full bg-warning/30 rounded-t-lg h-32 flex items-center justify-center text-2xl font-bold text-warning/60">1</div>
      </div>

      <!-- 3ème -->
      <div v-if="sorted[2]" class="flex flex-col items-center gap-2 flex-1">
        <span class="text-xl">🥉</span>
        <p class="text-sm font-semibold truncate w-full" :class="sorted[2]?.id === currentPlayer.id ? 'text-primary' : ''">{{ sorted[2]?.name }}</p>
        <p class="text-lg font-bold font-mono">{{ sorted[2]?.score }}</p>
        <div class="w-full bg-base-content/10 rounded-t-lg h-16 flex items-center justify-center text-2xl font-bold text-base-content/30">3</div>
      </div>

    </div>

    <!-- Classement complet (si > 3 joueurs) -->
    <div v-if="sorted.length > 3" class="w-full max-w-sm space-y-1">
      <p class="text-xs text-base-content/40 uppercase tracking-wide mb-2">Suite du classement</p>
      <div
        v-for="(p, i) in sorted.slice(3)"
        :key="p.id"
        :class="['flex items-center gap-3 rounded-lg px-3 py-2', p.id === currentPlayer.id ? 'bg-primary/10 border border-primary/30' : 'bg-base-200']"
      >
        <span class="text-sm text-base-content/40 w-4">{{ i + 4 }}</span>
        <span class="flex-1 text-sm font-medium truncate">{{ p.name }}</span>
        <span class="font-mono font-bold">{{ p.score }}</span>
      </div>
    </div>

    <a href="/" class="btn btn-ghost">Retour à l'accueil</a>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ players: any[]; currentPlayer: any }>()

const sorted = computed(() =>
  [...props.players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
)
</script>
