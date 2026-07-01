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
              <input v-model="form.stop_method" type="radio" :value="opt.value" class="radio radio-primary" />
              <span>{{ opt.label }}</span>
            </label>
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
  inputType: 'text' | 'number' | 'toggle' | 'radio'
  unit?: string
  min?: number
  options?: { value: string; label: string }[]
}

const steps = computed<WizardStep[]>(() => [
  {
    key: 'name',
    icon: 'i-fa-solid-headphones',
    label: t('wizard.step_name'),
    hint: t('wizard.step_name_hint'),
    inputType: 'text',
  },
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
])

const currentStep = computed(() => steps.value[currentStepIndex.value])
const isLastStep = computed(() => currentStepIndex.value === steps.value.length - 1)
const transitionName = computed(() => `slide-${direction.value}`)

const canProceed = computed(() => {
  if (currentStep.value?.key === 'name') { return form.name.trim().length > 0 }
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
    await pb.collection('sessions').create({
      name: form.name.trim(),
      slug,
      status: 'waiting',
      irl_mode: true,
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
