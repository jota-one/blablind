<template>
  <div class="h-screen flex flex-col overflow-hidden">

    <!-- Header -->
    <header class="shrink-0 bg-base-100/90 backdrop-blur border-b border-base-300">
      <!-- Ligne 1 : identité + navigation -->
      <div class="px-4 py-3 flex items-center gap-3">
        <a href="/" class="text-base-content/40 hover:text-base-content transition-colors">
          <span class="i-fa-solid-home text-lg"></span>
        </a>
        <h1 class="font-bold text-lg font-display flex-1 truncate">{{ session.name }}</h1>
        <span
          :class="['badge badge-sm', session.status === 'playing' ? 'badge-success' : session.status === 'finished' ? 'badge-neutral' : 'badge-warning']"
        >{{ sessionStatusLabel }}</span>
        <button class="btn btn-xs btn-ghost text-error" title="Quitter" @click="leaveSession">
          <span class="i-fa6-solid-right-from-bracket"></span>
        </button>
      </div>
      <!-- Ligne 2 : contexte + actions -->
      <div class="px-4 py-1.5 flex items-center gap-3 border-t border-base-200 text-sm">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span v-if="isIrlMode" class="badge badge-xs badge-accent shrink-0">IRL</span>
          <span v-if="isIrlMode && djPlayer" class="text-xs text-base-content/50 truncate">🎵 {{ djPlayer.name }}</span>
        </div>
        <span class="text-base-content/50 shrink-0">
          <span class="i-fa-solid-users text-xs"></span> {{ onlinePlayers.length }}
        </span>
        <ShareQR :slug="session.slug" />
        <button v-if="isHost" class="btn btn-xs btn-ghost text-warning" title="Réinitialiser" @click="showResetModal = true">
          <span class="i-fa6-solid-rotate-left"></span>
        </button>
        <button v-if="isHost" :class="['btn btn-xs btn-ghost', isIrlMode ? 'text-accent' : 'text-base-content/40']" title="Mode IRL" @click="toggleIrlMode">
          <span class="i-fa6-solid-people-group"></span>
        </button>
      </div>
    </header>

    <!-- Main -->
    <div class="flex-1 overflow-y-auto">

      <!-- Game over -->
      <template v-if="session.status === 'finished'">
        <GameOver :players="players" :current-player="currentPlayer" />
      </template>

      <!-- Left column -->
      <div v-else class="flex flex-col gap-4 p-4 min-w-0">

        <!-- Conteneur principal : aspect-video seulement quand une vidéo est active -->
        <div :class="['rounded-xl overflow-hidden', videoId ? 'relative aspect-video' : '']">

          <!-- Layer 1 : player toujours monté (invisible hors vidéo) -->
          <div class="absolute inset-0" :class="{'opacity-0 pointer-events-none': audioUnlocked || !videoId}">
            <YoutubePlayer
              :video-id="videoId"
              :start-seconds="currentTrack?.start_seconds ?? 0"
              :paused="audioUnlocked && !!activeBuzz"
              @playing="onPlaying"
            />
          </div>

          <!-- Layer 2 : overlay warm-up (masque video, laisse passer les taps) -->
          <div
            v-if="!audioUnlocked && videoId"
            class="absolute inset-0 bg-black flex flex-col items-center justify-center gap-3 pointer-events-none"
          >
            <span class="text-4xl">🔊</span>
            <p class="text-white/90 text-sm text-center px-4">Appuie sur ▶ pour activer le son</p>
          </div>

          <!-- Layer 3 : UI jeu/lobby -->
          <div
            :class="[
              'flex flex-col items-center justify-center gap-4 p-6 bg-base-200 rounded-xl',
              videoId ? 'absolute inset-0' : '',
              (!audioUnlocked && videoId) ? 'bg-transparent pointer-events-none' : '',
            ]"
          >
          <template v-if="currentTrack">
            <div :class="['text-7xl transition-all', activeBuzz ? 'opacity-50' : 'animate-bounce']">
              🎵
            </div>
            <p class="font-bold text-xl font-display text-center px-4">
              <template v-if="isCurrentTrackAdmin">
              {{ currentTrack.expand?.video?.title || '(sans titre)' }}
                <span v-if="currentTrack.expand?.video?.artist" class="block text-base font-normal text-base-content/60">{{ currentTrack.expand?.video?.artist }}</span>
              </template>
              <template v-else>
                <span class="text-base-content/40">Morceau de {{ getPlayerName(currentTrack.added_by) }}</span>
              </template>
            </p>
            <p v-if="activeBuzz" class="text-sm text-warning font-semibold animate-pulse">
              ⏸ En pause
            </p>
            <template v-else>
              <p class="text-xs text-base-content/40">♫ En cours de lecture</p>
              <p v-if="isIrlMode && !isDJ && djPlayer" class="text-xs text-base-content/50 text-center">
                Musique sur l'appareil de <strong>{{ djPlayer.name }}</strong>
              </p>
            </template>
          </template>
          <template v-else>
            <!-- Phase d'attente : lobby -->
            <template v-if="session.status === 'waiting'">
              <span class="text-5xl">🎮</span>
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
          </div><!-- /Layer 3 -->
        </div><!-- /aspect-video container -->

        <!-- Buzz zone (seulement pour les non-admin du morceau) -->
        <div v-if="currentTrack && !isCurrentTrackAdmin" class="w-full">
          <div v-if="activeBuzz && activeBuzz.player === currentPlayer.id" class="alert alert-info">
            <span class="i-fa-solid-bell text-xl"></span>
            <div>
              <p class="font-bold">{{ isIrlMode ? 'Tu as buzzé !' : 'Ta réponse a été soumise !' }}</p>
              <p v-if="!isIrlMode" class="text-sm opacity-80">{{ activeBuzz.answer }}</p>
              <p class="text-sm opacity-70 mt-1">En attente de validation...</p>
            </div>
          </div>
          <div v-else-if="activeBuzz" class="alert">
            <span class="i-fa-solid-bell text-xl animate-pulse"></span>
            <span><strong>{{ getPlayerName(activeBuzz.player) }}</strong> est en train de répondre...</span>
          </div>
          <template v-else>
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
            <button
              v-else-if="canBuzz"
              class="btn btn-error w-full h-20 text-2xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
              @click="isIrlMode ? submitBuzz() : (buzzing = true)"
            >
              <span class="i-fa-solid-bell text-3xl"></span>
              BUZZ !
            </button>
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
          <p v-if="!isIrlMode" class="text-lg">
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
          <button v-if="!hasVotedToSkip" class="btn btn-xs btn-ghost" @click="voteToSkip(currentTrack.id, currentPlayer.id)">
            <span class="i-fa-solid-forward-step"></span>
            Voter pour passer
          </button>
          <span v-else class="text-xs opacity-60">Tu as voté ✓</span>
        </div>

        <!-- Onglets : À venir / Passés / Classement -->
        <div>
          <div class="flex items-end gap-0.5 border-b border-base-300">
            <button
              :class="['flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border select-none transition-colors',
                       activeTab === 'upcoming'
                         ? 'relative bg-base-100 border-base-300 border-b-transparent z-10 -mb-px pb-[9px]'
                         : 'bg-base-200 border-base-200 text-base-content/50 hover:text-base-content']"
              @click="activeTab = 'upcoming'"
            >
              À venir
              <span v-if="upcomingTracks.length" class="badge badge-xs">{{ upcomingTracks.length }}</span>
            </button>
            <button
              :class="['flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border select-none transition-colors',
                       activeTab === 'done'
                         ? 'relative bg-base-100 border-base-300 border-b-transparent z-10 -mb-px pb-[9px]'
                         : 'bg-base-200 border-base-200 text-base-content/50 hover:text-base-content']"
              @click="activeTab = 'done'"
            >
              Passés
              <span v-if="doneTracks.length" class="badge badge-xs">{{ doneTracks.length }}</span>
            </button>
            <button
              :class="['flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border select-none transition-colors',
                       activeTab === 'scores'
                         ? 'relative bg-base-100 border-base-300 border-b-transparent z-10 -mb-px pb-[9px]'
                         : 'bg-base-200 border-base-200 text-base-content/50 hover:text-base-content']"
              @click="activeTab = 'scores'"
            >
              Classement
            </button>
          </div>

          <div class="border border-base-300 border-t-0 rounded-b-xl bg-base-100 px-3 pb-3">
          <div ref="tabs-outer" class="overflow-hidden touch-pan-y">
            <!-- DJ candidate notification (host only) -->
            <div v-if="isIrlMode && isHost && djCandidate" class="alert alert-info mt-3 flex items-center justify-between gap-2">
              <span class="text-sm"><strong>{{ djCandidate.name }}</strong> veut être DJ 🎵</span>
              <div class="flex gap-2 shrink-0">
                <button class="btn btn-xs btn-success" @click="approveDJ">Accepter</button>
                <button class="btn btn-xs btn-ghost" @click="rejectDJ">Refuser</button>
              </div>
            </div>
            <div
              ref="tabs-slider"
              :class="['flex', !isSwiping ? 'transition-transform duration-200 ease-in-out' : '']"
              :style="{ transform: tabsTransform }"
            >

              <!-- À venir -->
              <div class="w-full shrink-0 pt-3 space-y-3">
                <details class="collapse collapse-arrow bg-base-200 rounded-lg">
                  <summary class="collapse-title font-semibold">
                    <span class="i-fa-solid-plus mr-2"></span>
                    Ajouter un morceau
                  </summary>
                  <div class="collapse-content pt-0 space-y-3">
                    <div class="tabs tabs-bordered">
                      <button :class="['tab', addMode === 'search' ? 'tab-active' : '']" @click="addMode = 'search'">
                        <span class="i-fa-solid-magnifying-glass mr-1"></span>
                        Recherche
                      </button>
                      <button :class="['tab', addMode === 'single' ? 'tab-active' : '']" @click="addMode = 'single'">
                        URL unique
                      </button>
                      <button :class="['tab', addMode === 'playlist' ? 'tab-active' : '']" @click="addMode = 'playlist'">
                        <span class="i-fa-solid-list mr-1"></span>
                        Playlist
                      </button>
                    </div>
                    <TrackSearch v-if="addMode === 'search'" :add-track="addTrackFromPlaylist" />
                    <template v-else-if="addMode === 'single'">
                      <input v-model="newTrack.youtube_url" type="url" placeholder="URL YouTube" class="input input-bordered w-full" />
                      <div class="flex flex-col gap-2">
                        <div class="flex-1">
                          <input v-model.number="newTrack.start_seconds" type="number" placeholder="Départ (secondes)" class="input input-bordered w-full" min="0" />
                        </div>
                        <div class="flex-1 relative">
                          <input v-model="newTrack.title" type="text" placeholder="Titre (optionnel)" class="input input-bordered w-full" />
                          <span v-if="fetchingMeta" class="loading loading-spinner loading-xs absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30"></span>
                        </div>
                        <div class="flex-1 relative">
                          <input v-model="newTrack.artist" type="text" placeholder="Artiste (optionnel)" class="input input-bordered w-full" />
                          <span v-if="fetchingMeta" class="loading loading-spinner loading-xs absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30"></span>
                        </div>
                      </div>
                      <button class="btn btn-primary w-full" :disabled="!newTrack.youtube_url.trim() || addingTrack" @click="handleAddTrack">
                        <span v-if="addingTrack" class="loading loading-spinner loading-sm"></span>
                        Ajouter
                      </button>
                    </template>
                    <PlaylistImport v-else :add-track="addTrackFromPlaylist" />
                  </div>
                </details>
                <ul v-if="upcomingTracks.length > 0" class="space-y-1" ref="trackList">
                  <li
                    v-for="track in upcomingTracks"
                    :key="track.id"
                    :data-id="track.id"
                    :class="[
                      'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                      track.status === 'playing' ? 'bg-primary/10 border border-primary/30' : 'bg-base-200',
                      isMyTrack(track) ? 'border-l-2 border-l-primary' : '',
                      isMyTrack(track) && track.status === 'queued' ? 'draggable-track' : '',
                    ]"
                  >
                    <span
                      v-if="isMyTrack(track) && track.status === 'queued'"
                      class="drag-handle cursor-grab active:cursor-grabbing text-base-content/30 hover:text-base-content/50 w-6 text-center shrink-0 touch-none"
                    ><span class="i-fa6-solid-grip-vertical"></span></span>
                    <span v-else class="text-base w-6 text-center shrink-0">{{ trackStatusEmoji(track) }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate">
                        <template v-if="isMyTrack(track)">
                          <span class="text-primary">{{ track.expand?.video?.title || '(sans titre)' }}</span>
                          <span class="badge badge-xs badge-primary ml-1">moi</span>
                        </template>
                        <template v-else>???</template>
                      </p>
                      <p v-if="isMyTrack(track) && track.expand?.video?.artist" class="text-xs text-base-content/50">{{ track.expand?.video?.artist }}</p>
                      <p v-if="!isMyTrack(track)" class="text-xs text-base-content/40 mt-0.5">Ajouté par {{ getPlayerName(track.added_by) }}</p>
                    </div>
                  </li>
                </ul>
                <p v-else class="text-sm text-center text-base-content/40 py-4">Aucun morceau à venir</p>
              </div>

              <!-- Passés -->
              <div class="w-full shrink-0 pt-3">
                <ul v-if="doneTracks.length > 0" class="space-y-1">
                  <li
                    v-for="track in doneTracks"
                    :key="track.id"
                    :class="[
                      'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors bg-base-100 opacity-70',
                      isMyTrack(track) ? 'border-l-2 border-l-primary' : '',
                    ]"
                  >
                    <span class="text-base w-6 text-center shrink-0">{{ trackStatusEmoji(track) }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate">
                        {{ track.expand?.video?.title || '(sans titre)' }}
                        <span v-if="isMyTrack(track)" class="badge badge-xs badge-primary ml-1">moi</span>
                      </p>
                      <p v-if="track.expand?.video?.artist" class="text-xs text-base-content/50">{{ track.expand?.video?.artist }}</p>
                      <p class="text-xs text-base-content/40 mt-0.5">
                        <template v-if="track.solved_by">
                          Trouvé par
                          <strong :class="track.solved_by === currentPlayer.id ? 'text-success' : ''">{{ getPlayerName(track.solved_by) }}</strong>
                        </template>
                        <template v-else>Passé sans réponse</template>
                      </p>
                    </div>
                  </li>
                </ul>
                <p v-else class="text-sm text-center text-base-content/40 py-4">Aucun morceau passé</p>
              </div>

              <!-- Classement -->
              <div class="w-full shrink-0 pt-3">
                <ul class="space-y-2">
                  <li
                    v-for="(p, i) in players"
                    :key="p.id"
                    :class="['flex items-center gap-3 rounded-lg px-3 py-2', p.id === currentPlayer.id ? 'bg-primary/10 border border-primary/30' : 'bg-base-200']"
                  >
                    <span :class="['text-sm font-bold w-5 text-center', i === 0 ? 'text-warning' : 'text-base-content/40']">{{ i + 1 }}</span>
                    <span class="flex-1 text-sm font-medium truncate" :class="!isOnline(p) ? 'opacity-40' : ''">{{ p.name }}</span>
                    <span v-if="isIrlMode && p.id === session.dj_player" title="DJ" class="text-base">🎵</span>
                    <span class="font-mono font-bold text-primary" :class="!isOnline(p) ? 'opacity-40' : ''">{{ p.score }}</span>
                    <span v-if="!isOnline(p)" class="w-2 h-2 rounded-full bg-base-content/20 shrink-0" title="Hors ligne"></span>
                    <span v-else-if="activeBuzz?.player === p.id" class="i-fa-solid-bell text-warning animate-bounce text-xs"></span>
                    <button
                      v-if="isIrlMode && p.id === currentPlayer.id && p.id !== session.dj_player && session.dj_candidate !== currentPlayer.id"
                      class="btn btn-xs btn-ghost text-accent"
                      @click="proposeDJ"
                    >
                      Devenir DJ
                    </button>
                    <span v-else-if="isIrlMode && p.id === currentPlayer.id && session.dj_candidate === currentPlayer.id" class="text-xs text-base-content/40">
                      En attente...
                    </span>
                  </li>
                </ul>
                <p v-if="players.length === 0" class="text-base-content/40 text-sm text-center py-4">Aucun joueur</p>
              </div>

            </div>
          </div>
          </div>
        </div>
      </div>
    </div>

    <SolvedOverlay
      v-if="animationState"
      :type="animationState.type"
      :player-name="animationState.playerName"
      :title="animationState.title"
      :artist="animationState.artist"
    />

    <!-- Modal réinitialisation -->
    <div :class="['modal', showResetModal ? 'modal-open' : '']">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Réinitialiser le blindtest ?</h3>
        <p class="py-4 text-base-content/70">
          Tous les scores seront remis à zéro et les morceaux rejoueront depuis le début, comme si la session venait de commencer.
        </p>
        <div class="modal-action">
          <button class="btn btn-ghost" :disabled="resetting" @click="showResetModal = false">Annuler</button>
          <button class="btn btn-warning" :disabled="resetting" @click="resetSession">
            <span v-if="resetting" class="loading loading-spinner loading-sm"></span>
            Réinitialiser
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showResetModal = false"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, useTemplateRef } from 'vue'
import Sortable from 'sortablejs'
import { useSwipe } from '@vueuse/core'
import usePlayers from '@game/composables/usePlayers'
import useTracks from '@game/composables/useTracks'
import useBuzzes from '@game/composables/useBuzzes'
import YoutubePlayer from '@game/components/YoutubePlayer.vue'
import PlaylistImport from '@game/components/PlaylistImport.vue'
import TrackSearch from '@game/components/TrackSearch.vue'
import ShareQR from '@game/components/ShareQR.vue'
import GameOver from '@game/components/GameOver.vue'
import SolvedOverlay from '@game/components/SolvedOverlay.vue'
import { pb } from '@game/pb'
import { getVideoId, isOnline } from '@game/utils'

const props = defineProps<{
  session: any
  currentPlayer: any
}>()

const emit = defineEmits<{ leave: [] }>()

const { players, onlinePlayers } = usePlayers(props.session.id)
const { tracks, currentTrack, queuedTracks, addTrack, playTrack, finishTrack, voteToSkip } = useTracks(props.session.id)
const trackValidatorId = computed(() => {
  if (!currentTrack.value) return null
  const owner = players.value.find(p => p.id === currentTrack.value.added_by)
  if (owner && isOnline(owner)) return owner.id
  return props.session.host
})
const otherEligibleCount = computed(() =>
  onlinePlayers.value.filter(p =>
    p.id !== props.currentPlayer.id && p.id !== trackValidatorId.value
  ).length
)
const { activeBuzz, canBuzz, buzz, solvedBuzz } = useBuzzes(
  computed(() => currentTrack.value?.id),
  props.currentPlayer.id,
  otherEligibleCount,
)

// UI state
const buzzing = ref(false)
const answer = ref('')
const addingTrack = ref(false)
const addMode = ref<'search' | 'single' | 'playlist'>('search')
const newTrack = ref({ youtube_url: '', start_seconds: 0, title: '', artist: '' })
const fetchingMeta = ref(false)
const audioUnlocked = ref(false)
const animationState = ref<{ type?: 'solved' | 'skipped'; playerName: string; title: string; artist: string } | null>(null)
const showResetModal = ref(false)
const resetting = ref(false)

const activeTab = ref<'upcoming' | 'done' | 'scores'>('upcoming')
const tabOrder = ['upcoming', 'done', 'scores'] as const
const activeTabIndex = computed(() => tabOrder.indexOf(activeTab.value))

const tabsOuter = useTemplateRef<HTMLElement>('tabs-outer')
const tabsSlider = useTemplateRef<HTMLElement>('tabs-slider')
const trackListEl = useTemplateRef<HTMLUListElement>('trackList')
let lastLengthX = 0
const { isSwiping, lengthX } = useSwipe(tabsSlider, {
  passive: false,
  onSwipe() {
    lastLengthX = lengthX.value
  },
  onSwipeEnd(_e, direction) {
    const width = tabsOuter.value?.offsetWidth ?? 300
    const i = activeTabIndex.value
    if (direction === 'left' && i < tabOrder.length - 1 && Math.abs(lastLengthX) / width >= 0.3) {
      activeTab.value = tabOrder[i + 1]
    } else if (direction === 'right' && i > 0 && Math.abs(lastLengthX) / width >= 0.3) {
      activeTab.value = tabOrder[i - 1]
    }
  },
})
const tabsTransform = computed(() => {
  const base = -activeTabIndex.value * 100
  if (isSwiping.value && tabsOuter.value) {
    const drag = Math.max(
      -(tabOrder.length - 1 - activeTabIndex.value) * (tabsOuter.value.offsetWidth),
      Math.min(activeTabIndex.value * tabsOuter.value.offsetWidth, -lengthX.value)
    )
    return `translateX(calc(${base}% + ${drag}px))`
  }
  return `translateX(${base}%)`
})

watch(solvedBuzz, (buzz) => {
  if (!buzz) return
  const track = tracks.value.find((t: any) => t.id === buzz.track)
  const player = players.value.find((p: any) => p.id === buzz.player)
  animationState.value = {
    playerName: player?.name ?? 'Inconnu',
    title: track?.expand?.video?.title ?? '',
    artist: track?.expand?.video?.artist ?? '',
  }
  setTimeout(() => { animationState.value = null }, 3000)
})

let metaDebounce: ReturnType<typeof setTimeout> | null = null
watch(() => newTrack.value.youtube_url, (url) => {
  if (metaDebounce) clearTimeout(metaDebounce)
  const vid = getVideoId(url)
  if (!vid) return
  metaDebounce = setTimeout(async () => {
    fetchingMeta.value = true
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
      if (!res.ok) return
      const data = await res.json()
      if (!newTrack.value.title) newTrack.value.title = data.title ?? ''
      if (!newTrack.value.artist) newTrack.value.artist = data.author_name ?? ''
    } finally {
      fetchingMeta.value = false
    }
  }, 500)
})

const videoId = computed(() => {
  if (isIrlMode.value && !isDJ.value) return null
  return currentTrack.value?.expand?.video?.video_id ?? null
})

// Appelé quand l'utilisateur tap play dans l'iframe YouTube — déverrouille l'audio
const onPlaying = () => { audioUnlocked.value = true }

// Computed
const isCurrentTrackAdmin = computed(() =>
  !!trackValidatorId.value && trackValidatorId.value === props.currentPlayer.id
)
const sessionStatusLabel = computed(
  () => ({ waiting: 'En attente', playing: 'En cours', finished: 'Terminée' })[props.session.status as string] ?? props.session.status,
)
const isHost = computed(() => props.session.host === props.currentPlayer.id)
const isIrlMode = computed(() => !!props.session.irl_mode)
const isDJ = computed(() => props.session.dj_player === props.currentPlayer.id)
const djPlayer = computed(() => players.value.find((p: any) => p.id === props.session.dj_player))
const djCandidate = computed(() => players.value.find((p: any) => p.id === props.session.dj_candidate))
const nonHostPlayers = computed(() => onlinePlayers.value.filter(p => p.id !== props.session.host))
const allNonHostPlayersReady = computed(() =>
  nonHostPlayers.value.length === 0 || nonHostPlayers.value.every(p => p.ready),
)
const isReady = computed(() => players.value.find(p => p.id === props.currentPlayer.id)?.ready ?? false)
const canLaunch = computed(() => allNonHostPlayersReady.value && queuedTracks.value.length > 0 && onlinePlayers.value.length >= 2)

const skipVoteArray = computed<string[]>(() => {
  const v = currentTrack.value?.skip_votes
  return Array.isArray(v) ? v : []
})
const skipVoteCount = computed(() => skipVoteArray.value.length)
const skipVotesNeeded = computed(() => {
  if (!currentTrack.value) return 1
  return Math.max(1, onlinePlayers.value.filter(p => p.id !== trackValidatorId.value).length)
})
const hasVotedToSkip = computed(() => skipVoteArray.value.includes(props.currentPlayer.id))

watch(skipVoteArray, async (votes) => {
  if (!currentTrack.value) return
  if (animationState.value?.type === 'skipped') return
  if (onlinePlayers.value.length > 1 && votes.length >= skipVotesNeeded.value) {
    animationState.value = {
      type: 'skipped',
      playerName: '',
      title: currentTrack.value.expand?.video?.title ?? '',
      artist: currentTrack.value.expand?.video?.artist ?? '',
    }
    if (!isHost.value) {
      setTimeout(() => { animationState.value = null }, 3000)
      return
    }
    const trackId = currentTrack.value.id
    setTimeout(async () => {
      animationState.value = null
      await finishTrack(trackId)
      const next = queuedTracks.value[0]
      if (next) await playTrack(next.id)
      else await pb.collection('sessions').update(props.session.id, { status: 'finished' })
    }, 3000)
  }
})

const getPlayerName = (playerId: string) => players.value.find(p => p.id === playerId)?.name ?? 'Inconnu'
const isMyTrack = (track: any) => track.added_by === props.currentPlayer.id

const trackStatusEmoji = (track: any) => {
  if (track.status === 'playing') return '🎵'
  if (track.status === 'queued') return '🎶'
  if (!track.solved_by) return '⏭️'
  if (track.solved_by === props.currentPlayer.id) return '🏆'
  if (isMyTrack(track)) return '🎤'
  return '😅'
}

const upcomingTracks = computed(() => [
  ...(currentTrack.value ? [currentTrack.value] : []),
  ...queuedTracks.value,
])
const doneTracks = computed(() =>
  tracks.value.filter((t: any) => t.status === 'done').sort((a: any, b: any) => b.order - a.order)
)

// Actions
const submitBuzz = async () => {
  if (!isIrlMode.value && !answer.value.trim()) return
  if (!currentTrack.value) return
  await buzz(props.currentPlayer.id, answer.value.trim())
  buzzing.value = false
  answer.value = ''
}

const validateBuzz = async () => {
  if (!activeBuzz.value || !currentTrack.value) return
  const trackId = currentTrack.value.id
  const buzzId = activeBuzz.value.id
  const buzzPlayerId = activeBuzz.value.player
  const buzzer = players.value.find(p => p.id === buzzPlayerId)
  const next = queuedTracks.value[0]

  // Step 1: mark buzz correct + increment score (triggers animation on all clients via realtime)
  await Promise.all([
    pb.collection('buzzes').update(buzzId, { status: 'correct' }),
    buzzer && pb.collection('players').update(buzzer.id, { score: (buzzer.score || 0) + 1 }),
  ])

  // Step 2: after animation, mark track done and advance
  setTimeout(async () => {
    await pb.collection('tracks').update(trackId, { status: 'done', solved_by: buzzPlayerId })
    if (next) await playTrack(next.id)
    else await pb.collection('sessions').update(props.session.id, { status: 'finished' })
  }, 3000)
}

const leaveSession = async () => {
  if (isHost.value) {
    const nextHost = onlinePlayers.value.find(p => p.id !== props.currentPlayer.id)
    if (nextHost) await pb.collection('sessions').update(props.session.id, { host: nextHost.id })
  }
  await pb.collection('players').delete(props.currentPlayer.id, { query: { secret: props.currentPlayer.secret } })
  localStorage.removeItem(`blablind_player_${props.session.id}`)
  emit('leave')
}

const markReady = (value: boolean) => pb.collection('players').update(props.currentPlayer.id, { ready: value })

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

const toggleIrlMode = async () => {
  const enabling = !props.session.irl_mode
  await pb.collection('sessions').update(props.session.id, {
    irl_mode: enabling,
    dj_player: enabling ? props.currentPlayer.id : null,
    dj_candidate: null,
  })
}
const proposeDJ = () =>
  pb.collection('sessions').update(props.session.id, { dj_candidate: props.currentPlayer.id })
const approveDJ = () =>
  pb.collection('sessions').update(props.session.id, { dj_player: props.session.dj_candidate, dj_candidate: null })
const rejectDJ = () =>
  pb.collection('sessions').update(props.session.id, { dj_candidate: null })

const resetSession = async () => {
  resetting.value = true
  try {
    await Promise.all([
      ...players.value.map(p => pb.collection('players').update(p.id, { score: 0 })),
      ...tracks.value.map(t => pb.collection('tracks').update(t.id, { status: 'queued', solved_by: null, skip_votes: [] })),
      pb.collection('sessions').update(props.session.id, { status: 'waiting' }),
    ])
    showResetModal.value = false
  } finally {
    resetting.value = false
  }
}

const handleAddTrack = async () => {
  const vid = getVideoId(newTrack.value.youtube_url.trim())
  if (!vid) return
  addingTrack.value = true
  try {
    await addTrack({
      video_id: vid,
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

const addTrackFromPlaylist = (data: { video_id: string; title?: string; artist?: string; duration?: number; start_seconds?: number }) =>
  addTrack({ ...data, start_seconds: data.start_seconds ?? 0, added_by: props.currentPlayer.id })

// Drag & drop — own queued tracks only
let sortableInstance: Sortable | null = null

watch(trackListEl, (el) => {
  if (el) {
    sortableInstance = Sortable.create(el, {
      draggable: '.draggable-track',
      handle: '.drag-handle',
      animation: 150,
      onEnd() {
        // Player's queued tracks sorted by their current order (= the "slots" they own)
        const myQueued = queuedTracks.value
          .filter(t => t.added_by === props.currentPlayer.id)
          .sort((a, b) => a.order - b.order)
        if (myQueued.length < 2) return

        const slots = myQueued.map(t => t.order)

        // Read DOM order after drop
        const myInNewOrder = Array.from(el.querySelectorAll('[data-id]'))
          .map(node => node.getAttribute('data-id'))
          .map(id => queuedTracks.value.find(t => t.id === id))
          .filter((t): t is any => !!t && t.added_by === props.currentPlayer.id)

        if (myInNewOrder.length !== slots.length) return

        const updates = myInNewOrder
          .map((track, i) => ({ track, newOrder: slots[i] }))
          .filter(({ track, newOrder }) => track.order !== newOrder)

        if (updates.length === 0) return

        // Optimistic local update so Vue re-renders immediately in the right order
        updates.forEach(({ track, newOrder }) => {
          const idx = tracks.value.findIndex(t => t.id === track.id)
          if (idx >= 0) tracks.value[idx] = { ...tracks.value[idx], order: newOrder }
        })

        // Persist
        updates.forEach(({ track, newOrder }) =>
          pb.collection('tracks').update(track.id, { order: newOrder }, { requestKey: null }),
        )
      },
    })
  } else {
    sortableInstance?.destroy()
    sortableInstance = null
  }
})

onUnmounted(() => sortableInstance?.destroy())
</script>
