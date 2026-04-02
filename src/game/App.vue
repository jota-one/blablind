<template>
  <div class="flex items-center justify-center min-h-screen">
    <span v-if="loading" class="loading loading-spinner loading-lg text-primary"></span>
    <div v-else-if="error" class="text-center p-8">
      <p class="text-4xl mb-3">😕</p>
      <p class="text-error font-semibold text-lg">{{ error }}</p>
      <a href="/" class="btn btn-ghost mt-4">Retour à l'accueil</a>
    </div>
    <template v-else-if="session">
      <Join v-if="!player" :session="session" @joined="onJoined" />
      <Room v-else :session="session" :current-player="player" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, getCurrentInstance } from 'vue'
import useSession from '@game/composables/useSession'
import { pb } from '@game/pb'
import Join from '@game/views/Join.vue'
import Room from '@game/views/Room.vue'

// Register v-focus directive for the game SPA
const app = getCurrentInstance()?.appContext.app
app?.directive('focus', { mounted: (el) => el.focus() })

const slug = window.location.pathname.split('/').filter(Boolean)[0]
const { session, loading, error } = useSession(slug)

const player = ref<any>(null)

watch(
  session,
  async (s) => {
    if (!s || player.value) return
    const savedId = localStorage.getItem(`blablind_player_${s.id}`)
    if (!savedId) return
    try {
      player.value = await pb.collection('players').getOne(savedId)
    } catch {
      localStorage.removeItem(`blablind_player_${s.id}`)
    }
  },
  { once: true },
)

const onJoined = async (name: string) => {
  if (!session.value) return
  const record = await pb.collection('players').create({
    session: session.value.id,
    name,
    score: 0,
  })
  localStorage.setItem(`blablind_player_${session.value.id}`, record.id)
  player.value = record
  // Premier joueur à rejoindre = hôte
  if (!session.value.host) {
    await pb.collection('sessions').update(session.value.id, { host: record.id })
  }
}
</script>
