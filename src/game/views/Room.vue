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
        <span v-if="isAuthenticated && session.owner === user?.id" class="i-fa-solid-user-check text-primary shrink-0" :title="t('room.session_owned')"></span>
        <span
          :class="['badge badge-sm', session.status === 'playing' ? 'badge-success' : session.status === 'finished' ? 'badge-neutral' : 'badge-warning']"
        >{{ sessionStatusLabel }}</span>
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
        <button v-if="isHost" class="btn btn-xs btn-ghost text-warning" :title="t('room.reset')" @click="showResetModal = true">
          <span class="i-fa6-solid-rotate-left"></span>
        </button>
        <button class="btn btn-xs btn-ghost text-base-content/40" :title="t('room.settings')" @click="openSettingsModal">
          <span class="i-fa6-solid-gear"></span>
        </button>
        <button v-if="isHost" :class="['btn btn-xs btn-ghost', isIrlMode ? 'text-accent' : 'text-base-content/40']" :title="t('room.irl_mode')" @click="toggleIrlMode">
          <span class="i-fa6-solid-people-group"></span>
        </button>
        <button v-if="canClaim" class="btn btn-xs btn-outline btn-primary" @click="claimSession">
          <span class="i-fa-solid-link text-xs"></span>
          {{ t('room.claim_session') }}
        </button>
      </div>
    </header>

    <!-- Main -->
    <div class="flex-1 overflow-y-auto">

      <!-- Game over -->
      <template v-if="session.status === 'finished'">
        <GameOver :players="players" :current-player="currentPlayer" :done-tracks="doneTracks" />
      </template>

      <!-- Left column -->
      <div v-else class="flex flex-col gap-4 p-4 min-w-0">

        <!-- Conteneur principal : aspect-video seulement quand une vidéo est active -->
        <div :class="['rounded-xl overflow-hidden', videoId ? ('relative ' + (isCurrentTrackAdmin ? 'aspect-video lg:max-h-56' : 'h-20')) : '']">

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
            <p class="text-white/90 text-sm text-center px-4">{{ t('room.unlock_audio') }}</p>
          </div>

          <!-- Layer 3 : UI jeu/lobby -->
          <div
            :class="[
              'flex items-center justify-center bg-base-200 rounded-xl',
              videoId ? 'absolute inset-0' : '',
              isCurrentTrackAdmin ? 'flex-col gap-4 p-6' : 'flex-row gap-3 p-4',
              (!audioUnlocked && videoId) ? 'bg-transparent pointer-events-none' : '',
            ]"
          >
          <template v-if="currentTrack">
            <div :class="['transition-all', activeBuzz ? 'opacity-50' : (isCurrentTrackAdmin ? 'animate-bounce' : ''), isCurrentTrackAdmin ? 'text-7xl' : 'text-3xl shrink-0']">
              🎵
            </div>
            <div :class="isCurrentTrackAdmin ? 'text-center' : 'min-w-0'">
            <p :class="['font-bold font-display', isCurrentTrackAdmin ? 'text-xl px-4' : 'text-sm truncate']">
              <template v-if="isCurrentTrackAdmin">
              {{ currentTrack.expand?.video?.title || t('room.no_title') }}
                <span v-if="currentTrack.expand?.video?.artist" class="block text-base font-normal text-base-content/60">{{ currentTrack.expand?.video?.artist }}</span>
              </template>
              <template v-else>
                <span class="text-base-content/40">{{ t('room.track_by', { player: getPlayerName(currentTrack.added_by) }) }}</span>
              </template>
            </p>
            <p v-if="activeBuzz" :class="['text-warning font-semibold animate-pulse', isCurrentTrackAdmin ? 'text-sm' : 'text-xs']">
              {{ t('room.in_pause') }}
            </p>
            <template v-else>
              <p v-if="isTrackSolvedAndPlaying" :class="['text-success font-semibold', isCurrentTrackAdmin ? 'text-xs' : 'text-xs']">
                🏆 {{ t('room.solved_by', { player: getPlayerName(currentTrack.solved_by) }) }}
              </p>
              <p v-else :class="['text-base-content/40', isCurrentTrackAdmin ? 'text-xs' : 'text-xs']">{{ t('room.playing') }}</p>
              <p v-if="isIrlMode && !isDJ && djPlayer" class="text-xs text-base-content/50">
                {{ t('room.irl_music_on', { player: djPlayer.name }) }}
              </p>
            </template>
            </div>
          </template>
          <template v-else>
            <!-- Phase d'attente : lobby -->
            <template v-if="session.status === 'waiting'">
              <span class="text-5xl">🎮</span>
              <template v-if="isHost">
                <p class="font-semibold text-center">{{ t('room.host_title') }}</p>
                <ul v-if="nonHostPlayers.length > 0" class="space-y-1 w-full max-w-xs text-sm">
                  <li v-for="p in nonHostPlayers" :key="p.id" class="flex items-center gap-2">
                    <span :class="p.ready ? 'text-success' : 'text-base-content/30'">{{ p.ready ? '✓' : '○' }}</span>
                    <span>{{ p.name }}</span>
                  </li>
                </ul>
                <p v-else class="text-sm text-base-content/40">{{ t('room.waiting_players') }}</p>
                <button class="btn btn-primary btn-lg" :disabled="!canLaunch" @click="launchSession">
                  <span class="i-fa-solid-play"></span>
                  {{ t('room.launch_button') }}
                </button>
                <p v-if="queuedTracks.length === 0" class="text-xs text-base-content/40 -mt-2">
                  {{ t('room.add_track_hint') }}
                </p>
              </template>
              <template v-else>
                <p class="text-base-content/50 text-center text-sm">{{ t('room.waiting_host') }}</p>
                <button v-if="!isReady" class="btn btn-primary btn-lg" @click="markReady(true)">
                  {{ t('room.ready_button') }}
                </button>
                <div v-else class="flex items-center gap-3">
                  <div class="badge badge-success badge-lg gap-2">
                    <span class="i-fa-solid-check"></span>
                    {{ t('room.ready_badge') }}
                  </div>
                  <button class="btn btn-xs btn-ghost" @click="markReady(false)">{{ t('room.ready_cancel') }}</button>
                </div>
              </template>
            </template>
            <!-- Session en cours, entre deux morceaux -->
            <template v-else>
              <span class="text-6xl opacity-20">🎶</span>
              <p class="text-base-content/50">{{ t('room.no_track') }}</p>
              <template v-if="isHost">
                <button v-if="queuedTracks.length > 0" class="btn btn-primary" @click="playTrack(queuedTracks[0].id)">
                  <span class="i-fa-solid-play"></span>
                  {{ t('room.play_next') }}
                </button>
                <p v-else class="text-sm text-base-content/40">{{ t('room.add_tracks_hint') }}</p>
                <button class="btn btn-sm btn-ghost text-base-content/40" @click="endSession">
                  {{ t('room.end_game') }}
                </button>
              </template>
            </template>
          </template>
          </div><!-- /Layer 3 -->
        </div><!-- /aspect-video container -->

        <!-- Buzz zone (seulement pour les non-admin du morceau, et si non résolu) -->
        <div v-if="currentTrack && !isCurrentTrackAdmin && !isTrackSolvedAndPlaying" class="w-full">
          <div v-if="activeBuzz && activeBuzz.player === currentPlayer.id" class="alert alert-info">
            <span class="i-fa-solid-bell text-xl"></span>
            <div>
              <p class="font-bold">{{ isIrlMode ? t('room.buzz_irl') : t('room.buzz_submitted') }}</p>
              <p v-if="!isIrlMode" class="text-sm opacity-80">{{ activeBuzz.answer }}</p>
              <p class="text-sm opacity-70 mt-1">{{ t('room.buzz_waiting_validation') }}</p>
            </div>
          </div>
          <div v-else-if="activeBuzz" class="alert">
            <span class="i-fa-solid-bell text-xl animate-pulse"></span>
            <span>{{ t('room.buzz_answering', { player: getPlayerName(activeBuzz.player) }) }}</span>
          </div>
          <template v-else>
            <div v-if="buzzing && !isIrlMode" class="card bg-base-200 p-4 space-y-3">
              <p class="font-bold text-center">{{ t('room.buzz_answer_label') }}</p>
              <input
                v-model="answer"
                v-focus
                type="text"
                :placeholder="t('room.buzz_placeholder')"
                class="input input-bordered w-full"
                @keyup.enter="submitBuzz"
              />
              <div class="flex gap-2">
                <button class="btn btn-primary flex-1" :disabled="!answer.trim()" @click="submitBuzz">
                  <span class="i-fa-solid-paper-plane"></span>
                  {{ t('room.buzz_send') }}
                </button>
                <button class="btn btn-ghost" @click="buzzing = false">{{ t('room.buzz_cancel') }}</button>
              </div>
            </div>
            <template v-else-if="canBuzz">
              <button
                class="btn btn-error w-full h-20 text-2xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
                @click="isIrlMode ? submitBuzz() : (buzzing = true)"
              >
                <span class="i-fa-solid-bell text-3xl"></span>
                {{ t('room.buzz_button') }}
              </button>
              <p v-if="remainingAttempts <= 2" class="text-xs text-warning text-center mt-1">
                {{ t('room.buzz_attempts_remaining', { n: remainingAttempts }) }}
              </p>
            </template>
            <div v-else class="alert alert-warning alert-soft">
              <span class="i-fa-solid-ban"></span>
              <template v-if="buzzBlockReason === 'max_attempts'">{{ t('room.buzz_wait_max') }}</template>
              <template v-else-if="buzzBlockReason === 'delay'">{{ t('room.buzz_wait_delay', { s: rebuzzRemainingSeconds }) }}</template>
              <template v-else>{{ t('room.buzz_wait') }}</template>
            </div>
          </template>
        </div>

        <!-- Panel de validation (admin du morceau) -->
        <div v-if="currentTrack && isCurrentTrackAdmin && activeBuzz" class="card bg-base-200 p-4 space-y-3">
          <p class="font-bold flex items-center gap-2">
            <span class="i-fa-solid-bell text-warning animate-bounce"></span>
            {{ t('room.validate_buzz', { player: getPlayerName(activeBuzz.player) }) }}
          </p>
          <p v-if="sessionSettings.auto_reject_delay > 0 && autoRejectRemainingSeconds > 0" class="text-xs text-base-content/40 text-center tabular-nums">
            {{ t('room.auto_reject_countdown', { s: autoRejectRemainingSeconds }) }}
          </p>
          <p v-if="!isIrlMode" class="text-lg">
            <span class="font-mono bg-base-300 px-3 py-1 rounded">{{ activeBuzz.answer }}</span>
          </p>
          <div class="flex gap-2">
            <button class="btn btn-success flex-1" @click="validateBuzz">
              <span class="i-fa-solid-check"></span>
              {{ t('room.validate_correct') }}
            </button>
            <button class="btn btn-error flex-1" @click="invalidateBuzz">
              <span class="i-fa-solid-times"></span>
              {{ t('room.validate_wrong') }}
            </button>
          </div>
        </div>

        <!-- Orphan tracks notification (host only) -->
        <div v-if="isHost && nextOrphanOwner" class="card bg-warning/10 border border-warning/30 p-4 space-y-3">
          <p class="font-bold flex items-center gap-2 text-sm">
            <span class="i-fa-solid-user-slash text-warning shrink-0"></span>
            {{ t('room.orphan_notification', { player: nextOrphanOwner.name, n: orphanedQueuedTracks.length }) }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-sm btn-warning flex-1" @click="orphanInherit">
              <span class="i-fa-solid-download text-xs"></span>
              {{ t('room.orphan_inherit') }}
            </button>
            <button class="btn btn-sm btn-error flex-1" @click="orphanDelete">
              <span class="i-fa-solid-trash text-xs"></span>
              {{ t('room.orphan_delete') }}
            </button>
            <button class="btn btn-sm btn-info flex-1" @click="orphanSplit">
              <span class="i-fa6-solid-shuffle text-xs"></span>
              {{ t('room.orphan_split') }}
            </button>
          </div>
        </div>

        <!-- Actions sous le BUZZ : ajouter + passer/arrêter -->
        <div v-if="session.status !== 'finished'" class="flex items-center gap-2">
          <button
            class="btn btn-sm btn-ghost flex-1 border border-base-300"
            :disabled="!canAddTrack"
            :title="!canAddTrack ? t('room.track_equity_limit') : undefined"
            @click="showAddTrackModal = true"
          >
            <span class="i-fa-solid-plus"></span>
            {{ t('room.add_track_button') }}
          </button>
          <!-- host_choice : bouton "suivant" pour l'host quand morceau résolu -->
          <button
            v-if="isTrackSolvedAndPlaying && sessionSettings.stop_method === 'host_choice' && isHost"
            class="btn btn-sm btn-primary shrink-0"
            @click="stopCurrentTrack"
          >
            <span class="i-fa-solid-forward-step"></span>
            {{ t('room.play_next') }}
          </button>
          <!-- vote_unanimous : bouton stop/skip — non-admin pour skip uniquement -->
          <template v-else-if="currentTrack && activeBuzz?.player !== currentPlayer.id && !isTrackSolvedAndPlaying && !isCurrentTrackAdmin">
            <button v-if="!hasVotedToSkip" class="btn btn-sm btn-neutral shrink-0" @click="voteToSkip(currentTrack.id, currentPlayer.id)">
              <span class="i-fa-solid-forward-step"></span>
              {{ t('room.skip_button', { votes: skipVoteCount, needed: skipVotesNeeded }) }}
            </button>
            <span v-else class="text-xs opacity-60 shrink-0">{{ t('room.skip_voted') }}</span>
          </template>
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
              {{ t('room.tab_upcoming') }}
              <span v-if="upcomingTracks.length" class="badge badge-xs">{{ upcomingTracks.length }}</span>
            </button>
            <button
              :class="['flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border select-none transition-colors',
                       activeTab === 'done'
                         ? 'relative bg-base-100 border-base-300 border-b-transparent z-10 -mb-px pb-[9px]'
                         : 'bg-base-200 border-base-200 text-base-content/50 hover:text-base-content']"
              @click="activeTab = 'done'"
            >
              {{ t('room.tab_done') }}
              <span v-if="doneTracks.length" class="badge badge-xs">{{ doneTracks.length }}</span>
            </button>
            <button
              :class="['flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border select-none transition-colors',
                       activeTab === 'scores'
                         ? 'relative bg-base-100 border-base-300 border-b-transparent z-10 -mb-px pb-[9px]'
                         : 'bg-base-200 border-base-200 text-base-content/50 hover:text-base-content']"
              @click="activeTab = 'scores'"
            >
              {{ t('room.tab_scores') }}
            </button>
          </div>

          <div class="border border-base-300 border-t-0 rounded-b-xl bg-base-100 px-3 pb-3">
          <div ref="tabs-outer" class="overflow-hidden touch-pan-y">
            <!-- DJ candidate notification (host only) -->
            <div v-if="isIrlMode && isHost && djCandidate" class="alert alert-info mt-3 flex items-center justify-between gap-2">
              <span class="text-sm">{{ t('room.dj_candidate_banner', { name: djCandidate.name }) }}</span>
              <div class="flex gap-2 shrink-0">
                <button class="btn btn-xs btn-success" @click="approveDJ">{{ t('room.dj_accept') }}</button>
                <button class="btn btn-xs btn-ghost" @click="rejectDJ">{{ t('room.dj_reject') }}</button>
              </div>
            </div>
            <div
              ref="tabs-slider"
              :class="['flex', !isSwiping ? 'transition-transform duration-200 ease-in-out' : '']"
              :style="{ transform: tabsTransform }"
            >

              <!-- À venir -->
              <div class="w-full shrink-0 pt-3 space-y-3">
                <div v-if="myQueuedTracks.length >= 2" class="flex justify-end">
                  <button class="btn btn-xs btn-ghost text-base-content/50" @click="shuffleMyTracks">
                    <span class="i-fa6-solid-shuffle"></span>
                    {{ t('room.shuffle_my_tracks') }}
                  </button>
                </div>
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
                          <span class="text-primary">{{ track.expand?.video?.title || t('room.no_title') }}</span>
                          <span class="badge badge-xs badge-primary ml-1">{{ t('room.my_badge') }}</span>
                        </template>
                        <template v-else>???</template>
                      </p>
                      <p v-if="isMyTrack(track) && track.expand?.video?.artist" class="text-xs text-base-content/50">{{ track.expand?.video?.artist }}</p>
                      <p v-if="!isMyTrack(track)" class="text-xs text-base-content/40 mt-0.5">{{ t('room.added_by', { player: getPlayerName(track.added_by) }) }}</p>
                    </div>
                    <template v-if="isMyTrack(track) && track.status === 'queued'">
                      <button
                        v-if="confirmDeleteId !== track.id"
                        class="btn btn-ghost btn-xs text-base-content/30 hover:text-error shrink-0"
                        :disabled="!canDeleteTrack"
                        :title="t('room.delete_track')"
                        @click.stop="requestDeleteTrack(track.id)"
                      >
                        <span class="i-fa6-solid-trash"></span>
                      </button>
                      <template v-else>
                        <button class="btn btn-ghost btn-xs text-error shrink-0" @click.stop="confirmDeleteTrack(track.id)">
                          <span class="i-fa6-solid-check"></span>
                        </button>
                        <button class="btn btn-ghost btn-xs text-base-content/30 shrink-0" @click.stop="confirmDeleteId = null">
                          <span class="i-fa6-solid-xmark"></span>
                        </button>
                      </template>
                    </template>
                  </li>
                </ul>
                <p v-else class="text-sm text-center text-base-content/40 py-4">{{ t('room.no_upcoming') }}</p>
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
                        {{ track.expand?.video?.title || t('room.no_title') }}
                        <span v-if="isMyTrack(track)" class="badge badge-xs badge-primary ml-1">{{ t('room.my_badge') }}</span>
                      </p>
                      <p v-if="track.expand?.video?.artist" class="text-xs text-base-content/50">{{ track.expand?.video?.artist }}</p>
                      <p class="text-xs text-base-content/40 mt-0.5">
                        <template v-if="track.solved_by">
                          {{ t('room.solved_by', { player: getPlayerName(track.solved_by) }) }}
                        </template>
                        <template v-else>{{ t('room.skipped') }}</template>
                      </p>
                    </div>
                  </li>
                </ul>
                <p v-else class="text-sm text-center text-base-content/40 py-4">{{ t('room.no_done') }}</p>
              </div>

              <!-- Classement -->
              <div class="w-full shrink-0 pt-3">
                <ul class="space-y-2">
                  <li
                    v-for="(p, i) in rankedPlayers"
                    :key="p.id"
                    :class="['flex items-center gap-3 rounded-lg px-3 py-2', p.id === currentPlayer.id ? 'bg-primary/10 border border-primary/30' : 'bg-base-200']"
                  >
                    <span :class="['text-sm font-bold w-5 text-center', i === 0 ? 'text-warning' : 'text-base-content/40']">{{ i + 1 }}</span>
                    <span class="flex-1 text-sm font-medium truncate" :class="!isOnline(p) ? 'opacity-40' : ''">{{ p.name }}</span>
                    <span v-if="isIrlMode && p.id === session.dj_player" title="DJ" class="text-base">🎵</span>
                    <span class="font-mono font-bold text-primary tabular-nums" :class="!isOnline(p) ? 'opacity-40' : ''">
                      {{ playerRatio(p).guessable === 0 ? '—' : `${parseFloat((playerRatio(p).ratio * 100).toFixed(2))}%` }}
                    </span>
                    <span v-if="!isOnline(p)" class="w-2 h-2 rounded-full bg-base-content/20 shrink-0" :title="t('room.offline')"></span>
                    <span v-else-if="activeBuzz?.player === p.id" class="i-fa-solid-bell text-warning animate-bounce text-xs"></span>
                    <button
                      v-if="isIrlMode && p.id === currentPlayer.id && p.id !== session.dj_player && session.dj_candidate !== currentPlayer.id"
                      class="btn btn-xs btn-ghost text-accent"
                      @click="proposeDJ"
                    >
                      {{ t('room.become_dj') }}
                    </button>
                    <span v-else-if="isIrlMode && p.id === currentPlayer.id && session.dj_candidate === currentPlayer.id" class="text-xs text-base-content/40">
                      {{ t('room.dj_pending') }}
                    </span>
                  </li>
                </ul>
                <p v-if="players.length === 0" class="text-base-content/40 text-sm text-center py-4">{{ t('room.no_players') }}</p>
              </div>

            </div>
          </div>
          </div>
        </div>
      </div>
    </div>

    <SolvedOverlay v-if="buzzedAnimation" type="buzzed" />

    <SolvedOverlay
      v-if="animationState"
      :type="animationState.type"
      :player-name="animationState.playerName"
      :title="animationState.title"
      :artist="animationState.artist"
      :is-winner="animationState.playerId === props.currentPlayer.id"
    />

    <!-- Overlay "encore un moment" après une bonne réponse (continue_after_success + vote_unanimous) -->
    <div
      v-if="isTrackSolvedAndPlaying && !animationState && sessionSettings.stop_method === 'vote_unanimous'"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    >
      <div class="bg-base-100 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl text-center max-w-xs mx-4">
        <span class="i-fa6-solid-music text-primary text-6xl"></span>
        <div class="space-y-1">
          <p class="text-lg font-bold font-display">{{ currentTrack?.expand?.video?.title }}</p>
          <p class="text-sm text-base-content/60">{{ currentTrack?.expand?.video?.artist }}</p>
        </div>
        <p class="text-base-content/70 text-sm">{{ t('room.still_playing_question') }}</p>
        <button
          v-if="!hasVotedToSkip"
          class="btn btn-primary w-full"
          @click="voteToSkip(currentTrack.id, currentPlayer.id)"
        >
          {{ t('room.still_playing_stop') }}
        </button>
        <p v-else class="text-sm text-success font-medium">{{ t('room.still_playing_voted') }}</p>
        <p class="text-xs text-base-content/40">{{ t('room.still_playing_votes', { votes: skipVoteCount, needed: skipVotesNeeded }) }}</p>
      </div>
    </div>

    <!-- Modale settings -->
    <div :class="['modal', showSettingsModal ? 'modal-open' : '']">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg mb-4">{{ t('room.settings') }}</h3>
        <div class="space-y-3 text-sm">

          <div class="flex items-center justify-between gap-4">
            <span class="text-base-content/70">{{ t('admin.settings_max_buzz_attempts_label') }}</span>
            <input v-if="isHost" v-model.number="editedSettings.max_buzz_attempts" type="number" min="1" max="20" class="input input-xs w-16 text-right" />
            <span v-else class="font-mono font-bold">{{ sessionSettings.max_buzz_attempts }}</span>
          </div>

          <div class="flex items-center justify-between gap-4">
            <span class="text-base-content/70">{{ t('admin.settings_rebuzz_delay_label') }}</span>
            <div v-if="isHost" class="flex items-center gap-1">
              <input v-model.number="editedSettings.rebuzz_delay" type="number" min="0" max="60" class="input input-xs w-16 text-right" />
              <span class="text-base-content/40 text-xs">{{ t('admin.settings_seconds') }}</span>
            </div>
            <span v-else class="font-mono font-bold">{{ sessionSettings.rebuzz_delay }}s</span>
          </div>

          <div class="flex items-center justify-between gap-4">
            <span class="text-base-content/70">{{ t('admin.settings_auto_reject_delay_label') }}</span>
            <div v-if="isHost" class="flex items-center gap-1">
              <input v-model.number="editedSettings.auto_reject_delay" type="number" min="0" max="60" class="input input-xs w-16 text-right" />
              <span class="text-base-content/40 text-xs">{{ t('admin.settings_seconds') }}</span>
            </div>
            <span v-else class="font-mono font-bold">{{ sessionSettings.auto_reject_delay }}s</span>
          </div>

          <div class="flex items-center justify-between gap-4">
            <span class="text-base-content/70">{{ t('admin.settings_continue_after_success_label') }}</span>
            <input v-if="isHost" v-model="editedSettings.continue_after_success" type="checkbox" class="toggle toggle-sm toggle-primary" />
            <span v-else class="font-mono font-bold">{{ sessionSettings.continue_after_success ? '✓' : '✗' }}</span>
          </div>

          <div v-if="(isHost ? editedSettings.continue_after_success : sessionSettings.continue_after_success)" class="flex items-center justify-between gap-4">
            <span class="text-base-content/70">{{ t('admin.settings_stop_method_label') }}</span>
            <select v-if="isHost" v-model="editedSettings.stop_method" class="select select-xs">
              <option value="vote_unanimous">{{ t('admin.settings_stop_method_vote') }}</option>
              <option value="host_choice">{{ t('admin.settings_stop_method_host') }}</option>
            </select>
            <span v-else class="font-mono font-bold text-right max-w-32 leading-tight">
              {{ sessionSettings.stop_method === 'vote_unanimous' ? t('admin.settings_stop_method_vote') : t('admin.settings_stop_method_host') }}
            </span>
          </div>

          <div class="flex items-center justify-between gap-4">
            <span class="text-base-content/70">{{ t('admin.settings_force_equity_label') }}</span>
            <input v-if="isHost" v-model="editedSettings.force_equity" type="checkbox" class="toggle toggle-sm toggle-primary" />
            <span v-else class="font-mono font-bold">{{ sessionSettings.force_equity ? '✓' : '✗' }}</span>
          </div>

        </div>
        <div class="modal-action">
          <button class="btn btn-ghost btn-sm" @click="showSettingsModal = false">{{ t('room.reset_cancel') }}</button>
          <button v-if="isHost" class="btn btn-primary btn-sm" @click="saveSettings">{{ t('room.settings_save') }}</button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showSettingsModal = false"></div>
    </div>

    <!-- Modal réinitialisation -->
    <div :class="['modal', showResetModal ? 'modal-open' : '']">
      <div class="modal-box">
        <h3 class="font-bold text-lg">{{ t('room.reset_modal_title') }}</h3>
        <p class="py-4 text-base-content/70">
          {{ t('room.reset_modal_text') }}
        </p>
        <div class="modal-action">
          <button class="btn btn-ghost" :disabled="resetting" @click="showResetModal = false">{{ t('room.reset_cancel') }}</button>
          <button class="btn btn-warning" :disabled="resetting" @click="resetSession">
            <span v-if="resetting" class="loading loading-spinner loading-sm"></span>
            {{ t('room.reset_confirm') }}
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showResetModal = false"></div>
    </div>

    <!-- Modale ajout de morceau (full screen) -->
    <div v-show="showAddTrackModal" class="fixed inset-0 z-50 bg-base-100 flex flex-col">
      <header class="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-base-300">
        <h2 class="font-bold text-lg flex-1">{{ t('room.add_modal_title') }}</h2>
        <button class="btn btn-ghost btn-sm" @click="showAddTrackModal = false">
          <span class="i-fa6-solid-xmark text-lg"></span>
        </button>
      </header>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="!canAddTrack" class="alert alert-warning py-2 text-sm">
          <span class="i-fa6-solid-scale-balanced shrink-0"></span>
          {{ t('room.track_equity_limit') }}
        </div>
        <div class="tabs tabs-bordered">
          <button :class="['tab', addMode === 'search' ? 'tab-active' : '']" @click="addMode = 'search'">
            <span class="i-fa-solid-magnifying-glass mr-1"></span>
            {{ t('room.add_tab_search') }}
          </button>
          <button :class="['tab', addMode === 'single' ? 'tab-active' : '']" @click="addMode = 'single'">
            {{ t('room.add_tab_url') }}
          </button>
        </div>
        <TrackSearch v-if="addMode === 'search'" :add-track="addTrackFromSearch" :can-add-track="canAddTrack" />
        <template v-else-if="addMode === 'single'">
          <input v-model="newTrack.youtube_url" type="url" :placeholder="t('room.url_placeholder')" class="input input-bordered w-full" />
          <div class="flex flex-col gap-2">
            <div class="flex-1">
              <input v-model.number="newTrack.start_seconds" type="number" :placeholder="t('room.start_placeholder')" class="input input-bordered w-full" min="0" />
            </div>
            <div class="flex-1 relative">
              <input v-model="newTrack.title" type="text" :placeholder="t('room.title_placeholder')" class="input input-bordered w-full" />
              <span v-if="fetchingMeta" class="loading loading-spinner loading-xs absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30"></span>
            </div>
            <div class="flex-1 relative">
              <input v-model="newTrack.artist" type="text" :placeholder="t('room.artist_placeholder')" class="input input-bordered w-full" />
              <span v-if="fetchingMeta" class="loading loading-spinner loading-xs absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30"></span>
            </div>
          </div>
          <button class="btn btn-primary w-full" :disabled="!newTrack.youtube_url.trim() || addingTrack || !canAddTrack" @click="handleAddTrack">
            <span v-if="addingTrack" class="loading loading-spinner loading-sm"></span>
            {{ t('room.add_button') }}
          </button>
        </template>
      </div>
    </div>
  </div>

  <!-- Modale doublon -->
  <div v-if="myDuplicateTrack" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg">{{ t('room.duplicate_title') }}</h3>
      <p class="py-3 text-sm">{{ t('room.duplicate_body', { title: myDuplicateTrack.expand?.video?.title ?? t('room.no_title') }) }}</p>
      <div class="modal-action">
        <button class="btn btn-ghost" @click="dismissDuplicate(true)">{{ t('room.duplicate_keep') }}</button>
        <button class="btn btn-error" @click="dismissDuplicate(false)">{{ t('room.duplicate_delete') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import Sortable from 'sortablejs'
import { useSwipe } from '@vueuse/core'
import usePlayers from '@game/composables/usePlayers'
import useTracks from '@game/composables/useTracks'
import useBuzzes from '@game/composables/useBuzzes'
import YoutubePlayer from '@game/components/YoutubePlayer.vue'
import TrackSearch from '@game/components/TrackSearch.vue'
import ShareQR from '@game/components/ShareQR.vue'
import GameOver from '@game/components/GameOver.vue'
import SolvedOverlay from '@game/components/SolvedOverlay.vue'
import { pb } from '@game/pb'
import { getVideoId, isOnline } from '@game/utils'
import useAuth from '@admin/composables/useAuth'

const { t } = useI36n()
const { isAuthenticated, user, refreshAuth } = useAuth()
if (isAuthenticated.value && !user.value?.id) refreshAuth()

const props = defineProps<{
  session: any
  currentPlayer: any
}>()


const { players, onlinePlayers } = usePlayers(props.session.id)
const manuallyDeletingIds = new Set<string>()

const { tracks, currentTrack, queuedTracks, addTrack, playTrack, finishTrack, voteToSkip, deleteTrack } = useTracks(props.session.id)

const myDuplicateTrack = computed(() =>
  tracks.value.find(t => t.is_duplicate && t.added_by === props.currentPlayer.id) ?? null
)

const dismissDuplicate = (keep: boolean) => {
  if (!myDuplicateTrack.value) return
  if (keep) {
    acknowledgedDuplicateIds.add(myDuplicateTrack.value.id)
    pb.collection('tracks').update(myDuplicateTrack.value.id, { is_duplicate: false })
  } else {
    manuallyDeletingIds.add(myDuplicateTrack.value.id)
    deleteTrack(myDuplicateTrack.value.id)
  }
}
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
const sessionSettings = computed(() => {
  const s = (props.session.settings ?? {}) as Record<string, any>
  return {
    max_buzz_attempts: s.max_buzz_attempts ?? 5,
    rebuzz_delay: s.rebuzz_delay ?? 5,
    auto_reject_delay: s.auto_reject_delay ?? 8,
    continue_after_success: s.continue_after_success ?? true,
    stop_method: (s.stop_method ?? 'vote_unanimous') as 'vote_unanimous' | 'host_choice',
    force_equity: s.force_equity ?? false,
  }
})
const { activeBuzz, canBuzz, buzzBlockReason, rebuzzRemainingSeconds, remainingAttempts, buzz, solvedBuzz } = useBuzzes(
  computed(() => currentTrack.value?.id),
  props.currentPlayer.id,
  otherEligibleCount,
  sessionSettings,
)

// UI state
const buzzing = ref(false)
const answer = ref('')
const addingTrack = ref(false)
const addMode = ref<'search' | 'single'>('search')
const newTrack = ref({ youtube_url: '', start_seconds: 0, title: '', artist: '' })
const fetchingMeta = ref(false)
const audioUnlocked = ref(false)
const animationState = ref<{ type?: 'solved' | 'skipped'; playerName: string; playerId?: string; title: string; artist: string } | null>(null)
const showResetModal = ref(false)
const showAddTrackModal = ref(false)
const resetting = ref(false)
const nextOrphanOwner = computed(() => {
  if (!queuedTracks.value.length) return null
  const next = queuedTracks.value[0]
  const onlineIds = new Set(onlinePlayers.value.map((p: any) => p.id))
  if (onlineIds.has(next.added_by)) return null
  return players.value.find((p: any) => p.id === next.added_by) ?? null
})
const orphanedQueuedTracks = computed(() =>
  nextOrphanOwner.value
    ? queuedTracks.value.filter(t => t.added_by === nextOrphanOwner.value!.id)
    : [],
)

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

let duplicateCheckTimeout: ReturnType<typeof setTimeout> | null = null
const acknowledgedDuplicateIds = new Set<string>()

watch(currentTrack, (newTrack, oldTrack) => {
  if (!isHost.value) return
  if (!oldTrack) return
  if (newTrack?.id === oldTrack.id) return
  if (duplicateCheckTimeout) clearTimeout(duplicateCheckTimeout)
  duplicateCheckTimeout = setTimeout(async () => {
    const videoId: string = oldTrack.video
    const dupes = queuedTracks.value.filter(
      t => t.video === videoId && !t.is_duplicate && !acknowledgedDuplicateIds.has(t.id)
    )
    for (const dupe of dupes) {
      await pb.collection('tracks').update(dupe.id, { is_duplicate: true })
    }
  }, 3500)
})

const buzzedAnimation = ref(false)

watch(activeBuzz, (buzz) => {
  if (buzz && isCurrentTrackAdmin.value) {
    showAddTrackModal.value = false
  }
})

watch(activeBuzz, (newBuzz) => {
  if (newBuzz && newBuzz.player === props.currentPlayer.id) {
    buzzedAnimation.value = true
    setTimeout(() => { buzzedAnimation.value = false }, 2000)
  }
})

watch(solvedBuzz, (buzz) => {
  if (!buzz) return
  const track = tracks.value.find((t: any) => t.id === buzz.track)
  const player = players.value.find((p: any) => p.id === buzz.player)
  animationState.value = {
    playerName: player?.name ?? t('room.unknown_player'),
    playerId: buzz.player,
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

const onPlaying = () => { audioUnlocked.value = true }

// Computed
const isCurrentTrackAdmin = computed(() =>
  !!trackValidatorId.value && trackValidatorId.value === props.currentPlayer.id
)
const sessionStatusLabel = computed(
  () => ({
    waiting: t('room.status_waiting'),
    playing: t('room.status_playing'),
    finished: t('room.status_finished'),
  })[props.session.status as string] ?? props.session.status,
)
const isHost = computed(() => props.session.host === props.currentPlayer.id)

watch(
  [() => props.session.host, onlinePlayers],
  ([hostId, online]) => {
    if (online.length === 0) return
    const hostOnline = !!hostId && online.some(p => p.id === hostId)
    if (hostOnline) return
    const elected = [...online].sort((a, b) => a.created.localeCompare(b.created))[0]
    if (elected.id === props.currentPlayer.id) {
      pb.collection('sessions').update(props.session.id, { host: elected.id })
    }
  },
  { immediate: true },
)

const canClaim = computed(() => isHost.value && isAuthenticated.value && user.value?.id && !props.session.owner)

const claimSession = () =>
  pb.collection('sessions').update(props.session.id, { owner: user.value.id })
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
  if (isTrackSolvedAndPlaying.value) return Math.max(1, onlinePlayers.value.length)
  return Math.max(1, onlinePlayers.value.filter(p => p.id !== trackValidatorId.value).length)
})
const hasVotedToSkip = computed(() => skipVoteArray.value.includes(props.currentPlayer.id))
const isTrackSolvedAndPlaying = computed(() =>
  !!currentTrack.value?.solved_by && currentTrack.value?.status === 'playing'
)
const canAddTrack = computed(() => {
  if (!sessionSettings.value.force_equity) return true
  const myCount = tracks.value.filter(t => t.added_by === props.currentPlayer.id).length
  const others = players.value.filter(p => p.id !== props.currentPlayer.id)
  if (others.length === 0) return true
  const minOthers = Math.min(...others.map(p =>
    tracks.value.filter(t => t.added_by === p.id).length
  ))
  return myCount <= minOthers
})

const canDeleteTrack = computed(() => {
  if (!sessionSettings.value.force_equity) return true
  const myCount = tracks.value.filter(t => t.added_by === props.currentPlayer.id).length
  const others = players.value.filter(p => p.id !== props.currentPlayer.id)
  if (others.length === 0) return true
  const minOthers = Math.min(...others.map(p =>
    tracks.value.filter(t => t.added_by === p.id).length
  ))
  return myCount >= minOthers
})

watch(buzzBlockReason, (reason) => {
  if (reason === 'max_attempts' && currentTrack.value && !hasVotedToSkip.value && !isTrackSolvedAndPlaying.value) {
    voteToSkip(currentTrack.value.id, props.currentPlayer.id)
  }
})

watch(skipVoteArray, async (votes) => {
  if (!currentTrack.value) return
  if (animationState.value?.type === 'skipped') return
  if (onlinePlayers.value.length > 1 && votes.length >= skipVotesNeeded.value) {
    // Track already solved: advance silently (no "skipped" animation)
    if (isTrackSolvedAndPlaying.value) {
      if (!isHost.value) return
      const trackId = currentTrack.value.id
      await finishTrack(trackId)
      const next = queuedTracks.value[0]
      if (next) { await playTrack(next.id) }
      return
    }
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
      if (next) { await playTrack(next.id) }
    }, 3000)
  }
})

const orphanInherit = async () => {
  await Promise.all(orphanedQueuedTracks.value.map(t =>
    pb.collection('tracks').update(t.id, { added_by: props.currentPlayer.id })
  ))
}

const orphanDelete = async () => {
  await Promise.all(orphanedQueuedTracks.value.map(t => deleteTrack(t.id)))
}

const orphanSplit = async () => {
  const recipients = onlinePlayers.value.filter((p: any) => p.id !== nextOrphanOwner.value?.id)
  if (recipients.length === 0) {
    await orphanInherit()
    return
  }
  await Promise.all(orphanedQueuedTracks.value.map((t, i) =>
    pb.collection('tracks').update(t.id, { added_by: recipients[i % recipients.length].id })
  ))
}

const playerRatio = (player: any) => {
  const guessable = doneTracks.value.filter(t => t.added_by !== player.id).length
  const guessed = doneTracks.value.filter(t => t.solved_by === player.id).length
  return { guessed, guessable, ratio: guessable > 0 ? guessed / guessable : 0 }
}

const rankedPlayers = computed(() =>
  [...players.value].sort((a, b) => {
    const ra = playerRatio(a)
    const rb = playerRatio(b)
    if (rb.ratio !== ra.ratio) return rb.ratio - ra.ratio
    return rb.guessed - ra.guessed
  })
)

const myQueuedTracks = computed(() =>
  queuedTracks.value.filter(t => t.added_by === props.currentPlayer.id)
)

const shuffleMyTracks = async () => {
  const my = myQueuedTracks.value
  if (my.length < 2) return
  const orders = my.map(t => t.order)
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orders[i], orders[j]] = [orders[j], orders[i]]
  }
  await Promise.all(my.map((track, i) =>
    pb.collection('tracks').update(track.id, { order: orders[i] }, { requestKey: null })
  ))
}

const getPlayerName = (playerId: string) => players.value.find(p => p.id === playerId)?.name ?? t('room.unknown_player')
const isMyTrack = (track: any) => track.added_by === props.currentPlayer.id
const confirmDeleteId = ref<string | null>(null)
const requestDeleteTrack = (trackId: string) => { confirmDeleteId.value = trackId }
const confirmDeleteTrack = async (trackId: string) => {
  manuallyDeletingIds.add(trackId)
  confirmDeleteId.value = null
  await deleteTrack(trackId)
}

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

  await Promise.all([
    pb.collection('buzzes').update(buzzId, { status: 'correct' }),
    buzzer && pb.collection('players').update(buzzer.id, { score: (buzzer.score || 0) + 1 }),
  ])

  setTimeout(async () => {
    if (sessionSettings.value.continue_after_success) {
      await pb.collection('tracks').update(trackId, { solved_by: buzzPlayerId, skip_votes: [] })
    } else {
      await pb.collection('tracks').update(trackId, { status: 'done', solved_by: buzzPlayerId })
      if (next) { await playTrack(next.id) }
    }
  }, 3000)
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

const stopCurrentTrack = async () => {
  if (!currentTrack.value) return
  const trackId = currentTrack.value.id
  const next = queuedTracks.value[0]
  await finishTrack(trackId)
  if (next) { await playTrack(next.id) }
}

let autoRejectTimer: ReturnType<typeof setTimeout> | null = null
let autoRejectClock: ReturnType<typeof setInterval> | null = null
const autoRejectNow = ref(Date.now())

const autoRejectRemainingSeconds = computed(() => {
  if (!activeBuzz.value || !isCurrentTrackAdmin.value || sessionSettings.value.auto_reject_delay <= 0) return 0
  const deadline = new Date(activeBuzz.value.created).getTime() + sessionSettings.value.auto_reject_delay * 1000
  return Math.max(0, Math.ceil((deadline - autoRejectNow.value) / 1000))
})

watch([activeBuzz, isCurrentTrackAdmin], ([buzz, isAdmin]) => {
  if (autoRejectTimer) { clearTimeout(autoRejectTimer); autoRejectTimer = null }
  if (autoRejectClock) { clearInterval(autoRejectClock); autoRejectClock = null }
  if (buzz && (buzz as any).status === 'pending' && isAdmin && sessionSettings.value.auto_reject_delay > 0) {
    autoRejectClock = setInterval(() => { autoRejectNow.value = Date.now() }, 500)
    autoRejectTimer = setTimeout(() => {
      if (autoRejectClock) { clearInterval(autoRejectClock); autoRejectClock = null }
      if (activeBuzz.value?.id === (buzz as any).id && activeBuzz.value?.status === 'pending') {
        invalidateBuzz()
      }
    }, sessionSettings.value.auto_reject_delay * 1000)
  }
}, { immediate: true })

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
  if (duplicateCheckTimeout) { clearTimeout(duplicateCheckTimeout); duplicateCheckTimeout = null }
  acknowledgedDuplicateIds.clear()
  try {
    const allBuzzes = await pb.collection('buzzes').getFullList({
      filter: tracks.value.map(t => `track="${t.id}"`).join(' || '),
      requestKey: null,
    })
    const allOps: Array<(b: ReturnType<typeof pb.createBatch>) => void> = [
      ...allBuzzes.map(buzz => (b: ReturnType<typeof pb.createBatch>) => b.collection('buzzes').delete(buzz.id)),
      ...players.value.map(p => (b: ReturnType<typeof pb.createBatch>) => b.collection('players').update(p.id, { score: 0 })),
      ...tracks.value.map(t => (b: ReturnType<typeof pb.createBatch>) => b.collection('tracks').update(t.id, { status: 'queued', solved_by: null, skip_votes: [], is_duplicate: false })),
      (b: ReturnType<typeof pb.createBatch>) => b.collection('sessions').update(props.session.id, { status: 'waiting' }),
    ]
    for (let i = 0; i < allOps.length; i += 45) {
      const batch = pb.createBatch()
      allOps.slice(i, i + 45).forEach(op => op(batch))
      await batch.send()
    }
    showResetModal.value = false
  } finally {
    resetting.value = false
  }
}

const showSettingsModal = ref(false)
const editedSettings = ref({ ...sessionSettings.value })

const openSettingsModal = () => {
  editedSettings.value = { ...sessionSettings.value }
  showSettingsModal.value = true
}

const saveSettings = async () => {
  await pb.collection('sessions').update(props.session.id, { settings: { ...editedSettings.value } })
  showSettingsModal.value = false
}

const endSession = () =>
  pb.collection('sessions').update(props.session.id, { status: 'finished' })

const handleAddTrack = async () => {
  if (!canAddTrack.value) return
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
    showAddTrackModal.value = false
  } finally {
    addingTrack.value = false
  }
}

const addTrackFromSearch = (data: { video_id: string; title?: string; artist?: string; duration?: number; start_seconds?: number }) => {
  if (!canAddTrack.value) return
  return addTrack({ ...data, start_seconds: data.start_seconds ?? 0, added_by: props.currentPlayer.id })
}

// Drag & drop — own queued tracks only
let sortableInstance: Sortable | null = null

watch(trackListEl, (el) => {
  if (el) {
    sortableInstance = Sortable.create(el, {
      draggable: '.draggable-track',
      handle: '.drag-handle',
      animation: 150,
      onEnd() {
        const myQueued = queuedTracks.value
          .filter(t => t.added_by === props.currentPlayer.id)
          .sort((a, b) => a.order - b.order)
        if (myQueued.length < 2) return

        const slots = myQueued.map(t => t.order)

        const myInNewOrder = Array.from(el.querySelectorAll('[data-id]'))
          .map(node => node.getAttribute('data-id'))
          .map(id => queuedTracks.value.find(t => t.id === id))
          .filter((t): t is any => !!t && t.added_by === props.currentPlayer.id)

        if (myInNewOrder.length !== slots.length) return

        const updates = myInNewOrder
          .map((track, i) => ({ track, newOrder: slots[i] }))
          .filter(({ track, newOrder }) => track.order !== newOrder)

        if (updates.length === 0) return

        updates.forEach(({ track, newOrder }) => {
          const idx = tracks.value.findIndex(t => t.id === track.id)
          if (idx >= 0) tracks.value[idx] = { ...tracks.value[idx], order: newOrder }
        })

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

onUnmounted(() => {
  sortableInstance?.destroy()
  if (autoRejectTimer) { clearTimeout(autoRejectTimer) }
  if (autoRejectClock) { clearInterval(autoRejectClock) }
  if (duplicateCheckTimeout) { clearTimeout(duplicateCheckTimeout) }
})
</script>
