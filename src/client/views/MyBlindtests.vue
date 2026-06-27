<template>
  <div class="space-y-8">
    <section>
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
          <div class="flex items-center gap-3 text-xs text-base-content/40 shrink-0">
            <span class="flex items-center gap-1">
              <span class="i-fa-solid-music"></span>
              {{ trackCounts[session.id] ?? 0 }}
            </span>
            <span class="flex items-center gap-1">
              <span class="i-fa-solid-users"></span>
              {{ playerCounts[session.id] ?? 0 }}
            </span>
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
    </section>

    <section>
      <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
        <span class="i-fa-solid-users text-primary"></span>
        {{ t('profile.participated_blindtests') }}
      </h2>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-sm"></span>
      </div>

      <ul v-else-if="participatedSessions.length > 0" class="space-y-2">
        <li
          v-for="session in participatedSessions"
          :key="session.id"
          class="flex items-center justify-between gap-3 rounded-lg bg-base-200 px-3 py-2"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ session.name }}</p>
            <p class="text-xs text-base-content/40">{{ formatDate(session.created) }}</p>
          </div>
          <div class="flex items-center gap-3 text-xs text-base-content/40 shrink-0">
            <span class="flex items-center gap-1">
              <span class="i-fa-solid-music"></span>
              {{ trackCounts[session.id] ?? 0 }}
            </span>
            <span class="flex items-center gap-1">
              <span class="i-fa-solid-users"></span>
              {{ playerCounts[session.id] ?? 0 }}
            </span>
          </div>
          <span
            :class="[
              'badge badge-xs shrink-0',
              session.status === 'playing' ? 'badge-success' : session.status === 'finished' ? 'badge-neutral' : 'badge-warning',
            ]"
          >
            {{ t(`room.status_${session.status}`) }}
          </span>
          <a :href="`/${session.slug}`" class="btn btn-xs btn-ghost shrink-0">
            {{ t('profile.open_session') }}
          </a>
        </li>
      </ul>

      <p v-else class="text-sm text-base-content/40 text-center py-8">
        {{ t('profile.no_participated_blindtests') }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'

const { t } = useI36n()
const { user, pb } = useAuth()

const sessions = ref<any[]>([])
const participatedSessions = ref<any[]>([])
const trackCounts = ref<Record<string, number>>({})
const playerCounts = ref<Record<string, number>>({})
const loading = ref(false)

const loadSessions = async () => {
  if (!user.value?.id) { return }
  loading.value = true
  try {
    const [owned, playerRecords] = await Promise.all([
      pb.collection('sessions').getFullList({
        filter: pb.filter('owner = {:owner}', { owner: user.value.id }),
        sort: '-created',
        requestKey: null,
      }),
      pb.collection('players').getFullList({
        filter: pb.filter('auth_user = {:authUser}', { authUser: user.value.id }),
        expand: 'session',
        requestKey: null,
      }),
    ])
    sessions.value = owned
    const ownedIds = new Set(owned.map((s: any) => s.id))
    const seen = new Set<string>()
    const participated = playerRecords
      .map((p: any) => p.expand?.session)
      .filter((s: any) => s && !ownedIds.has(s.id) && !seen.has(s.id) && seen.add(s.id))
      .sort((a: any, b: any) => b.created.localeCompare(a.created))
    participatedSessions.value = participated

    const allSessionIds = [
      ...owned.map((s: any) => s.id),
      ...participated.map((s: any) => s.id),
    ]

    if (allSessionIds.length > 0) {
      const sessionFilter = allSessionIds.map(id => `session = "${id}"`).join(' || ')
      const [tracksResult, playersResult] = await Promise.all([
        pb.collection('tracks').getFullList({ filter: sessionFilter, fields: 'session', requestKey: null }),
        pb.collection('players').getFullList({ filter: sessionFilter, fields: 'session', requestKey: null }),
      ])
      const tc: Record<string, number> = {}
      const pc: Record<string, number> = {}
      for (const track of tracksResult) { tc[track.session] = (tc[track.session] || 0) + 1 }
      for (const player of playersResult) { pc[player.session] = (pc[player.session] || 0) + 1 }
      trackCounts.value = tc
      playerCounts.value = pc
    }
  } finally {
    loading.value = false
  }
}

watch(() => user.value?.id, (id) => { if (id) { loadSessions() } }, { immediate: true })

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
</script>
