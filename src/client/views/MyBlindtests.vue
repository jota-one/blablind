<template>
  <div>
    <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
      <span class="i-fa-solid-music text-primary"></span>
      {{ t('profile.my_blindtests') }}
    </h2>

    <div v-if="loading" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-sm"></span>
    </div>

    <ul v-else-if="sessions.length > 0" class="space-y-2">
      <li
        v-for="session in sessions"
        :key="session.id"
        class="flex items-center justify-between gap-3 rounded-lg bg-base-200 px-3 py-2"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ session.name }}</p>
          <p class="text-xs text-base-content/40">{{ formatDate(session.created) }}</p>
        </div>
        <span
          :class="[
            'badge badge-xs shrink-0',
            session.status === 'playing' ? 'badge-success' : session.status === 'finished' ? 'badge-neutral' : 'badge-warning',
          ]"
        >
          {{ t(`room.status_${session.status}`) }}
        </span>
        <a :href="`/${session.slug}`" class="btn btn-xs btn-primary shrink-0">
          {{ t('profile.open_session') }}
        </a>
      </li>
    </ul>

    <p v-else class="text-sm text-base-content/40 text-center py-8">
      {{ t('profile.no_blindtests') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'

const { t } = useI36n()
const { user, pb } = useAuth()

const sessions = ref<any[]>([])
const loading = ref(false)

const loadSessions = async () => {
  if (!user.value?.id) { return }
  loading.value = true
  try {
    sessions.value = await pb.collection('sessions').getFullList({
      filter: `owner="${user.value.id}"`,
      sort: '-created',
      requestKey: null,
    })
  } finally {
    loading.value = false
  }
}

watch(() => user.value?.id, (id) => { if (id) { loadSessions() } }, { immediate: true })

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
</script>
