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
        {{ t('home.slogan') }}
      </p>

      <!-- Bannière restore session -->
      <div v-if="lastSession" class="alert alert-info w-full max-w-2xl mb-6 flex items-center gap-4">
        <span class="i-fa-solid-rotate-left text-xl shrink-0"></span>
        <span class="flex-1 text-sm">
          {{ t('home.restore_banner', { name: lastSession.name }) }}
        </span>
        <a :href="`/${lastSession.slug}`" class="btn btn-sm btn-primary shrink-0">{{ t('home.restore_resume') }}</a>
        <button class="btn btn-sm btn-ghost shrink-0" @click="dismissLastSession">{{ t('home.restore_dismiss') }}</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <!-- Créer un blindtest -->
        <div class="card bg-base-200 shadow-xl p-6">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
            <span class="i-fa-solid-plus text-primary"></span>
            {{ t('home.create_title') }}
          </h2>
          <form @submit.prevent="handleCreate" class="space-y-4">
            <input
              v-model="createName"
              type="text"
              :placeholder="t('home.create_placeholder')"
              class="input input-bordered w-full"
              required
            />
            <button type="submit" class="btn btn-primary w-full" :disabled="creating">
              <span v-if="creating" class="loading loading-spinner loading-sm"></span>
              {{ t('home.create_button') }}
            </button>
            <p v-if="createError" class="text-error text-sm text-center">{{ createError }}</p>
          </form>
        </div>

        <!-- Rejoindre un blindtest -->
        <div class="card bg-base-200 shadow-xl p-6">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
            <span class="i-fa-solid-door-open text-secondary"></span>
            {{ t('home.join_title') }}
          </h2>
          <form @submit.prevent="handleJoin" class="space-y-4">
            <input
              v-model="joinCode"
              type="text"
              :placeholder="t('home.join_placeholder')"
              class="input input-bordered w-full"
              required
            />
            <button type="submit" class="btn btn-secondary w-full" :disabled="joining">
              <span v-if="joining" class="loading loading-spinner loading-sm"></span>
              {{ t('home.join_button') }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Section: Comment ça marche -->
    <section class="bg-neutral text-neutral-content py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-5xl md:text-7xl font-black font-display uppercase mb-16 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {{ t('home.how_title') }}
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
          {{ t('home.stats_title') }}
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
          {{ t('home.feedback_title') }}
        </h2>
        <p class="text-base-content/60 mb-12 text-lg">{{ t('home.feedback_subtitle') }}</p>

        <div v-if="feedbackSent" class="text-center py-12">
          <p class="text-5xl mb-4">🙏</p>
          <p class="text-2xl font-black font-display uppercase">{{ t('home.feedback_sent_title') }}</p>
          <p class="text-base-content/60 mt-2">{{ t('home.feedback_sent_sub') }}</p>
        </div>
        <form v-else @submit.prevent="submitFeedback" class="space-y-5">
          <input
            v-model="feedback.name"
            type="text"
            :placeholder="t('home.feedback_name_placeholder')"
            class="input input-bordered w-full"
          />
          <textarea
            v-model="feedback.message"
            :placeholder="t('home.feedback_msg_placeholder')"
            class="textarea textarea-bordered w-full min-h-36 resize-none"
            required
          ></textarea>
          <button type="submit" class="btn btn-secondary w-full" :disabled="sendingFeedback">
            <span v-if="sendingFeedback" class="loading loading-spinner loading-sm"></span>
            {{ t('home.feedback_submit') }}
          </button>
        </form>
      </div>
    </section>

  </div>

  <!-- Toast erreur join -->
  <div v-if="joinError" class="toast toast-bottom toast-center z-50">
    <div class="alert alert-error shadow-lg">
      <span class="text-lg shrink-0">😕</span>
      <span>{{ joinError }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI36n } from '@jota-one/i36n'
import { pb } from '@game/pb'
import { generateSlug } from '@game/utils'
import useAuth from '@admin/composables/useAuth'

const { t } = useI36n()
const { isAuthenticated, user, refreshAuth } = useAuth()

const THREE_HOURS = 3 * 60 * 60 * 1000

const steps = computed(() => [
  {
    n: '01',
    icon: '🎵',
    title: t('home.step1_title'),
    desc: t('home.step1_desc'),
  },
  {
    n: '02',
    icon: '📲',
    title: t('home.step2_title'),
    desc: t('home.step2_desc'),
  },
  {
    n: '03',
    icon: '🔔',
    title: t('home.step3_title'),
    desc: t('home.step3_desc'),
  },
  {
    n: '04',
    icon: '🍒',
    title: t('home.step4_title'),
    desc: t('home.step4_desc'),
  },
])

const stats = reactive({ sessions: 0, onlinePlayers: 0, tracks: 0 })
const statsLoaded = ref(false)
const statsDisplay = computed(() => [
  { label: t('home.stats_sessions'), value: stats.sessions },
  { label: t('home.stats_online'), value: stats.onlinePlayers },
  { label: t('home.stats_tracks'), value: stats.tracks },
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
    if (isAuthenticated.value && !user.value?.id) await refreshAuth()
    await pb.collection('sessions').create({
      name: createName.value.trim(),
      slug,
      status: 'waiting',
      ...(user.value?.id ? { owner: user.value.id } : {}),
    })
    window.location.href = `/${slug}`
  } catch (e: any) {
    createError.value = e.message || t('home.error_create')
    creating.value = false
  }
}

const joinError = ref('')
const joining = ref(false)

const handleJoin = async () => {
  const code = joinCode.value.trim()
  if (!code) return
  joining.value = true
  joinError.value = ''
  try {
    await pb.collection('sessions').getFirstListItem(`slug="${code}"`, { requestKey: null })
    window.location.href = `/${code}`
  } catch {
    joinError.value = t('app.error_not_found')
    joining.value = false
    setTimeout(() => { joinError.value = '' }, 4000)
  }
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
