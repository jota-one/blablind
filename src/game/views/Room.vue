<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <!-- YouTube player off-screen (audio seulement) -->
    <div class="fixed" style="left: -9999px; top: 0; width: 1px; height: 1px; overflow: hidden;" aria-hidden="true">
      <YoutubePlayer
        v-if="currentTrack && videoId"
        :video-id="videoId"
        :start-seconds="currentTrack.start_seconds ?? 0"
        :paused="!!activeBuzz"
      />
    </div>

    <!-- Header -->
    <header class="shrink-0 bg-base-100/90 backdrop-blur border-b border-base-300 px-4 py-3 flex items-center gap-3">
      <a href="/" class="text-base-content/40 hover:text-base-content transition-colors">
        <span class="i-fa-solid-home text-lg"></span>
      </a>
      <h1 class="font-bold text-lg font-display flex-1">{{ session.name }}</h1>
      <span
        :class="['badge badge-sm', session.status === 'playing' ? 'badge-success' : session.status === 'finished' ? 'badge-neutral' : 'badge-warning']"
      >{{ sessionStatusLabel }}</span>
      <span class="text-sm text-base-content/50">
        <span class="i-fa-solid-users"></span> {{ players.length }}
      </span>
    </header>

    <!-- Main -->
    <div class="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">

      <!-- Left column -->
      <div class="flex flex-col gap-4 p-4 min-w-0">

        <!-- Now playing visual indicator -->
        <div class="aspect-video bg-base-200 rounded-xl flex flex-col items-center justify-center gap-4">
          <template v-if="currentTrack">
            <div :class="['text-7xl transition-all', activeBuzz ? 'opacity-50' : 'animate-bounce']">
              🎵
            </div>
            <p class="font-bold text-xl font-display text-center px-4">
              <template v-if="isCurrentTrackAdmin">
                {{ currentTrack.title || '(sans titre)' }}
                <span v-if="currentTrack.artist" class="block text-base font-normal text-base-content/60">{{ currentTrack.artist }}</span>
              </template>
              <template v-else>
                <span class="text-base-content/40">Morceau de {{ getPlayerName(currentTrack.added_by) }}</span>
              </template>
            </p>
            <p v-if="activeBuzz" class="text-sm text-warning font-semibold animate-pulse">
              ⏸ En pause
            </p>
            <p v-else class="text-xs text-base-content/40">♫ En cours de lecture</p>
          </template>
          <template v-else>
            <!-- Phase d'attente : lobby -->
            <template v-if="session.status === 'waiting'">
              <span class="text-5xl">🎮</span>
              <!-- Hôte -->
              <template v-if="isHost">
                <p class="font-semibold text-center">Tu es l'hôte du blindtest</p>
                <ul v-if="nonHostPlayers.length > 0" class="space-y-1 w-full max-w-xs text-sm">
                  <li v-for="p in nonHostPlayers" :key="p.id" class="flex items-center gap-2">
                    <span :class="p.ready ? 'text-success' : 'text-base-content/30'">{{ p.ready ? '✓' : '○' }}</span>
                    <span>{{ p.name }}</span>
                  </li>
                </ul>
                <p v-else class="text-sm text-base-content/40">En attente de joueurs...</p>
                <button class="btn btn-primary btn-lg" :disabled="!canLaunch" @click="launchSession">
                  <span class="i-fa-solid-play"></span>
                  Lancer le blindtest !
                </button>
                <p v-if="queuedTracks.length === 0" class="text-xs text-base-content/40 -mt-2">
                  Ajoute au moins un morceau avant de lancer
                </p>
              </template>
              <!-- Non-hôte -->
              <template v-else>
                <p class="text-base-content/50 text-center text-sm">En attente que l'hôte lance le blindtest</p>
                <button v-if="!isReady" class="btn btn-primary btn-lg" @click="markReady(true)">
                  Je suis prêt à démarrer !
                </button>
                <div v-else class="flex items-center gap-3">
                  <div class="badge badge-success badge-lg gap-2">
                    <span class="i-fa-solid-check"></span>
                    Prêt !
                  </div>
                  <button class="btn btn-xs btn-ghost" @click="markReady(false)">Annuler</button>
                </div>
              </template>
            </template>
            <!-- Session en cours, entre deux morceaux -->
            <template v-else>
              <span class="text-6xl opacity-20">🎶</span>
              <p class="text-base-content/50">Aucun morceau en cours</p>
              <template v-if="isHost">
                <button v-if="queuedTracks.length > 0" class="btn btn-primary" @click="playTrack(queuedTracks[0].id)">
                  <span class="i-fa-solid-play"></span>
                  Lancer le morceau suivant
                </button>
                <p v-else class="text-sm text-base-content/40">Ajoutez des morceaux pour continuer</p>
              </template>
            </template>
          </template>
        </div>

        <!-- Buzz zone (seulement pour les non-admin du morceau) -->
        <div v-if="currentTrack && !isCurrentTrackAdmin" class="w-full">

          <!-- Active buzz: c'est moi qui ai buzzé -->
          <div v-if="activeBuzz && activeBuzz.player === currentPlayer.id" class="alert alert-info">
            <span class="i-fa-solid-bell text-xl"></span>
            <div>
              <p class="font-bold">Ta réponse a été soumise !</p>
              <p class="text-sm opacity-80">{{ activeBuzz.answer }}</p>
              <p class="text-sm opacity-70 mt-1">En attente de validation...</p>
            </div>
          </div>

          <!-- Active buzz: quelqu'un d'autre a buzzé -->
          <div v-else-if="activeBuzz" class="alert">
            <span class="i-fa-solid-bell text-xl animate-pulse"></span>
            <span><strong>{{ getPlayerName(activeBuzz.player) }}</strong> est en train de répondre...</span>
          </div>

          <!-- Pas de buzz actif -->
          <template v-else>
            <!-- Saisie de la réponse -->
            <div v-if="buzzing" class="card bg-base-200 p-4 space-y-3">
              <p class="font-bold text-center">Ta réponse :</p>
              <input
                v-model="answer"
                v-focus
                type="text"
                placeholder="Titre, artiste..."
                class="input input-bordered w-full"
                @keyup.enter="submitBuzz"
              />
              <div class="flex gap-2">
                <button class="btn btn-primary flex-1" :disabled="!answer.trim()" @click="submitBuzz">
                  <span class="i-fa-solid-paper-plane"></span>
                  Envoyer
                </button>
                <button class="btn btn-ghost" @click="buzzing = false">Annuler</button>
              </div>
            </div>

            <!-- Bouton BUZZ -->
            <button
              v-else-if="canBuzz"
              class="btn btn-error w-full h-20 text-2xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
              @click="buzzing = true"
            >
              <span class="i-fa-solid-bell text-3xl"></span>
              BUZZ !
            </button>

            <!-- Bloqué -->
            <div v-else class="alert alert-warning alert-soft">
              <span class="i-fa-solid-ban"></span>
              Attends qu'un autre joueur tente sa chance avant de rebuzzer.
            </div>
          </template>
        </div>

        <!-- Panel de validation (admin du morceau) -->
        <div v-if="currentTrack && isCurrentTrackAdmin && activeBuzz" class="card bg-base-200 p-4 space-y-3">
          <p class="font-bold flex items-center gap-2">
            <span class="i-fa-solid-bell text-warning animate-bounce"></span>
            {{ getPlayerName(activeBuzz.player) }} a buzzé !
          </p>
          <p class="text-lg">
            <span class="font-mono bg-base-300 px-3 py-1 rounded">{{ activeBuzz.answer }}</span>
          </p>
          <div class="flex gap-2">
            <button class="btn btn-success flex-1" @click="validateBuzz">
              <span class="i-fa-solid-check"></span>
              Correct ! (+1 pt)
            </button>
            <button class="btn btn-error flex-1" @click="invalidateBuzz">
              <span class="i-fa-solid-times"></span>
              Faux
            </button>
          </div>
        </div>

        <!-- Vote pour passer (non-admin seulement) -->
        <div v-if="currentTrack && !isCurrentTrackAdmin" class="flex items-center justify-between text-sm text-base-content/50">
          <span>Passer ce morceau ? ({{ skipVoteCount }}/{{ skipVotesNeeded }})</span>
          <button
            v-if="!hasVotedToSkip"
            class="btn btn-xs btn-ghost"
            @click="voteToSkip(currentTrack.id, currentPlayer.id)"
          >
            <span class="i-fa-solid-forward-step"></span>
            Voter pour passer
          </button>
          <span v-else class="text-xs opacity-60">Tu as voté ✓</span>
        </div>

        <!-- Add track form -->
        <details class="collapse collapse-arrow bg-base-200 rounded-lg">
          <summary class="collapse-title font-semibold">
            <span class="i-fa-solid-plus mr-2"></span>
            Ajouter un morceau
          </summary>
          <div class="collapse-content pt-0 space-y-3">
            <input
              v-model="newTrack.youtube_url"
              type="url"
              placeholder="URL YouTube"
              class="input input-bordered w-full"
            />
            <div class="flex gap-2">
              <div class="flex-1">
                <input
                  v-model.number="newTrack.start_seconds"
                  type="number"
                  placeholder="Départ (secondes)"
                  class="input input-bordered w-full"
                  min="0"
                />
              </div>
              <div class="flex-1">
                <input
                  v-model="newTrack.title"
                  type="text"
                  placeholder="Titre (optionnel)"
                  class="input input-bordered w-full"
                />
              </div>
              <div class="flex-1">
                <input
                  v-model="newTrack.artist"
                  type="text"
                  placeholder="Artiste (optionnel)"
                  class="input input-bordered w-full"
                />
              </div>
            </div>
            <button
              class="btn btn-primary w-full"
              :disabled="!newTrack.youtube_url.trim() || addingTrack"
              @click="handleAddTrack"
            >
              <span v-if="addingTrack" class="loading loading-spinner loading-sm"></span>
              Ajouter
            </button>
          </div>
        </details>

        <!-- Liste complète des morceaux -->
        <div v-if="allTracks.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold text-base-content/50 uppercase tracking-wide">Morceaux</h3>
          <ul class="space-y-1 max-h-80 overflow-y-auto pr-1">
            <li
              v-for="track in allTracks"
              :key="track.id"
              :class="[
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                track.status === 'playing' ? 'bg-primary/10 border border-primary/30' :
                track.status === 'done' ? 'bg-base-100 opacity-70' : 'bg-base-200',
                isMyTrack(track) ? 'border-l-2 border-l-primary' : '',
              ]"
            >
              <span class="text-base w-6 text-center shrink-0">{{ trackStatusEmoji(track) }}</span>
              <div class="flex-1 min-w-0">
                <!-- Titre : visible si c'est mon morceau OU si le morceau est terminé -->
                <p class="text-sm font-medium truncate">
                  <template v-if="isMyTrack(track)">
                    <span class="text-primary">{{ track.title || '(sans titre)' }}</span>
                    <span class="badge badge-xs badge-primary ml-1">moi</span>
                  </template>
                  <template v-else-if="track.status === 'done'">
                    {{ track.title || '(sans titre)' }}
                  </template>
                  <template v-else>???</template>
                </p>
                <!-- Artiste : visible si c'est mon morceau OU si terminé -->
                <p v-if="(isMyTrack(track) || track.status === 'done') && track.artist"
                   class="text-xs text-base-content/50">{{ track.artist }}</p>
                <!-- Méta : qui a ajouté / qui a trouvé / passé -->
                <p class="text-xs text-base-content/40 mt-0.5">
                  <template v-if="track.status === 'done' && track.solved_by">
                    Trouvé par
                    <strong :class="track.solved_by === currentPlayer.id ? 'text-success' : ''">
                      {{ getPlayerName(track.solved_by) }}
                    </strong>
                  </template>
                  <template v-else-if="track.status === 'done'">Passé sans réponse</template>
                  <template v-else-if="!isMyTrack(track)">Ajouté par {{ getPlayerName(track.added_by) }}</template>
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Classement -->
      <aside class="lg:border-l border-base-300 p-4">
        <h2 class="text-sm font-semibold text-base-content/50 uppercase tracking-wide mb-3">Classement</h2>
        <ul class="space-y-2">
          <li
            v-for="(p, i) in players"
            :key="p.id"
            :class="['flex items-center gap-3 rounded-lg px-3 py-2', p.id === currentPlayer.id ? 'bg-primary/10 border border-primary/30' : 'bg-base-200']"
          >
            <span :class="['text-sm font-bold w-5 text-center', i === 0 ? 'text-warning' : 'text-base-content/40']">
              {{ i + 1 }}
            </span>
            <span class="flex-1 text-sm font-medium truncate">{{ p.name }}</span>
            <span class="font-mono font-bold text-primary">{{ p.score }}</span>
            <span v-if="activeBuzz?.player === p.id" class="i-fa-solid-bell text-warning animate-bounce text-xs"></span>
          </li>
        </ul>
        <p v-if="players.length === 0" class="text-base-content/40 text-sm text-center py-4">Aucun joueur</p>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import usePlayers from '@game/composables/usePlayers'
import useTracks from '@game/composables/useTracks'
import useBuzzes from '@game/composables/useBuzzes'
import YoutubePlayer from '@game/components/YoutubePlayer.vue'
import { pb } from '@game/pb'
import { getVideoId } from '@game/utils'

const props = defineProps<{
  session: any
  currentPlayer: any
}>()

const { players } = usePlayers(props.session.id)
const { tracks, currentTrack, queuedTracks, addTrack, playTrack, finishTrack, voteToSkip } = useTracks(props.session.id)
const { activeBuzz, canBuzz, buzz } = useBuzzes(
  computed(() => currentTrack.value?.id),
  props.currentPlayer.id,
)

// UI state
const buzzing = ref(false)
const answer = ref('')
const addingTrack = ref(false)
const newTrack = ref({ youtube_url: '', start_seconds: 0, title: '', artist: '' })

// Computed
const videoId = computed(() => (currentTrack.value ? getVideoId(currentTrack.value.youtube_url) : null))
const isCurrentTrackAdmin = computed(() => currentTrack.value?.added_by === props.currentPlayer.id)
const sessionStatusLabel = computed(
  () =>
    ({ waiting: 'En attente', playing: 'En cours', finished: 'Terminée' })[
      props.session.status as string
    ] ?? props.session.status,
)

const isHost = computed(() => props.session.host === props.currentPlayer.id)
const nonHostPlayers = computed(() => players.value.filter(p => p.id !== props.session.host))
const allNonHostPlayersReady = computed(() =>
  nonHostPlayers.value.length === 0 || nonHostPlayers.value.every(p => p.ready),
)
const isReady = computed(() => players.value.find(p => p.id === props.currentPlayer.id)?.ready ?? false)
const canLaunch = computed(() => allNonHostPlayersReady.value && queuedTracks.value.length > 0)

const skipVoteArray = computed<string[]>(() => {
  const v = currentTrack.value?.skip_votes
  return Array.isArray(v) ? v : []
})
const skipVoteCount = computed(() => skipVoteArray.value.length)
const skipVotesNeeded = computed(() => Math.max(1, players.value.length - 1))
const hasVotedToSkip = computed(() => skipVoteArray.value.includes(props.currentPlayer.id))

// Auto-skip when all non-admin players have voted
watch(skipVoteArray, async (votes) => {
  if (!currentTrack.value) return
  if (players.value.length > 1 && votes.length >= skipVotesNeeded.value) {
    await finishTrack(currentTrack.value.id)
    const next = queuedTracks.value[0]
    if (next) await playTrack(next.id)
  }
})

const getPlayerName = (playerId: string) =>
  players.value.find((p) => p.id === playerId)?.name ?? 'Inconnu'

const isMyTrack = (track: any) => track.added_by === props.currentPlayer.id

const trackStatusEmoji = (track: any) => {
  if (track.status === 'playing') return '🎵'
  if (track.status === 'queued') return '🎶'
  if (!track.solved_by) return '⏭️'
  if (track.solved_by === props.currentPlayer.id) return '🏆'
  if (isMyTrack(track)) return '🎤'
  return '😅'
}

const allTracks = computed(() => {
  const order: Record<string, number> = { playing: 0, queued: 1, done: 2 }
  return [...tracks.value].sort((a, b) => {
    const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3)
    if (diff !== 0) return diff
    return a.status === 'done' ? b.order - a.order : a.order - b.order
  })
})

// Actions
const submitBuzz = async () => {
  if (!answer.value.trim() || !currentTrack.value) return
  await buzz(props.currentPlayer.id, answer.value.trim())
  buzzing.value = false
  answer.value = ''
}

const validateBuzz = async () => {
  if (!activeBuzz.value || !currentTrack.value) return
  const buzzer = players.value.find((p) => p.id === activeBuzz.value.player)
  await Promise.all([
    pb.collection('buzzes').update(activeBuzz.value.id, { status: 'correct' }),
    buzzer && pb.collection('players').update(buzzer.id, { score: (buzzer.score || 0) + 1 }),
    pb.collection('tracks').update(currentTrack.value.id, { status: 'done', solved_by: activeBuzz.value.player }),
  ])
  const next = queuedTracks.value[0]
  if (next) await playTrack(next.id)
}

const markReady = (value: boolean) =>
  pb.collection('players').update(props.currentPlayer.id, { ready: value })

const launchSession = async () => {
  if (!canLaunch.value) return
  await Promise.all([
    pb.collection('sessions').update(props.session.id, { status: 'playing' }),
    playTrack(queuedTracks.value[0].id),
  ])
}

const invalidateBuzz = async () => {
  if (!activeBuzz.value) return
  await pb.collection('buzzes').update(activeBuzz.value.id, { status: 'wrong' })
}

const handleAddTrack = async () => {
  if (!newTrack.value.youtube_url.trim()) return
  addingTrack.value = true
  try {
    await addTrack({
      youtube_url: newTrack.value.youtube_url.trim(),
      start_seconds: newTrack.value.start_seconds || 0,
      title: newTrack.value.title.trim() || undefined,
      artist: newTrack.value.artist.trim() || undefined,
      added_by: props.currentPlayer.id,
    })
    newTrack.value = { youtube_url: '', start_seconds: 0, title: '', artist: '' }
  } finally {
    addingTrack.value = false
  }
}
</script>
