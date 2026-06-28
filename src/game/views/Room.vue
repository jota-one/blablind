<template>
  <div class="h-screen flex flex-col overflow-hidden">

    <!-- Header -->
    <header class="shrink-0 bg-base-100/90 backdrop-blur border-b border-base-300">
      <!-- Ligne 1 : identité + menu -->
      <div class="px-4 py-3 flex items-center gap-3">
        <a href="/" class="text-base-content/40 hover:text-base-content transition-colors">
          <span class="i-fa-solid-home text-lg"></span>
        </a>
        <h1 class="font-bold text-lg font-display flex-1 truncate">{{ session.name }}</h1>
        <button
          v-if="isHost && session.status === 'playing'"
          type="button"
          :disabled="!canTogglePause"
          :class="['badge badge-sm border-none', isPaused ? 'badge-warning' : 'badge-success', canTogglePause ? 'cursor-pointer' : 'cursor-default']"
          :title="isPaused ? t('room.resume') : t('room.pause')"
          @click="togglePause"
        >{{ isPaused ? t('room.status_paused') : sessionStatusLabel }}</button>
        <span
          v-else
          :class="['badge badge-sm', isPaused ? 'badge-warning' : session.status === 'playing' ? 'badge-success' : session.status === 'finished' ? 'badge-neutral' : 'badge-warning']"
        >{{ isPaused ? t('room.status_paused') : sessionStatusLabel }}</span>
        <button type="button" class="btn btn-sm btn-ghost relative shrink-0" :title="t('room.menu')" @click="showMenuDrawer = true">
          <span class="i-fa6-solid-bars text-base"></span>
          <span v-if="hasPendingRoleRequest" class="absolute top-1 right-1 h-2 w-2 rounded-full bg-error"></span>
        </button>
      </div>
      <!-- Ligne 2 : contexte slim (info, ouvre le menu) -->
      <button
        type="button"
        class="w-full px-4 py-1.5 flex items-center gap-2 border-t border-base-200 text-xs text-base-content/50 hover:bg-base-200/50 transition-colors"
        @click="showMenuDrawer = true"
      >
        <span v-if="isIrlMode" class="badge badge-xs badge-accent shrink-0">IRL</span>
        <span v-if="isIrlMode && djPlayer" class="truncate">🎵 {{ djPlayer.name }}</span>
        <span v-if="hostPlayer" class="truncate">👑 {{ hostPlayer.name }}</span>
        <span class="flex items-center gap-1 shrink-0"><span class="i-fa-solid-users text-[0.65rem]"></span>{{ onlinePlayers.length }}</span>
        <span v-if="hasPendingRoleRequest" class="ml-auto relative flex h-2 w-2 shrink-0">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
        </span>
      </button>
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
              :paused="audioUnlocked && (!!activeBuzz || pausedByDuration || isPaused)"
              :seek-request="seekRequest"
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
              (isCurrentTrackAdmin || !currentTrack) ? 'flex-col gap-4 p-6' : 'flex-row gap-3 p-4',
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
              <p v-if="isHost" class="font-semibold text-center">{{ t('room.host_title') }}</p>

              <!-- Participant list (visible to everyone) -->
              <div class="w-full max-w-xs space-y-2">
                <p class="text-xs uppercase tracking-wide font-semibold text-base-content/40 px-1">{{ t('room.participants') }}</p>
                <ul class="space-y-1.5">
                  <li
                    v-for="p in lobbyPlayers"
                    :key="p.id"
                    class="flex items-center gap-2.5 rounded-lg bg-base-100 px-3 py-2 shadow-sm"
                    :class="!isOnline(p) ? 'opacity-40' : ''"
                  >
                    <img
                      v-if="avatarUrl(p)"
                      :src="avatarUrl(p)"
                      :alt="p.name"
                      class="w-8 h-8 shrink-0 rounded-full object-cover bg-base-200"
                      loading="lazy"
                    />
                    <span v-else class="w-8 h-8 shrink-0 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center">{{ initial(p.name) }}</span>
                    <span class="flex-1 min-w-0 truncate font-medium text-sm">
                      {{ p.name }}
                      <span v-if="p.id === currentPlayer.id" class="text-xs text-base-content/40">({{ t('room.you') }})</span>
                    </span>
                    <span v-if="p.id === session.host" class="badge badge-warning badge-sm gap-1">👑 {{ t('room.host_badge') }}</span>
                    <span v-else-if="p.ready" class="badge badge-success badge-sm gap-1"><span class="i-fa-solid-check text-[0.6rem]"></span>{{ t('room.ready_badge') }}</span>
                    <span v-else class="badge badge-ghost badge-sm text-base-content/50">{{ t('room.player_waiting') }}</span>
                  </li>
                </ul>
              </div>

              <template v-if="isHost">
                <button class="btn btn-primary btn-lg max-w-full" :disabled="!canLaunch" @click="launchSession">
                  <span class="i-fa-solid-play"></span>
                  {{ t('room.launch_button') }}
                </button>
                <p v-if="queuedTracks.length === 0" class="text-xs text-base-content/40 -mt-2">
                  {{ t('room.add_track_hint') }}
                </p>
              </template>
              <template v-else>
                <button v-if="!isReady" class="btn btn-primary btn-lg max-w-full" @click="markReady(true)">
                  {{ t('room.ready_button') }}
                </button>
                <div v-else class="flex flex-col items-center gap-2">
                  <p class="text-base-content/50 text-center text-sm">{{ t('room.waiting_host') }}</p>
                  <button class="btn btn-xs btn-ghost" @click="markReady(false)">{{ t('room.ready_cancel') }}</button>
                </div>
              </template>
            </template>
            <!-- Session en cours, entre deux morceaux -->
            <template v-else>
              <span class="text-6xl opacity-20">🎶</span>
              <p class="text-base-content/50">{{ t('room.no_track') }}</p>
              <template v-if="isHost">
                <button v-if="queuedTracks.length > 0" class="btn btn-primary" @click="startTrack(queuedTracks[0])">
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
                data-testid="buzz-answer"
                type="text"
                :placeholder="t('room.buzz_placeholder')"
                class="input input-bordered w-full"
                @keyup.enter="submitBuzz"
              />
              <div class="flex gap-2">
                <button class="btn btn-primary flex-1" data-testid="buzz-send" :disabled="!answer.trim()" @click="submitBuzz">
                  <span class="i-fa-solid-paper-plane"></span>
                  {{ t('room.buzz_send') }}
                </button>
                <button class="btn btn-ghost" @click="buzzing = false">{{ t('room.buzz_cancel') }}</button>
              </div>
            </div>
            <template v-else-if="canBuzz">
              <button
                class="btn btn-error w-full h-20 text-2xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
                data-testid="buzz-button"
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
            <button class="btn btn-success flex-1" data-testid="validate-correct" @click="validateBuzz">
              <span class="i-fa-solid-check"></span>
              {{ t('room.validate_correct') }}
            </button>
            <button class="btn btn-error flex-1" data-testid="validate-wrong" @click="invalidateBuzz">
              <span class="i-fa-solid-times"></span>
              {{ t('room.validate_wrong') }}
            </button>
          </div>
        </div>

        <!-- Skip voters info (track admin only) -->
        <div v-if="isCurrentTrackAdmin && currentTrack && skipVoterNames.length > 0 && !isTrackSolvedAndPlaying" class="text-xs text-base-content/50 text-center">
          <span class="i-fa-solid-forward-step text-xs mr-1"></span>{{ t('room.skip_voters', { names: skipVoterNames.join(', ') }) }}
        </div>

        <!-- Orphan tracks notification (host only) -->
        <div v-if="isHost && nextOrphanOwner && !orphanDecisionTrack" class="card bg-warning/10 border border-warning/30 p-4 space-y-3">
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
          <!-- vote_unanimous : bouton stop/skip — non-admin pour skip uniquement -->
          <template v-if="currentTrack && activeBuzz?.player !== currentPlayer.id && !isTrackSolvedAndPlaying && !isCurrentTrackAdmin">
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
              <span v-if="doneTracks.length" class="badge badge-xs" data-testid="done-count">{{ doneTracks.length }}</span>
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
            <!-- Host transfer request (host only) -->
            <div v-if="isHost && hostCandidate" class="alert alert-info mt-3 flex items-center justify-between gap-2">
              <span class="text-sm">{{ t('room.host_candidate_banner', { name: hostCandidate.name }) }}</span>
              <div class="flex gap-2 shrink-0">
                <button class="btn btn-xs btn-success" @click="approveHost">{{ t('room.host_accept') }}</button>
                <button class="btn btn-xs btn-ghost" @click="rejectHost">{{ t('room.host_reject') }}</button>
              </div>
            </div>
            <!-- DJ candidate notification (host only) -->
            <div v-if="isIrlMode && isDJ && djCandidate" class="alert alert-info mt-3 flex items-center justify-between gap-2">
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
                <div v-if="myQueuedTracks.length >= 2 || (isHost && queuedTracks.length >= 2 && !currentTrack)" class="flex justify-end gap-2">
                  <button v-if="isHost && queuedTracks.length >= 2 && !currentTrack" class="btn btn-xs btn-ghost text-base-content/50" @click="shuffleAllTracks">
                    <span class="i-fa6-solid-shuffle"></span>
                    {{ t('room.shuffle_all_tracks') }}
                  </button>
                  <button v-if="myQueuedTracks.length >= 2" class="btn btn-xs btn-ghost text-base-content/50" @click="shuffleMyTracks">
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
                      <TrackTimingBadges v-if="isMyTrack(track)" :track="track" class="sm:hidden mt-0.5" />
                    </div>
                    <TrackTimingBadges v-if="isMyTrack(track)" :track="track" class="hidden sm:flex shrink-0" />
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
                    <span :class="['text-sm font-bold w-5 text-center shrink-0', i === 0 ? 'text-warning' : 'text-base-content/40']">{{ i + 1 }}</span>
                    <img
                      v-if="avatarUrl(p)"
                      :src="avatarUrl(p)"
                      :alt="p.name"
                      class="w-7 h-7 shrink-0 rounded-full object-cover bg-base-200"
                      :class="!isOnline(p) ? 'opacity-40' : ''"
                      loading="lazy"
                    />
                    <span v-else class="w-7 h-7 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center" :class="!isOnline(p) ? 'opacity-40' : ''">{{ initial(p.name) }}</span>
                    <span class="flex-1 text-sm font-medium truncate" :class="!isOnline(p) ? 'opacity-40' : ''">{{ p.name }}</span>
                    <span v-if="p.id === session.host" class="text-xs" title="Host">👑</span>
                    <span v-if="isIrlMode && p.id === session.dj_player" title="DJ" class="text-base">🎵</span>
                    <div class="flex flex-col items-end tabular-nums" :class="!isOnline(p) ? 'opacity-40' : ''">
                      <span class="font-mono font-bold text-primary">
                        {{ playerRatio(p).guessable === 0 ? '—' : `${parseFloat((playerRatio(p).ratio * 100).toFixed(2))}%` }}
                      </span>
                      <span v-if="playerRatio(p).guessable > 0" class="font-mono text-xs text-base-content/40">
                        {{ playerRatio(p).guessed }}/{{ playerRatio(p).guessable }}
                      </span>
                    </div>
                    <span v-if="!isOnline(p)" class="w-2 h-2 rounded-full bg-base-content/20 shrink-0" :title="t('room.offline')"></span>
                    <span v-else-if="activeBuzz?.player === p.id" class="i-fa-solid-bell text-warning animate-bounce text-xs"></span>
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

    <!-- Overlay "encore un moment" après une bonne réponse.
         vote_unanimous : tout le monde vote. host_choice : seul le host décide. -->
    <div
      v-if="awaitingAdvance && !animationState && (sessionSettings.stop_method === 'vote_unanimous' || (sessionSettings.stop_method === 'host_choice' && isHost))"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    >
      <div class="bg-base-100 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl text-center max-w-xs mx-4">
        <span class="i-fa6-solid-music text-primary text-6xl"></span>
        <div class="space-y-1">
          <p class="text-lg font-bold font-display">{{ currentTrack?.expand?.video?.title }}</p>
          <p class="text-sm text-base-content/60">{{ currentTrack?.expand?.video?.artist }}</p>
        </div>

        <!-- host_choice : le host avance quand il veut -->
        <template v-if="sessionSettings.stop_method === 'host_choice'">
          <p class="text-base-content/70 text-sm">{{ t('room.host_choice_question') }}</p>
          <button class="btn btn-primary w-full" @click="stopCurrentTrack">
            <span class="i-fa-solid-forward-step"></span>
            {{ t('room.play_next') }}
          </button>
          <button
            class="btn btn-outline btn-primary w-full"
            :disabled="!canAddTrack"
            :title="!canAddTrack ? t('room.track_equity_limit') : undefined"
            @click="showAddTrackModal = true"
          >
            <span class="i-fa-solid-plus"></span>
            {{ t('room.add_track_button') }}
          </button>
        </template>

        <!-- vote_unanimous : tout le monde vote pour arrêter -->
        <template v-else>
          <p class="text-base-content/70 text-sm">{{ t('room.still_playing_question') }}</p>
          <button
            v-if="!hasVotedToSkip"
            class="btn btn-primary w-full"
            @click="voteToSkip(currentTrack.id, currentPlayer.id)"
          >
            {{ t('room.still_playing_stop') }}
          </button>
          <template v-else>
            <p class="text-sm text-success font-medium">{{ t('room.still_playing_voted') }}</p>
            <button
              class="btn btn-outline btn-primary w-full"
              :disabled="!canAddTrack"
              :title="!canAddTrack ? t('room.track_equity_limit') : undefined"
              @click="showAddTrackModal = true"
            >
              <span class="i-fa-solid-plus"></span>
              {{ t('room.add_track_button') }}
            </button>
          </template>
          <p class="text-xs text-base-content/40">{{ t('room.still_playing_votes', { votes: skipVoteCount, needed: skipVotesNeeded }) }}</p>
        </template>
      </div>
    </div>

    <!-- Modale décision morceau orphelin (host only) -->
    <div :class="['modal', isHost && orphanDecisionTrack ? 'modal-open' : '']">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg">{{ t('room.orphan_decision_title') }}</h3>
        <p class="py-3 text-sm">
          {{ t('room.orphan_decision_body', { player: getPlayerName(orphanDecisionTrack?.added_by) }) }}
        </p>
        <p class="text-sm font-medium truncate mb-3">🎵 {{ orphanDecisionTrack?.expand?.video?.title ?? t('room.no_title') }}</p>
        <div class="flex flex-col gap-2">
          <button class="btn btn-sm btn-primary" @click="claimOrphanTrack">
            <span class="i-fa-solid-hand text-xs"></span>
            {{ t('room.orphan_claim') }}
          </button>
          <button class="btn btn-sm btn-ghost border border-base-300" :disabled="queuedTracks.length <= 1" @click="pushOrphanBack(1)">
            {{ t('room.orphan_push_1') }}
          </button>
          <button class="btn btn-sm btn-ghost border border-base-300" :disabled="queuedTracks.length <= 1" @click="pushOrphanBack(5)">
            {{ t('room.orphan_push_5') }}
          </button>
          <button class="btn btn-sm btn-error btn-outline" @click="deleteOrphanTrack">
            <span class="i-fa6-solid-trash text-xs"></span>
            {{ t('room.orphan_decision_delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modale rôles (host / DJ) -->
    <div :class="['modal', showRolesModal ? 'modal-open' : '']">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg mb-4">{{ rolesTitle }}</h3>

        <!-- Host -->
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-wide font-semibold text-base-content/40">{{ t('room.host_badge') }}</p>
          <div class="flex items-center gap-3">
            <img
              v-if="hostPlayer && avatarUrl(hostPlayer)"
              :src="avatarUrl(hostPlayer)"
              :alt="hostPlayer.name"
              class="w-9 h-9 shrink-0 rounded-full object-cover bg-base-200"
            />
            <span v-else class="w-9 h-9 shrink-0 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center">{{ initial(hostPlayer?.name ?? '?') }}</span>
            <span class="flex-1 min-w-0 truncate font-medium">👑 {{ hostPlayer?.name ?? '—' }}</span>
          </div>
          <!-- Pending request (host sees accept/reject) -->
          <div v-if="isHost && hostCandidate" class="alert alert-info py-2 text-sm flex items-center justify-between gap-2">
            <span>{{ t('room.host_candidate_banner', { name: hostCandidate.name }) }}</span>
            <div class="flex gap-2 shrink-0">
              <button class="btn btn-xs btn-success" @click="approveHost(); showRolesModal = false">{{ t('room.host_accept') }}</button>
              <button class="btn btn-xs btn-ghost" @click="rejectHost">{{ t('room.host_reject') }}</button>
            </div>
          </div>
          <!-- Request / reclaim host -->
          <button
            v-if="!isHost && session.host_candidate !== currentPlayer.id"
            class="btn btn-primary btn-sm w-full"
            @click="proposeHost(); showRolesModal = false"
          >
            {{ isOwner ? t('room.reclaim_host') : t('room.become_host') }}
          </button>
          <p v-else-if="!isHost && session.host_candidate === currentPlayer.id" class="text-sm text-base-content/50 text-center">
            {{ t('room.host_pending') }}
          </p>
        </div>

        <!-- DJ (IRL mode only) -->
        <template v-if="isIrlMode">
          <div class="divider my-3"></div>
          <div class="space-y-2">
            <p class="text-xs uppercase tracking-wide font-semibold text-base-content/40">DJ 🎵</p>
            <div class="flex items-center gap-3">
              <img
                v-if="djPlayer && avatarUrl(djPlayer)"
                :src="avatarUrl(djPlayer)"
                :alt="djPlayer.name"
                class="w-9 h-9 shrink-0 rounded-full object-cover bg-base-200"
              />
              <span v-else class="w-9 h-9 shrink-0 rounded-full bg-accent/15 text-accent text-sm font-bold flex items-center justify-center">{{ initial(djPlayer?.name ?? '?') }}</span>
              <span class="flex-1 min-w-0 truncate font-medium">🎵 {{ djPlayer?.name ?? '—' }}</span>
            </div>
            <div v-if="isDJ && djCandidate" class="alert alert-info py-2 text-sm flex items-center justify-between gap-2">
              <span>{{ t('room.dj_candidate_banner', { name: djCandidate.name }) }}</span>
              <div class="flex gap-2 shrink-0">
                <button class="btn btn-xs btn-success" @click="approveDJ(); showRolesModal = false">{{ t('room.dj_accept') }}</button>
                <button class="btn btn-xs btn-ghost" @click="rejectDJ">{{ t('room.dj_reject') }}</button>
              </div>
            </div>
            <button
              v-if="!isDJ && session.dj_candidate !== currentPlayer.id"
              class="btn btn-accent btn-sm w-full"
              @click="proposeDJ(); showRolesModal = false"
            >
              {{ t('room.become_dj') }}
            </button>
            <p v-else-if="!isDJ && session.dj_candidate === currentPlayer.id" class="text-sm text-base-content/50 text-center">
              {{ t('room.dj_pending') }}
            </p>
          </div>
        </template>

        <div class="modal-action">
          <button class="btn btn-ghost btn-sm" @click="showRolesModal = false">{{ t('room.reset_cancel') }}</button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showRolesModal = false"></div>
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

          <div v-if="(isHost ? editedSettings.force_equity : sessionSettings.force_equity)" class="flex items-center justify-between gap-4">
            <span class="text-base-content/70">{{ t('admin.settings_equity_margin_label') }}</span>
            <div v-if="isHost" class="flex items-center gap-1">
              <input v-model.number="editedSettings.equity_margin" type="number" min="1" max="10" class="input input-xs w-16 text-right" />
              <span class="text-base-content/40 text-xs">{{ t('admin.settings_tracks') }}</span>
            </div>
            <span v-else class="font-mono font-bold">{{ sessionSettings.equity_margin }}</span>
          </div>

        </div>
        <p v-if="settingsError" class="text-error text-xs mt-2">{{ settingsError }}</p>
        <div class="modal-action">
          <button class="btn btn-ghost btn-sm" @click="showSettingsModal = false">{{ t('room.reset_cancel') }}</button>
          <button v-if="isHost" class="btn btn-primary btn-sm" :disabled="settingsSaving" @click="saveSettings">
            <span v-if="settingsSaving" class="loading loading-spinner loading-xs"></span>
            {{ t('room.settings_save') }}
          </button>
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
        <TrackSearch v-if="addMode === 'search'" :add-track="addTrackFromSearch" :remove-track="deleteTrack" :can-add-track="canAddTrack" />
        <template v-else-if="addMode === 'single'">
          <input v-model="newTrack.youtube_url" type="url" :placeholder="t('room.url_placeholder')" class="input input-bordered w-full" />
          <div class="flex flex-col gap-2">
            <div class="flex-1">
              <input v-model.number="newTrack.start_seconds" type="number" :placeholder="t('room.start_placeholder')" class="input input-bordered w-full" min="0" />
            </div>
            <div class="flex gap-2">
              <input v-model.number="newTrack.playback_duration" type="number" :placeholder="t('track.playback_duration_title')" class="input input-bordered flex-1" min="1" :title="t('track.playback_duration_title')" />
              <input v-model.number="newTrack.reveal_seconds" type="number" :placeholder="t('track.reveal_seconds_title')" class="input input-bordered flex-1" min="0" :title="t('track.reveal_seconds_title')" />
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

  <!-- Hidden QR share (opened from the menu drawer) -->
  <ShareQR ref="shareQr" :slug="session.slug" hide-trigger />

  <!-- Menu drawer (slides from the right) -->
  <Transition name="fade">
    <div v-if="showMenuDrawer" class="fixed inset-0 z-40 bg-black/40" @click="showMenuDrawer = false"></div>
  </Transition>
  <Transition name="drawer-slide">
    <aside v-if="showMenuDrawer" class="fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-base-100 shadow-xl flex flex-col">
      <div class="flex items-center justify-between px-4 py-3 border-b border-base-200">
        <span class="font-bold font-display">{{ t('room.menu') }}</span>
        <button class="btn btn-sm btn-ghost btn-circle" @click="showMenuDrawer = false">
          <span class="i-fa6-solid-xmark"></span>
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        <button class="btn btn-ghost justify-start gap-3" @click="showMenuDrawer = false; showRolesModal = true">
          <span class="text-base">👑</span>
          <span class="flex-1 text-left">{{ rolesTitle }}</span>
          <span v-if="hasPendingRoleRequest" class="h-2 w-2 rounded-full bg-error"></span>
        </button>
        <button class="btn btn-ghost justify-start gap-3" @click="showMenuDrawer = false; showParticipantsModal = true">
          <span class="i-fa-solid-users text-base text-base-content/60"></span>
          <span class="flex-1 text-left">{{ t('room.participants') }}</span>
          <span class="badge badge-sm">{{ onlinePlayers.length }}</span>
        </button>
        <button class="btn btn-ghost justify-start gap-3" @click="showMenuDrawer = false; shareQr?.open()">
          <span class="i-fa-solid-qrcode text-base text-base-content/60"></span>
          <span class="flex-1 text-left">{{ t('share.title') }}</span>
        </button>
        <button class="btn btn-ghost justify-start gap-3" @click="showMenuDrawer = false; openSettingsModal()">
          <span class="i-fa6-solid-gear text-base text-base-content/60"></span>
          <span class="flex-1 text-left">{{ t('room.settings') }}</span>
        </button>

        <template v-if="isHost">
          <div class="divider my-1"></div>
          <label class="btn btn-ghost justify-start gap-3 cursor-pointer">
            <span class="i-fa6-solid-people-group text-base" :class="isIrlMode ? 'text-accent' : 'text-base-content/60'"></span>
            <span class="flex-1 text-left">{{ t('room.irl_mode') }}</span>
            <input type="checkbox" class="toggle toggle-sm toggle-accent" :checked="isIrlMode" @change="toggleIrlMode" />
          </label>
          <button
            v-if="canReset"
            class="btn btn-ghost justify-start gap-3 text-warning"
            @click="showMenuDrawer = false; showResetModal = true"
          >
            <span class="i-fa6-solid-rotate-left text-base"></span>
            <span class="flex-1 text-left">{{ t('room.reset') }}</span>
          </button>
        </template>

        <button v-if="canClaim" class="btn btn-ghost justify-start gap-3 text-primary" @click="showMenuDrawer = false; claimSession()">
          <span class="i-fa-solid-link text-base"></span>
          <span class="flex-1 text-left">{{ t('room.claim_session') }}</span>
        </button>
      </nav>
    </aside>
  </Transition>

  <!-- Modale participants -->
  <div :class="['modal', showParticipantsModal ? 'modal-open' : '']">
    <div class="modal-box max-w-sm">
      <h3 class="font-bold text-lg mb-4">{{ t('room.participants') }}</h3>
      <ul class="space-y-1.5">
        <li
          v-for="p in lobbyPlayers"
          :key="p.id"
          class="flex items-center gap-2.5 rounded-lg bg-base-200 px-3 py-2"
          :class="!isOnline(p) ? 'opacity-40' : ''"
        >
          <img
            v-if="avatarUrl(p)"
            :src="avatarUrl(p)"
            :alt="p.name"
            class="w-8 h-8 shrink-0 rounded-full object-cover bg-base-300"
          />
          <span v-else class="w-8 h-8 shrink-0 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center">{{ initial(p.name) }}</span>
          <span class="flex-1 min-w-0 truncate font-medium text-sm">
            {{ p.name }}
            <span v-if="p.id === currentPlayer.id" class="text-xs text-base-content/40">({{ t('room.you') }})</span>
          </span>
          <span v-if="p.id === session.host" title="Host">👑</span>
          <span v-if="isIrlMode && p.id === session.dj_player" title="DJ">🎵</span>
          <span v-if="!isOnline(p)" class="w-2 h-2 rounded-full bg-base-content/20 shrink-0" :title="t('room.offline')"></span>
        </li>
      </ul>
      <div class="modal-action">
        <button class="btn btn-ghost btn-sm" @click="showParticipantsModal = false">{{ t('room.reset_cancel') }}</button>
      </div>
    </div>
    <div class="modal-backdrop" @click="showParticipantsModal = false"></div>
  </div>

  <!-- Snackbar (auto-dismiss 3s) -->
  <Transition name="toast-slide">
    <div v-if="toastMessage" class="toast toast-bottom toast-center z-50">
      <div class="alert alert-info shadow-lg">
        <span>{{ toastMessage }}</span>
      </div>
    </div>
  </Transition>
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
import TrackTimingBadges from '@game/components/TrackTimingBadges.vue'
import ShareQR from '@game/components/ShareQR.vue'
import GameOver from '@game/components/GameOver.vue'
import SolvedOverlay from '@game/components/SolvedOverlay.vue'
import { pb } from '@game/pb'
import { getVideoId, isOnline } from '@game/utils'
import useAuth from '@admin/composables/useAuth'
import config from '@config'

const { t } = useI36n()
const { isAuthenticated, user, refreshAuth } = useAuth()
if (isAuthenticated.value && !user.value?.id) refreshAuth()

const props = defineProps<{
  session: any
  currentPlayer: any
}>()


const { players, onlinePlayers } = usePlayers(props.session.id)
const manuallyDeletingIds = new Set<string>()

// Declarative seek toward the YoutubePlayer; bump the token to (re)trigger.
const seekRequest = ref<{ seconds: number; token: number } | null>(null)
let seekToken = 0
const requestSeek = (seconds: number) => { seekRequest.value = { seconds, token: ++seekToken } }
const { tracks, currentTrack, queuedTracks, addTrack, playTrack, finishTrack, voteToSkip, cancelSkipVote, deleteTrack } = useTracks(props.session.id)

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
    equity_margin: s.equity_margin ?? 1,
  }
})
const { activeBuzz, canBuzz, buzzBlockReason, rebuzzRemainingSeconds, remainingAttempts, buzz, solvedBuzz } = useBuzzes(
  computed(() => currentTrack.value?.id),
  props.currentPlayer.id,
  otherEligibleCount,
  sessionSettings,
)

// Playback duration timer
const pausedByDuration = ref(false)
let playbackDurationTimer: ReturnType<typeof setTimeout> | null = null

const clearPlaybackTimer = () => {
  if (playbackDurationTimer) { clearTimeout(playbackDurationTimer); playbackDurationTimer = null }
}

watch(() => currentTrack.value?.id, (newId, oldId) => {
  if (newId === oldId) return
  clearPlaybackTimer()
  pausedByDuration.value = false
  const track = currentTrack.value
  if (track?.playback_duration) {
    playbackDurationTimer = setTimeout(() => {
      pausedByDuration.value = true
    }, track.playback_duration * 1000)
  }
})

// UI state
const buzzing = ref(false)
const answer = ref('')
const addingTrack = ref(false)
const addMode = ref<'search' | 'single'>('search')
const newTrack = ref({ youtube_url: '', start_seconds: 0, playback_duration: 0, reveal_seconds: 0, title: '', artist: '' })
const fetchingMeta = ref(false)
const audioUnlocked = ref(false)
const animationState = ref<{ type?: 'solved' | 'skipped'; playerName: string; playerId?: string; title: string; artist: string } | null>(null)
const showResetModal = ref(false)
const showAddTrackModal = ref(false)
const showRolesModal = ref(false)
const showMenuDrawer = ref(false)
const showParticipantsModal = ref(false)
const shareQr = useTemplateRef<{ open: () => void }>('shareQr')

// Bottom snackbar shown to everyone, auto-dismissed after 3s.
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
const showToast = (message: string) => {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 3000)
}

// Notify everyone when the host changes.
watch(() => props.session.host, (newId, oldId) => {
  if (!oldId || !newId || newId === oldId) return
  const name = players.value.find(p => p.id === newId)?.name ?? ''
  showToast(t('room.host_changed', { name }))
})

// Notify everyone when the DJ changes (only relevant in IRL mode).
watch(() => props.session.dj_player, (newId, oldId) => {
  if (!newId || newId === oldId || !props.session.irl_mode) return
  const name = players.value.find(p => p.id === newId)?.name ?? ''
  showToast(t('room.dj_changed', { name }))
})
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
  clearPlaybackTimer()
  pausedByDuration.value = false
  const revealSecs = track?.reveal_seconds
  if (revealSecs) {
    requestSeek(revealSecs)
  }
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

// Host can pause/resume playback while a track is actually playing (not mid-buzz).
const isPaused = computed(() => !!props.session.paused)
const canTogglePause = computed(() => currentTrack.value?.status === 'playing' && !activeBuzz.value)
const togglePause = () => {
  if (!isHost.value || !canTogglePause.value) return
  pb.collection('sessions').update(props.session.id, { paused: !isPaused.value })
}
// Reset is allowed except mid-action (a track actively playing and not paused).
const canReset = computed(() => currentTrack.value?.status !== 'playing' || isPaused.value)
// A fresh track must never start paused — clear the flag when the track changes.
watch(() => currentTrack.value?.id, (id, prev) => {
  if (id && id !== prev && isHost.value && isPaused.value) {
    pb.collection('sessions').update(props.session.id, { paused: false })
  }
})

// Host election is handled server-side (pb/pb_hooks/host_election.pb.js):
// when the current host goes offline, a heartbeat from any remaining player
// triggers reassignment to the earliest-created online player.

const canClaim = computed(() => isHost.value && isAuthenticated.value && user.value?.id && !props.session.owner)

// The original session creator (authenticated owner) can reclaim host instantly.
const isOwner = computed(() => isAuthenticated.value && !!user.value?.id && props.session.owner === user.value.id)
const hostCandidate = computed(() => players.value.find((p: any) => p.id === props.session.host_candidate))

const claimSession = () =>
  pb.collection('sessions').update(props.session.id, { owner: user.value.id })
const isIrlMode = computed(() => !!props.session.irl_mode)
const isDJ = computed(() => props.session.dj_player === props.currentPlayer.id)
const djPlayer = computed(() => players.value.find((p: any) => p.id === props.session.dj_player))
const djCandidate = computed(() => players.value.find((p: any) => p.id === props.session.dj_candidate))
const nonHostPlayers = computed(() => onlinePlayers.value.filter(p => p.id !== props.session.host))
const rolesTitle = computed(() => isIrlMode.value ? t('room.roles_title') : t('room.roles_title_host_only'))
// A pending role request the host should address — drives the red dot on the topbar.
const hasPendingRoleRequest = computed(() =>
  (isHost.value && !!hostCandidate.value) || (isIrlMode.value && isDJ.value && !!djCandidate.value),
)
// Lobby roster shown to everyone, host first.
const lobbyPlayers = computed(() =>
  [...players.value].sort((a, b) => {
    if (a.id === props.session.host) return -1
    if (b.id === props.session.host) return 1
    return 0
  }),
)
const initial = (name: string) => (name?.trim()?.charAt(0) ?? '?').toUpperCase()
// Avatars are denormalized onto the player record server-side
// (pb/pb_hooks/player_avatar.pb.js), so guests can see them too.
const avatarUrl = (p: any) =>
  p.avatar && p.auth_user
    ? `${config.apiBaseUrl}/api/files/_pb_users_auth_/${p.auth_user}/${p.avatar}`
    : ''
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
const skipVoterNames = computed(() =>
  skipVoteArray.value
    .filter(id => id !== trackValidatorId.value)
    .map(id => getPlayerName(id))
)
const isTrackSolvedAndPlaying = computed(() =>
  (!!currentTrack.value?.solved_by || !!currentTrack.value?.skip_revealed) && currentTrack.value?.status === 'playing'
)
// Whether the solved/revealed track is waiting on players (vote or host button)
// to advance. A buzz-solved track in !continue mode auto-advances instead, so it
// is excluded.
const awaitingAdvance = computed(() =>
  isTrackSolvedAndPlaying.value &&
  (sessionSettings.value.continue_after_success || !!currentTrack.value?.skip_revealed)
)

watch(isTrackSolvedAndPlaying, (solved) => {
  if (!solved) return
  clearPlaybackTimer()
  pausedByDuration.value = false
  if (!currentTrack.value?.solved_by && currentTrack.value?.reveal_seconds) {
    requestSeek(currentTrack.value.reveal_seconds)
  }
})

const canAddTrack = computed(() => {
  if (!sessionSettings.value.force_equity) return true
  const myCount = queuedTracks.value.filter(t => t.added_by === props.currentPlayer.id).length
  const others = onlinePlayers.value.filter(p => p.id !== props.currentPlayer.id)
  if (others.length === 0) return true
  const minOthers = Math.min(...others.map(p =>
    queuedTracks.value.filter(t => t.added_by === p.id).length
  ))
  return myCount < minOthers + sessionSettings.value.equity_margin
})

const canDeleteTrack = computed(() => {
  if (!sessionSettings.value.force_equity) return true
  const myCount = queuedTracks.value.filter(t => t.added_by === props.currentPlayer.id).length
  const others = onlinePlayers.value.filter(p => p.id !== props.currentPlayer.id)
  if (others.length === 0) return true
  const minOthers = Math.min(...others.map(p =>
    queuedTracks.value.filter(t => t.added_by === p.id).length
  ))
  return myCount >= minOthers
})

watch(buzzBlockReason, (reason) => {
  if (reason === 'max_attempts' && currentTrack.value && !hasVotedToSkip.value && !isTrackSolvedAndPlaying.value) {
    voteToSkip(currentTrack.value.id, props.currentPlayer.id)
  }
})

// Single owner of "move past the current track". Host-only (the host is
// server-elected and unique) + an in-flight lock + an idempotency guard, so
// overlapping triggers (correct answer, skip vote, host button) on the same or
// different clients can't double-advance or skip a track.
let advancing = false
// A track whose owner has left the game shouldn't auto-play and get silently
// (half-)attributed to the host. Instead the game pauses (no track playing) and
// the host decides what to do with it.
const orphanDecisionTrack = ref<any | null>(null)
const isOrphanTrack = (track: any) => {
  if (!track?.added_by) return false
  const owner = players.value.find(p => p.id === track.added_by)
  return !owner || !isOnline(owner)
}
const startTrack = async (track: any) => {
  if (!track) return
  if (isHost.value && isOrphanTrack(track)) {
    orphanDecisionTrack.value = track
    return
  }
  await playTrack(track.id)
}
// If the absent owner reconnects while the host is still deciding, just play it.
watch(onlinePlayers, () => {
  const track = orphanDecisionTrack.value
  if (track && isHost.value && !isOrphanTrack(track)) {
    orphanDecisionTrack.value = null
    playTrack(track.id)
  }
})

const advanceFrom = async (trackId: string) => {
  if (advancing || !isHost.value) return
  // Only the live playing track can be advanced; if it already changed, another
  // trigger already moved on.
  if (currentTrack.value?.id !== trackId || currentTrack.value.status !== 'playing') return
  advancing = true
  try {
    const next = queuedTracks.value[0]
    await finishTrack(trackId)
    if (next) { await startTrack(next) }
  } finally {
    advancing = false
  }
}

// !continue_after_success: once a track is solved, the host advances after the
// reveal animation has played.
watch(() => currentTrack.value?.solved_by, (solvedBy, prev) => {
  if (!solvedBy || solvedBy === prev) return
  if (sessionSettings.value.continue_after_success || !isHost.value) return
  const trackId = currentTrack.value!.id
  setTimeout(() => { advanceFrom(trackId) }, 3000)
})

watch(skipVoteArray, async (votes) => {
  if (!currentTrack.value) return
  if (animationState.value?.type === 'skipped') return
  if (onlinePlayers.value.length > 1 && votes.length >= skipVotesNeeded.value) {
    const trackId = currentTrack.value.id
    // Track already solved/revealed: advance silently (no "skipped" animation)
    if (isTrackSolvedAndPlaying.value) {
      await advanceFrom(trackId)
      return
    }
    animationState.value = {
      type: 'skipped',
      playerName: '',
      title: currentTrack.value.expand?.video?.title ?? '',
      artist: currentTrack.value.expand?.video?.artist ?? '',
    }
    const hasReveal = !!currentTrack.value.reveal_seconds && !currentTrack.value.solved_by
    setTimeout(async () => {
      animationState.value = null
      if (!isHost.value) return
      if (hasReveal) {
        await pb.collection('tracks').update(trackId, { skip_revealed: true, skip_votes: [] })
      } else {
        await advanceFrom(trackId)
      }
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

// Resolutions for the orphan-track-about-to-play decision; each resumes playback.
const pushOrphanBack = async (places: number) => {
  const track = orphanDecisionTrack.value
  if (!track) return
  const queued = [...queuedTracks.value]
  const idx = queued.findIndex(t => t.id === track.id)
  if (idx !== -1) {
    const target = Math.min(idx + places, queued.length - 1)
    queued.splice(idx, 1)
    queued.splice(target, 0, track)
    const orders = queuedTracks.value.map(t => t.order).sort((a, b) => a - b)
    await batchUpdateOrders(queued.map((t, i) => ({ id: t.id, order: orders[i] })))
  }
  orphanDecisionTrack.value = null
  await startTrack(queued[0])
}
const deleteOrphanTrack = async () => {
  const track = orphanDecisionTrack.value
  orphanDecisionTrack.value = null
  if (!track) return
  const remaining = queuedTracks.value.filter(t => t.id !== track.id)
  await deleteTrack(track.id)
  await startTrack(remaining[0])
}
const claimOrphanTrack = async () => {
  const track = orphanDecisionTrack.value
  orphanDecisionTrack.value = null
  if (!track) return
  await pb.collection('tracks').update(track.id, { added_by: props.currentPlayer.id })
  await playTrack(track.id)
}

const playerRatio = (player: any) => {
  const guessable = doneTracks.value.filter(t => t.added_by !== player.id).length
  const guessed = doneTracks.value.filter(t => t.solved_by === player.id).length
  return { guessed, guessable, ratio: guessable > 0 ? guessed / guessable : 0 }
}

const hostPlayer = computed(() => players.value.find(p => p.id === props.session.host) ?? null)

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

const batchUpdateOrders = async (updates: { id: string; order: number }[]) => {
  for (let i = 0; i < updates.length; i += 45) {
    const batch = pb.createBatch()
    updates.slice(i, i + 45).forEach(({ id, order }) =>
      batch.collection('tracks').update(id, { order })
    )
    await batch.send()
  }
}

const shuffleMyTracks = async () => {
  const my = myQueuedTracks.value
  if (my.length < 2) return
  const orders = my.map(t => t.order)
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orders[i], orders[j]] = [orders[j], orders[i]]
  }
  await batchUpdateOrders(my.map((track, i) => ({ id: track.id, order: orders[i] })))
}

const shuffleAllTracks = async () => {
  const queued = queuedTracks.value
  if (queued.length < 2) return

  const byPlayer = new Map<string, any[]>()
  for (const track of queued) {
    if (!byPlayer.has(track.added_by)) byPlayer.set(track.added_by, [])
    byPlayer.get(track.added_by)!.push(track)
  }

  for (const playerTracks of byPlayer.values()) {
    for (let i = playerTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[playerTracks[i], playerTracks[j]] = [playerTracks[j], playerTracks[i]]
    }
  }

  // Fractional position (i + rand) / count → homogeneous interleaving across players
  const withPos: { track: any; pos: number }[] = []
  for (const playerTracks of byPlayer.values()) {
    playerTracks.forEach((track, i) => {
      withPos.push({ track, pos: (i + Math.random()) / playerTracks.length })
    })
  }
  withPos.sort((a, b) => a.pos - b.pos)

  const orders = queued.map(t => t.order).sort((a, b) => a - b)
  await batchUpdateOrders(withPos.map(({ track }, i) => ({ id: track.id, order: orders[i] })))
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
  if (hasVotedToSkip.value) {
    await cancelSkipVote(currentTrack.value.id, props.currentPlayer.id)
  }
  await buzz(props.currentPlayer.id, answer.value.trim())
  buzzing.value = false
  answer.value = ''
}

const validateBuzz = async () => {
  if (!activeBuzz.value || !currentTrack.value) return
  const trackId = currentTrack.value.id
  const buzzId = activeBuzz.value.id
  const buzzPlayerId = activeBuzz.value.player

  // Resume is driven reactively by the paused prop once the buzz clears.
  clearPlaybackTimer()
  pausedByDuration.value = false

  // Idempotent: only mark the buzz correct and tag the solver. Score is derived
  // from solved_by; track advancement is owned by the host (advanceFrom).
  await Promise.all([
    pb.collection('buzzes').update(buzzId, { status: 'correct' }),
    pb.collection('tracks').update(trackId, { solved_by: buzzPlayerId, skip_votes: [] }),
  ])
}

const markReady = (value: boolean) => pb.collection('players').update(props.currentPlayer.id, { ready: value })

const launchSession = async () => {
  if (!canLaunch.value) return
  await pb.collection('sessions').update(props.session.id, { status: 'playing' })
  await startTrack(queuedTracks.value[0])
}

const invalidateBuzz = async () => {
  if (!activeBuzz.value) return
  await pb.collection('buzzes').update(activeBuzz.value.id, { status: 'wrong' })
}

const stopCurrentTrack = async () => {
  if (!currentTrack.value) return
  await advanceFrom(currentTrack.value.id)
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
  const update: Record<string, unknown> = { irl_mode: enabling, dj_candidate: null }
  if (enabling) {
    // Restore the DJ assigned earlier if they're still around, otherwise fall
    // back to the host. Disabling keeps dj_player untouched so it can be
    // restored on re-enable.
    const existingDj = props.session.dj_player
    const stillPresent = existingDj && players.value.some(p => p.id === existingDj)
    update.dj_player = stillPresent ? existingDj : props.session.host
  }
  await pb.collection('sessions').update(props.session.id, update)
}
const proposeDJ = () =>
  pb.collection('sessions').update(props.session.id, { dj_candidate: props.currentPlayer.id })
const approveDJ = () =>
  pb.collection('sessions').update(props.session.id, { dj_player: props.session.dj_candidate, dj_candidate: null })
const rejectDJ = () =>
  pb.collection('sessions').update(props.session.id, { dj_candidate: null })

// Host transfer. The owner takes host immediately; anyone else asks the
// current host to hand it over.
const proposeHost = () => {
  if (isOwner.value) {
    return pb.collection('sessions').update(props.session.id, { host: props.currentPlayer.id, host_candidate: null })
  }
  return pb.collection('sessions').update(props.session.id, { host_candidate: props.currentPlayer.id })
}
const approveHost = () =>
  pb.collection('sessions').update(props.session.id, { host: props.session.host_candidate, host_candidate: null })
const rejectHost = () =>
  pb.collection('sessions').update(props.session.id, { host_candidate: null })

const resetSession = async () => {
  resetting.value = true
  if (duplicateCheckTimeout) { clearTimeout(duplicateCheckTimeout); duplicateCheckTimeout = null }
  acknowledgedDuplicateIds.clear()
  try {
    const allBuzzes = await pb.collection('buzzes').getFullList({
      filter: pb.filter('track.session = {:session}', { session: props.session.id }),
      requestKey: null,
    })
    const allOps: Array<(b: ReturnType<typeof pb.createBatch>) => void> = [
      ...allBuzzes.map(buzz => (b: ReturnType<typeof pb.createBatch>) => b.collection('buzzes').delete(buzz.id)),
      // Scores are derived from tracks.solved_by, reset below — no player write needed.
      ...tracks.value.map(t => (b: ReturnType<typeof pb.createBatch>) => b.collection('tracks').update(t.id, { status: 'queued', solved_by: null, skip_votes: [], is_duplicate: false, skip_revealed: false })),
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
const settingsSaving = ref(false)
const settingsError = ref('')
const editedSettings = ref({ ...sessionSettings.value })

const openSettingsModal = () => {
  editedSettings.value = { ...sessionSettings.value }
  settingsError.value = ''
  showSettingsModal.value = true
}

const saveSettings = async () => {
  settingsSaving.value = true
  settingsError.value = ''
  try {
    await pb.collection('sessions').update(props.session.id, { settings: { ...editedSettings.value } })
    showSettingsModal.value = false
  } catch (e: any) {
    settingsError.value = e.message ?? 'Error saving settings'
  } finally {
    settingsSaving.value = false
  }
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
      playback_duration: newTrack.value.playback_duration || undefined,
      reveal_seconds: newTrack.value.reveal_seconds || undefined,
      title: newTrack.value.title.trim() || undefined,
      artist: newTrack.value.artist.trim() || undefined,
      added_by: props.currentPlayer.id,
    })
    newTrack.value = { youtube_url: '', start_seconds: 0, playback_duration: 0, reveal_seconds: 0, title: '', artist: '' }
    showAddTrackModal.value = false
  } finally {
    addingTrack.value = false
  }
}

const addTrackFromSearch = (data: { video_id: string; title?: string; artist?: string; duration?: number; start_seconds?: number; playback_duration?: number; reveal_seconds?: number }) => {
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
  clearPlaybackTimer()
})
</script>

<style scoped>
/* daisyUI .toast only positions; the slide-in is ours. */
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.toast-slide-enter-from,
.toast-slide-leave-to {
  transform: translateY(120%);
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.25s ease;
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
