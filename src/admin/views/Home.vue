<template>
  <div class="p-8">
    <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
      <span class="i-fa6-solid-house"></span>
      {{ t('admin.dashboard_title') }}
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card bg-base-200 p-6">
        <p class="text-xs text-base-content/50 uppercase tracking-wide mb-1">{{ t('admin.stat_active_sessions') }}</p>
        <p class="text-3xl font-bold font-mono">—</p>
      </div>
      <div class="card bg-base-200 p-6">
        <p class="text-xs text-base-content/50 uppercase tracking-wide mb-1">{{ t('admin.stat_connected_players') }}</p>
        <p class="text-3xl font-bold font-mono">—</p>
      </div>
      <div class="card bg-base-200 p-6">
        <p class="text-xs text-base-content/50 uppercase tracking-wide mb-1">{{ t('admin.stat_played_tracks') }}</p>
        <p class="text-3xl font-bold font-mono">—</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI36n } from '@jota-one/i36n'

const { t } = useI36n()
</script>
