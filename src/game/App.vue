<template>
  <div class="flex items-center justify-center min-h-screen">
    <span v-if="loading" class="loading loading-spinner loading-lg text-primary"></span>
    <div v-else-if="error" class="text-center p-8">
      <p class="text-4xl mb-3">😕</p>
      <p class="text-error font-semibold text-lg">{{ t(error) }}</p>
      <a href="/" class="btn btn-ghost mt-4">{{ t('app.back_home') }}</a>
    </div>
    <template v-else-if="session">
      <Join v-if="!player" :session="session" @joined="onJoined" />
      <Room v-else :session="session" :current-player="player" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, getCurrentInstance } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useSession from '@game/composables/useSession'
import { pb } from '@game/pb'
import Join from '@game/views/Join.vue'
import Room from '@game/views/Room.vue'

// Register v-focus directive for the game SPA
const app = getCurrentInstance()?.appContext.app
app?.directive('focus', { mounted: (el) => el.focus() })

const { t } = useI36n()

const slug = window.location.pathname.split('/').filter(Boolean)[0]
const { session, loading, error } = useSession(slug)

const player = ref<any>(null)
let stopHeartbeat: (() => void) | null = null

const startHeartbeat = async (playerId: string) => {
  stopHeartbeat?.()
  const tick = () =>
    pb.collection('players').update(playerId, { last_seen: new Date().toISOString() }).catch(() => {})
  await tick()
  const id = setInterval(tick, 15_000)
  stopHeartbeat = () => clearInterval(id)
}

onUnmounted(() => stopHeartbeat?.())

const saveLastSession = () => {
  if (!session.value) return
  localStorage.setItem('blablind_last_session', JSON.stringify({
    slug,
    name: session.value.name,
    savedAt: Date.now(),
  }))
}

watch(
  session,
  async (s) => {
    if (!s || player.value) return
    const savedId = localStorage.getItem(`blablind_player_${s.id}`)
    if (!savedId) return
    try {
      const secret = localStorage.getItem(`blablind_secret_${s.id}`) ?? ''
      player.value = { ...await pb.collection('players').getOne(savedId), secret }
      startHeartbeat(player.value.id)
      saveLastSession()
    } catch {
      localStorage.removeItem(`blablind_player_${s.id}`)
    }
  },
  { once: true },
)

const onJoined = async (name: string) => {
  if (!session.value) return
  const secret = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
      )
  const record = await pb.collection('players').create({
    session: session.value.id,
    name,
    score: 0,
    secret,
  })
  localStorage.setItem(`blablind_player_${session.value.id}`, record.id)
  localStorage.setItem(`blablind_secret_${session.value.id}`, secret)
  player.value = { ...record, secret }
  saveLastSession()
  await startHeartbeat(record.id)
  const threshold = new Date(Date.now() - 30_000).toISOString().replace('T', ' ')
  const activeOthers = await pb.collection('players').getList(1, 1, {
    filter: `session="${session.value.id}" && id != "${record.id}" && last_seen >= "${threshold}"`,
    requestKey: null,
  })
  if (activeOthers.totalItems === 0) {
    await pb.collection('sessions').update(session.value.id, { host: record.id })
  }
}
</script>
