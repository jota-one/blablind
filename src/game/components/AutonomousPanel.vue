<template>
  <div class="w-full space-y-3">

    <!-- GUESSING: buzz + (remote) inline answer + buzz order -->
    <template v-if="phase === 'guessing'">
      <template v-if="!myBuzz">
        <button
          v-if="canBuzz"
          class="btn btn-error w-full h-20 text-2xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
          data-testid="buzz-button"
          @click="emit('buzz')"
        >
          <span class="i-fa-solid-bell text-3xl"></span>
          {{ t('room.buzz_button') }}
        </button>
      </template>
      <template v-else>
        <div v-if="isIrlMode" class="alert alert-info">
          <span class="i-fa-solid-bell text-xl"></span>
          <div>
            <p class="font-bold">{{ t('room.auto_buzzed', { n: myBuzzRank }) }}</p>
            <p class="text-sm opacity-70">{{ t('room.auto_buzzed_irl_hint') }}</p>
          </div>
        </div>
        <div v-else class="card bg-base-200 p-4 space-y-2">
          <p class="font-bold text-sm flex items-center gap-2">
            <span class="i-fa-solid-bell text-warning"></span>
            {{ t('room.auto_buzzed', { n: myBuzzRank }) }}
          </p>
          <div class="flex gap-2">
            <input
              :value="answerDraft"
              v-focus
              data-testid="auto-answer"
              type="text"
              :placeholder="t('room.auto_answer_placeholder')"
              class="input input-bordered flex-1"
              @input="emit('update:answerDraft', ($event.target as HTMLInputElement).value)"
              @keyup.enter="emit('save-answer')"
              @blur="emit('save-answer')"
            />
            <button class="btn btn-primary" data-testid="auto-answer-save" @click="emit('save-answer')">
              <span class="i-fa-solid-paper-plane"></span>
            </button>
          </div>
          <p v-if="myBuzz.answer" class="text-xs text-success">
            {{ t('room.auto_answer_saved', { answer: myBuzz.answer }) }}
          </p>
          <p v-else class="text-xs text-base-content/50">{{ t('room.auto_answer_hint') }}</p>
        </div>
      </template>

      <!-- Buzz order chips (names only — answers stay hidden until the reveal) -->
      <div v-if="orderedCandidates.length > 0" class="flex flex-wrap items-center gap-1.5">
        <span class="text-xs text-base-content/50">{{ t('room.auto_buzz_order') }}</span>
        <span
          v-for="(candidate, i) in orderedCandidates"
          :key="candidate.id"
          class="badge badge-sm"
          :class="candidate.player === currentPlayerId ? 'badge-primary' : 'badge-ghost'"
        >
          {{ i + 1 }}. {{ getPlayerName(candidate.player) }}
        </span>
      </div>
    </template>

    <!-- ANSWERING (IRL): ordered verbal answers + shared reveal button -->
    <template v-else-if="phase === 'answering'">
      <div class="card bg-base-200 p-4 space-y-3">
        <p class="font-bold flex items-center gap-2">
          <span class="i-fa-solid-microphone text-warning"></span>
          {{ t('room.auto_answering_title') }}
        </p>
        <template v-if="orderedCandidates.length > 0">
          <p class="text-sm text-base-content/60">{{ t('room.auto_answering_hint') }}</p>
          <ol class="space-y-1">
            <li
              v-for="(candidate, i) in orderedCandidates"
              :key="candidate.id"
              class="flex items-center gap-2 rounded-lg bg-base-100 px-3 py-2 text-sm"
            >
              <span class="w-6 h-6 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{{ i + 1 }}</span>
              <span class="font-medium">
                {{ getPlayerName(candidate.player) }}
                <span v-if="candidate.player === currentPlayerId" class="text-xs text-base-content/40">({{ t('room.you') }})</span>
              </span>
            </li>
          </ol>
        </template>
        <button class="btn btn-primary w-full" data-testid="auto-reveal" @click="emit('reveal')">
          <span class="i-fa-solid-eye"></span>
          {{ t('room.auto_reveal_button') }}
        </button>
      </div>
    </template>

    <!-- VOTING: revealed answer + candidate card + peer votes -->
    <template v-else-if="phase === 'voting'">
      <div class="card bg-base-200 p-4 space-y-3">
        <div class="text-center">
          <p class="text-xs uppercase tracking-wide font-semibold text-base-content/40">{{ t('room.auto_voting_answer_label') }}</p>
          <p class="font-bold font-display text-lg">{{ track?.expand?.video?.title || t('room.no_title') }}</p>
          <p v-if="track?.expand?.video?.artist" class="text-sm text-base-content/60">{{ track.expand.video.artist }}</p>
        </div>

        <template v-if="currentCandidate">
          <div class="divider my-0"></div>
          <p class="font-bold text-sm text-center">
            {{ t('room.auto_voting_candidate', { player: getPlayerName(currentCandidate.player), i: candidateIndex, total: orderedCandidates.length }) }}
          </p>
          <p v-if="!isIrlMode" class="text-lg text-center">
            <span class="font-mono bg-base-300 px-3 py-1 rounded">
              {{ currentCandidate.answer || t('room.auto_voting_no_answer') }}
            </span>
          </p>

          <div v-if="iAmCandidate" class="alert alert-info py-2">
            <span class="i-fa-solid-hourglass-half"></span>
            <span class="text-sm">{{ t('room.auto_voting_you_candidate') }}</span>
          </div>
          <div v-else-if="canVote" class="flex gap-2">
            <button class="btn btn-success flex-1" data-testid="auto-vote-yes" @click="emit('vote', true)">
              <span class="i-fa-solid-check"></span>
              {{ t('room.auto_vote_yes') }}
            </button>
            <button class="btn btn-error flex-1" data-testid="auto-vote-no" @click="emit('vote', false)">
              <span class="i-fa-solid-times"></span>
              {{ t('room.auto_vote_no') }}
            </button>
          </div>
          <p v-else class="text-sm text-center text-base-content/50">{{ t('room.auto_voted') }}</p>

          <p class="text-xs text-base-content/40 text-center tabular-nums">
            {{ t('room.auto_vote_tally', { yes: yesCount, no: noCount, needed: yesNeeded }) }}
          </p>
        </template>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI36n } from '@jota-one/i36n'

type Props = {
  phase: 'guessing' | 'answering' | 'voting' | null
  isIrlMode: boolean
  currentPlayerId: string
  track: any
  canBuzz: boolean
  myBuzz: any
  orderedCandidates: any[]
  currentCandidate: any
  candidateIndex: number
  canVote: boolean
  iAmCandidate: boolean
  yesCount: number
  noCount: number
  yesNeeded: number
  answerDraft: string
  getPlayerName: (playerId: string) => string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  buzz: []
  'save-answer': []
  reveal: []
  vote: [value: boolean]
  'update:answerDraft': [value: string]
}>()

const { t } = useI36n()

const myBuzzRank = computed(() =>
  props.myBuzz ? props.orderedCandidates.findIndex(b => b.id === props.myBuzz.id) + 1 : 0,
)

// Same custom directive as Room.vue's buzz answer input
const vFocus = { mounted: (el: HTMLElement) => el.focus() }
</script>
