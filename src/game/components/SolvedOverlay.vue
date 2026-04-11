<template>
  <div class="solved-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div class="solved-card bg-base-100 rounded-2xl p-8 flex flex-col items-center gap-3 shadow-2xl text-center max-w-xs mx-4">
      <template v-if="type === 'skipped'">
        <span class="i-fa6-solid-forward-fast text-base-content/40 text-7xl"></span>
        <p class="text-xl font-bold font-display mt-1">Personne n'a trouvé !</p>
      </template>
      <template v-else>
        <span class="i-fa6-solid-trophy text-warning text-7xl"></span>
        <p class="text-xl font-bold font-display mt-1">{{ playerName }} a trouvé !</p>
      </template>
      <div v-if="title || artist" class="space-y-0.5">
        <p v-if="title" class="text-lg font-semibold">{{ title }}</p>
        <p v-if="artist" class="text-base text-base-content/60">{{ artist }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'solved' | 'skipped'
  playerName?: string
  title: string
  artist: string
}>(), {
  type: 'solved',
  playerName: '',
})
</script>

<style scoped>
.solved-overlay {
  animation: fadeIn 0.3s ease-out forwards;
}

.solved-card {
  animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0 }
  to { opacity: 1 }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.6) }
  to { opacity: 1; transform: scale(1) }
}
</style>
