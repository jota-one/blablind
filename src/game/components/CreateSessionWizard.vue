<template>
  <dialog ref="dialogRef" class="modal">
    <div class="modal-box max-w-sm w-full">
      <!-- Close button -->
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
      </form>

      <!-- Progress dots -->
      <div class="flex justify-center gap-2 mb-8">
        <div
          v-for="(_, i) in steps"
          :key="i"
          :class="[
            'h-1.5 rounded-full transition-all duration-300',
            i === currentStepIndex ? 'w-6 bg-primary' : i < currentStepIndex ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-base-300',
          ]"
        ></div>
      </div>

      <!-- Step content -->
      <Transition :name="transitionName" mode="out-in">
        <div :key="currentStep.key" class="flex flex-col items-center text-center min-h-72">
          <span :class="[currentStep.icon, 'text-6xl text-primary mb-5 block']"></span>
          <h3 class="text-xl font-bold mb-2">{{ currentStep.label }}</h3>
          <p v-if="currentStep.hint" class="text-base-content/60 text-sm mb-6 max-w-xs">{{ currentStep.hint }}</p>

          <!-- Text input (name) -->
          <input
            v-if="currentStep.inputType === 'text'"
            ref="nameInputRef"
            v-model="form.name"
            type="text"
            :placeholder="t('wizard.step_name_placeholder')"
            class="input input-bordered w-full text-center text-lg mt-2"
            @keydown.enter="handleNext"
          />

          <!-- Number input -->
          <div v-else-if="currentStep.inputType === 'number'" class="flex items-center justify-center gap-3 mt-2">
            <input
              v-model.number="(form as any)[currentStep.key]"
              type="number"
              :min="currentStep.min"
              class="input input-bordered w-28 text-center text-2xl font-bold"
            />
            <span class="text-base-content/60">{{ currentStep.unit }}</span>
          </div>

          <!-- Toggle -->
          <div v-else-if="currentStep.inputType === 'toggle'" class="flex flex-col items-center gap-3 mt-2">
            <input
              v-model="(form as any)[currentStep.key]"
              type="checkbox"
              class="toggle toggle-primary toggle-lg"
            />
            <span class="text-sm text-base-content/60">
              {{ (form as any)[currentStep.key] ? t('client.settings_yes') : t('client.settings_no') }}
            </span>
          </div>

          <!-- Radio -->
          <div v-else-if="currentStep.inputType === 'radio'" class="flex flex-col gap-2 w-full text-left mt-2">
            <label
              v-for="opt in currentStep.options"
              :key="opt.value"
              class="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-base-200"
            >
              <input v-model="(form as any)[currentStep.key]" type="radio" :value="opt.value" class="radio radio-primary" />
              <span class="flex-1">
                {{ opt.label }}
                <span v-if="opt.hint" class="block text-xs text-base-content/50">{{ opt.hint }}</span>
              </span>
            </label>
          </div>

          <!-- Playlist picker -->
          <div v-else-if="currentStep.inputType === 'playlist'" class="w-full text-left mt-2">
            <div v-if="loadingPlaylists" class="flex justify-center py-4">
              <span class="loading loading-spinner loading-sm"></span>
            </div>
            <ul v-else-if="playlists.length > 0" class="space-y-2 max-h-56 overflow-y-auto">
              <li v-for="playlist in playlists" :key="playlist.id">
                <label
                  class="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-base-200"
                  :class="{ 'opacity-50 cursor-not-allowed': trackCount(playlist) === 0 }"
                >
                  <input
                    v-model="form.playlistId"
                    type="radio"
                    :value="playlist.id"
                    :disabled="trackCount(playlist) === 0"
                    class="radio radio-primary radio-sm"
                  />
                  <span class="flex-1 min-w-0">
                    <span class="block text-sm font-medium truncate">{{ playlist.name }}</span>
                    <span class="block text-xs text-base-content/50 truncate">
                      {{ t('playlists.track_count', { count: trackCount(playlist) }) }}
                      <template v-if="playlistTags(playlist).length"> · {{ playlistTags(playlist).join(', ') }}</template>
                    </span>
                  </span>
                </label>
              </li>
            </ul>
            <p v-else class="text-sm text-base-content/50 text-center py-4">
              {{ t('wizard.playlist_empty') }}
              <a v-if="isAuthenticated" href="/profile/playlists" class="link link-primary block mt-1">
                {{ t('wizard.playlist_create_link') }}
              </a>
            </p>
          </div>
        </div>
      </Transition>

      <!-- Error -->
      <div v-if="error" class="alert alert-error mt-4 py-2 text-sm">{{ error }}</div>

      <!-- Navigation -->
      <div class="flex justify-between items-center mt-8">
        <button
          class="btn btn-ghost btn-sm"
          :class="{ invisible: currentStepIndex === 0 }"
          @click="handlePrev"
        >
          ← {{ t('wizard.prev') }}
        </button>
        <span class="text-xs text-base-content/40">{{ currentStepIndex + 1 }} / {{ steps.length }}</span>
        <button class="btn btn-primary btn-sm" :disabled="!canProceed || creating" @click="handleNext">
          <span v-if="creating" class="loading loading-spinner loading-xs"></span>
          {{ isLastStep ? t('wizard.create') : t('wizard.next') }}
          <span v-if="!isLastStep" class="ml-1">→</span>
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import { pb } from '@game/pb'
import { generateSlug } from '@game/utils'
import useAuth from '@admin/composables/useAuth'
import useSettings from '@admin/composables/useSettings'

const { t } = useI36n()
const { user, isAuthenticated, refreshAuth } = useAuth()
const { settings: appSettings, loadSettings } = useSettings()

const dialogRef = useTemplateRef<HTMLDialogElement>('dialogRef')
const nameInputRef = useTemplateRef<HTMLInputElement>('nameInputRef')

const currentStepIndex = ref(0)
const direction = ref<'forward' | 'backward'>('forward')
const creating = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  mode: 'classic' as 'classic' | 'autonomous',
  playlistId: null as string | null,
  max_buzz_attempts: 5,
  rebuzz_delay: 5,
  auto_reject_delay: 8,
  continue_after_success: true,
  stop_method: 'vote_unanimous' as 'vote_unanimous' | 'host_choice',
  force_equity: false,
  equity_margin: 1,
})

type WizardStep = {
  key: string
  icon: string
  label: string
  hint: string
  inputType: 'text' | 'number' | 'toggle' | 'radio' | 'playlist'
  unit?: string
  min?: number
  options?: { value: string; label: string; hint?: string }[]
}

const steps = computed<WizardStep[]>(() => [
  {
    key: 'mode',
    icon: 'i-fa6-solid-gamepad',
    label: t('wizard.step_mode'),
    hint: t('wizard.step_mode_hint'),
    inputType: 'radio',
    options: [
      { value: 'classic', label: t('wizard.mode_classic'), hint: t('wizard.mode_classic_hint') },
      { value: 'autonomous', label: t('wizard.mode_autonomous'), hint: t('wizard.mode_autonomous_hint') },
    ],
  },
  ...(form.mode === 'autonomous'
    ? [
        {
          key: 'playlist',
          icon: 'i-fa-solid-list-ol',
          label: t('wizard.step_playlist'),
          hint: t('wizard.step_playlist_hint'),
          inputType: 'playlist' as const,
        },
      ]
    : []),
  {
    key: 'name',
    icon: 'i-fa-solid-headphones',
    label: t('wizard.step_name'),
    hint: t('wizard.step_name_hint'),
    inputType: 'text',
  },
  ...(form.mode === 'autonomous' ? [] : classicSettingsSteps()),
])

const classicSettingsSteps = (): WizardStep[] => [
  {
    key: 'max_buzz_attempts',
    icon: 'i-fa-solid-bullseye',
    label: t('admin.settings_max_buzz_attempts_label'),
    hint: t('admin.settings_max_buzz_attempts_hint'),
    inputType: 'number',
    unit: t('admin.settings_attempts'),
    min: 1,
  },
  {
    key: 'rebuzz_delay',
    icon: 'i-fa6-solid-clock-rotate-left',
    label: t('admin.settings_rebuzz_delay_label'),
    hint: t('admin.settings_rebuzz_delay_hint'),
    inputType: 'number',
    unit: t('admin.settings_seconds'),
    min: 0,
  },
  {
    key: 'auto_reject_delay',
    icon: 'i-fa-solid-stopwatch',
    label: t('admin.settings_auto_reject_delay_label'),
    hint: t('admin.settings_auto_reject_delay_hint'),
    inputType: 'number',
    unit: t('admin.settings_seconds'),
    min: 0,
  },
  {
    key: 'continue_after_success',
    icon: 'i-fa-solid-play',
    label: t('admin.settings_continue_after_success_label'),
    hint: t('admin.settings_continue_after_success_hint'),
    inputType: 'toggle',
  },
  ...(form.continue_after_success
    ? [
        {
          key: 'stop_method',
          icon: 'i-fa6-solid-hand',
          label: t('admin.settings_stop_method_label'),
          hint: '',
          inputType: 'radio' as const,
          options: [
            { value: 'vote_unanimous', label: t('admin.settings_stop_method_vote') },
            { value: 'host_choice', label: t('admin.settings_stop_method_host') },
          ],
        },
      ]
    : []),
  {
    key: 'force_equity',
    icon: 'i-fa6-solid-scale-balanced',
    label: t('admin.settings_force_equity_label'),
    hint: t('admin.settings_force_equity_hint'),
    inputType: 'toggle',
  },
  ...(form.force_equity
    ? [
        {
          key: 'equity_margin',
          icon: 'i-fa6-solid-scale-balanced',
          label: t('admin.settings_equity_margin_label'),
          hint: t('admin.settings_equity_margin_hint'),
          inputType: 'number' as const,
          unit: t('admin.settings_tracks'),
          min: 1,
        },
      ]
    : []),
]

// Playlists for the autonomous-mode picker (rules already scope to public + own)
const playlists = ref<any[]>([])
const loadingPlaylists = ref(false)
const playlistsLoaded = ref(false)

const trackCount = (playlist: any) => playlist.expand?.playlist_tracks_via_playlist?.length ?? 0
const playlistTags = (playlist: any) => (Array.isArray(playlist.tags) ? playlist.tags : [])

const loadPlaylists = async () => {
  if (playlistsLoaded.value) { return }
  loadingPlaylists.value = true
  try {
    const items = await pb.collection('playlists').getFullList({
      expand: 'playlist_tracks_via_playlist',
      sort: '-updated',
      requestKey: null,
    })
    // Own playlists first
    const mine = items.filter(p => p.owner === user.value?.id)
    const others = items.filter(p => p.owner !== user.value?.id)
    playlists.value = [...mine, ...others]
    playlistsLoaded.value = true
  } finally {
    loadingPlaylists.value = false
  }
}

const currentStep = computed(() => steps.value[currentStepIndex.value])
const isLastStep = computed(() => currentStepIndex.value === steps.value.length - 1)
const transitionName = computed(() => `slide-${direction.value}`)

const canProceed = computed(() => {
  if (currentStep.value?.key === 'name') { return form.name.trim().length > 0 }
  if (currentStep.value?.key === 'playlist') {
    const selected = playlists.value.find(p => p.id === form.playlistId)
    return !!selected && trackCount(selected) > 0
  }
  return true
})

const handleNext = async () => {
  if (!canProceed.value) { return }
  if (isLastStep.value) {
    await createSession()
  } else {
    direction.value = 'forward'
    currentStepIndex.value++
    if (currentStep.value?.key === 'name') {
      await nextTick()
      nameInputRef.value?.focus()
    }
    if (currentStep.value?.key === 'playlist') {
      loadPlaylists()
    }
  }
}

const handlePrev = () => {
  if (currentStepIndex.value === 0) { return }
  direction.value = 'backward'
  currentStepIndex.value--
}

const createSession = async () => {
  creating.value = true
  error.value = ''
  try {
    const slug = generateSlug()
    if (form.mode === 'autonomous') {
      const session = await pb.collection('sessions').create({
        name: form.name.trim(),
        slug,
        status: 'waiting',
        irl_mode: true,
        mode: 'autonomous',
        playlist: form.playlistId,
        settings: {
          default_playback_duration: 30,
        },
        ...(user.value?.id ? { owner: user.value.id } : {}),
      })
      // Snapshot copy: later edits to the playlist must not affect this game
      const playlistTracks = await pb.collection('playlist_tracks').getFullList({
        filter: pb.filter('playlist = {:playlist}', { playlist: form.playlistId }),
        sort: 'order,created',
        requestKey: null,
      })
      for (let i = 0; i < playlistTracks.length; i += 45) {
        const batch = pb.createBatch()
        playlistTracks.slice(i, i + 45).forEach((pt, j) =>
          batch.collection('tracks').create({
            session: session.id,
            video: pt.video,
            start_seconds: pt.start_seconds ?? 0,
            playback_duration: pt.playback_duration || null,
            reveal_seconds: pt.reveal_seconds || null,
            status: 'queued',
            order: i + j + 1,
          })
        )
        await batch.send()
      }
    } else {
      await pb.collection('sessions').create({
        name: form.name.trim(),
        slug,
        status: 'waiting',
        irl_mode: true,
        mode: 'classic',
        settings: {
          max_buzz_attempts: form.max_buzz_attempts,
          rebuzz_delay: form.rebuzz_delay,
          auto_reject_delay: form.auto_reject_delay,
          continue_after_success: form.continue_after_success,
          stop_method: form.stop_method,
          force_equity: form.force_equity,
          equity_margin: form.equity_margin,
        },
        ...(user.value?.id ? { owner: user.value.id } : {}),
      })
    }
    window.location.href = `/${slug}`
  } catch (e: any) {
    error.value = e.message || t('wizard.error')
    creating.value = false
  }
}

const open = async () => {
  currentStepIndex.value = 0
  direction.value = 'forward'
  error.value = ''

  await Promise.all([
    loadSettings(),
    isAuthenticated.value ? refreshAuth() : Promise.resolve(),
  ])

  const base = appSettings.value ?? {}
  const userOverrides = (user.value?.user_settings ?? {}) as Record<string, any>
  const effective = { ...base, ...userOverrides } as Record<string, any>

  form.name = ''
  form.mode = 'classic'
  form.playlistId = null
  playlistsLoaded.value = false
  form.max_buzz_attempts = effective.max_buzz_attempts ?? 5
  form.rebuzz_delay = effective.rebuzz_delay ?? 5
  form.auto_reject_delay = effective.auto_reject_delay ?? 8
  form.continue_after_success = effective.continue_after_success ?? true
  form.stop_method = effective.stop_method ?? 'vote_unanimous'
  form.force_equity = effective.force_equity ?? false
  form.equity_margin = effective.equity_margin ?? 1

  dialogRef.value?.showModal()
  await nextTick()
  nameInputRef.value?.focus()
}

defineExpose({ open })
</script>

<style scoped>
.slide-forward-enter-active,
.slide-forward-leave-active,
.slide-backward-enter-active,
.slide-backward-leave-active {
  transition: all 0.2s ease;
}
.slide-forward-enter-from { transform: translateX(24px); opacity: 0; }
.slide-forward-leave-to   { transform: translateX(-24px); opacity: 0; }
.slide-backward-enter-from { transform: translateX(-24px); opacity: 0; }
.slide-backward-leave-to   { transform: translateX(24px); opacity: 0; }
</style>
