<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-10">
    <div class="text-center mb-12">
      <h1 class="text-5xl md:text-7xl font-bold font-display mb-4">BlaBlind</h1>
      <p class="text-xl text-base-content/70 max-w-md mx-auto">
        Crée ton blindtest, invite tes amis, buzzez en direct !
      </p>
    </div>

    <!-- Bannière restore session -->
    <div v-if="lastSession" class="alert alert-info w-full max-w-2xl mb-6 flex items-center gap-4">
      <span class="i-fa-solid-rotate-left text-xl shrink-0"></span>
      <span class="flex-1 text-sm">
        Tu étais dans <strong>{{ lastSession.name }}</strong>. Tu veux reprendre ?
      </span>
      <a :href="`/${lastSession.slug}`" class="btn btn-sm btn-primary shrink-0">Reprendre</a>
      <button class="btn btn-sm btn-ghost shrink-0" @click="dismissLastSession">Ignorer</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
      <!-- Créer un blindtest -->
      <div class="card bg-base-200 shadow-xl p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <span class="i-fa-solid-plus text-primary"></span>
          Créer un blindtest
        </h2>
        <form @submit.prevent="handleCreate" class="space-y-4">
          <input
            v-model="createName"
            type="text"
            placeholder="Nom du blindtest..."
            class="input input-bordered w-full"
            required
          />
          <button type="submit" class="btn btn-primary w-full" :disabled="creating">
            <span v-if="creating" class="loading loading-spinner loading-sm"></span>
            Créer
          </button>
          <p v-if="createError" class="text-error text-sm text-center">{{ createError }}</p>
        </form>
      </div>

      <!-- Rejoindre un blindtest -->
      <div class="card bg-base-200 shadow-xl p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <span class="i-fa-solid-door-open text-secondary"></span>
          Rejoindre un blindtest
        </h2>
        <form @submit.prevent="handleJoin" class="space-y-4">
          <input
            v-model="joinCode"
            type="text"
            placeholder="Code de la session..."
            class="input input-bordered w-full"
            required
          />
          <button type="submit" class="btn btn-secondary w-full">Rejoindre</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { pb } from '@game/pb'
import { generateSlug } from '@game/utils'

const THREE_HOURS = 3 * 60 * 60 * 1000

const getLastSession = () => {
  try {
    const raw = localStorage.getItem('blablind_last_session')
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() - data.savedAt > THREE_HOURS) {
      localStorage.removeItem('blablind_last_session')
      return null
    }
    return data
  } catch {
    return null
  }
}

const lastSession = ref(getLastSession())

const dismissLastSession = () => {
  localStorage.removeItem('blablind_last_session')
  lastSession.value = null
}

const createName = ref('')
const creating = ref(false)
const createError = ref('')
const joinCode = ref('')

const handleCreate = async () => {
  if (!createName.value.trim()) return
  creating.value = true
  createError.value = ''
  try {
    const slug = generateSlug()
    await pb.collection('sessions').create({
      name: createName.value.trim(),
      slug,
      status: 'waiting',
    })
    window.location.href = `/${slug}`
  } catch (e: any) {
    createError.value = e.message || 'Erreur lors de la création'
    creating.value = false
  }
}

const handleJoin = () => {
  const code = joinCode.value.trim()
  if (code) window.location.href = `/${code}`
}
</script>
