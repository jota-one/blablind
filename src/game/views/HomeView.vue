<template>
  <div class="flex flex-col">

    <!-- Hero image -->
    <div class="relative h-[50vh] min-h-64 overflow-hidden">
      <img src="/blablind-hero.jpg" alt="BlaBlind" class="absolute inset-0 w-full h-full object-cover object-center" />
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-base-100)]" />
    </div>

    <!-- Slogan + Forms -->
    <div class="flex flex-col items-center px-4 pb-20 -mt-6 relative">
      <p class="text-3xl md:text-4xl font-black font-display uppercase tracking-wide bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center mb-12 max-w-lg">
        Crée ton blindtest, invite tes amis, buzzez en direct !
      </p>

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

    <!-- Section: Comment ça marche -->
    <section class="bg-neutral text-neutral-content py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-5xl md:text-7xl font-black font-display uppercase mb-16 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Comment ça marche ?
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div v-for="step in steps" :key="step.n" class="flex flex-col gap-4">
            <div class="text-6xl font-black font-display text-primary/30 leading-none">{{ step.n }}</div>
            <div class="text-4xl">{{ step.icon }}</div>
            <h3 class="text-2xl font-black font-display uppercase">{{ step.title }}</h3>
            <p class="text-neutral-content/70 leading-relaxed">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section: En chiffres -->
    <section class="bg-primary text-primary-content py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-5xl md:text-7xl font-black font-display uppercase mb-16 opacity-90">
          En chiffres
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-12">
          <div v-for="stat in statsDisplay" :key="stat.label" class="flex flex-col gap-2">
            <p class="text-7xl md:text-8xl font-black font-display leading-none">
              <span v-if="statsLoaded">{{ stat.value }}</span>
              <span v-else class="loading loading-dots loading-md opacity-50"></span>
            </p>
            <p class="text-xl font-semibold opacity-80">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section: Propose une amélioration -->
    <section class="bg-base-200 text-base-content py-24 px-6">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-5xl md:text-7xl font-black font-display uppercase mb-4 bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
          Une idée ?
        </h2>
        <p class="text-base-content/60 mb-12 text-lg">Un bug, une feature, une envie ? On est tout ouïe.</p>

        <div v-if="feedbackSent" class="text-center py-12">
          <p class="text-5xl mb-4">🙏</p>
          <p class="text-2xl font-black font-display uppercase">Merci pour ton retour !</p>
          <p class="text-base-content/60 mt-2">On en prend bonne note.</p>
        </div>
        <form v-else @submit.prevent="submitFeedback" class="space-y-5">
          <input
            v-model="feedback.name"
            type="text"
            placeholder="Ton prénom (optionnel)"
            class="input input-bordered w-full"
          />
          <textarea
            v-model="feedback.message"
            placeholder="Ton idée ou ton retour..."
            class="textarea textarea-bordered w-full min-h-36 resize-none"
            required
          ></textarea>
          <button type="submit" class="btn btn-secondary w-full" :disabled="sendingFeedback">
            <span v-if="sendingFeedback" class="loading loading-spinner loading-sm"></span>
            Envoyer
          </button>
        </form>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { pb } from '@game/pb'
import { generateSlug } from '@game/utils'

const THREE_HOURS = 3 * 60 * 60 * 1000

const steps = [
  {
    n: '01',
    icon: '🎵',
    title: 'Crée un blindtest',
    desc: 'Choisis un nom, ajoute tes morceaux YouTube préférés depuis une URL ou la recherche intégrée.',
  },
  {
    n: '02',
    icon: '📲',
    title: 'Invite tes amis',
    desc: 'Partage le QR code ou le lien de session. Pas de compte, pas d\'appli — juste un pseudo.',
  },
  {
    n: '03',
    icon: '🔔',
    title: 'Buzzez !',
    desc: 'Sois le premier à buzzer et donner la bonne réponse pour marquer des points. Que le meilleur gagne !',
  },
  {
    n: '04',
    icon: '🍒',
    title: 'La cerise sur le gâteau',
    desc: 'Chaque participant peut ajouter ses propres morceaux à la liste — et les faire deviner aux autres !',
  },
]

const stats = reactive({ sessions: 0, onlinePlayers: 0, tracks: 0 })
const statsLoaded = ref(false)
const statsDisplay = computed(() => [
  { label: 'Blindtests créés', value: stats.sessions },
  { label: 'Joueurs en ligne', value: stats.onlinePlayers },
  { label: 'Morceaux dans la biblio', value: stats.tracks },
])

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

const feedback = reactive({ name: '', message: '' })
const feedbackSent = ref(false)
const sendingFeedback = ref(false)

onMounted(async () => {
  const threshold = new Date(Date.now() - 30_000).toISOString().replace('T', ' ')
  const [sessionsRes, playersRes, tracksRes] = await Promise.all([
    pb.collection('sessions').getList(1, 1, { requestKey: null }),
    pb.collection('players').getList(1, 1, {
      filter: `last_seen >= "${threshold}"`,
      requestKey: null,
    }),
    pb.collection('videos').getList(1, 1, { requestKey: null }),
  ])
  stats.sessions = sessionsRes.totalItems
  stats.onlinePlayers = playersRes.totalItems
  stats.tracks = tracksRes.totalItems
  statsLoaded.value = true
})

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

const submitFeedback = async () => {
  sendingFeedback.value = true
  try {
    await pb.collection('feedback').create({ name: feedback.name, message: feedback.message })
    feedbackSent.value = true
  } finally {
    sendingFeedback.value = false
  }
}
</script>
