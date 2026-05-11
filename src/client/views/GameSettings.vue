<template>
  <div class="max-w-xl">
    <h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
      <span class="i-fa6-solid-sliders"></span>
      {{ t('client.settings_title') }}
    </h2>

    <div v-if="!form" class="text-base-content/50">{{ t('client.settings_loading') }}</div>

    <form v-else class="space-y-6" @submit.prevent="handleSave">

      <!-- max_buzz_attempts -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">{{ t('admin.settings_max_buzz_attempts_label') }}</span>
        </label>
        <div class="flex items-center gap-2 flex-wrap">
          <input v-model.number="form.max_buzz_attempts" type="number" min="1" class="input input-bordered w-32" />
          <span class="text-base-content/50 text-sm">{{ t('admin.settings_attempts') }}</span>
          <button
            v-if="isOverridden('max_buzz_attempts')"
            type="button"
            class="btn btn-xs btn-ghost text-base-content/40"
            @click="handleResetField('max_buzz_attempts')"
          >
            <span class="i-fa-solid-rotate-left text-xs"></span>
            {{ t('client.settings_reset_with_default', { value: appSettings?.max_buzz_attempts }) }}
          </button>
        </div>
        <p class="text-sm text-base-content/50 mt-1">{{ t('admin.settings_max_buzz_attempts_hint') }}</p>
      </div>

      <!-- rebuzz_delay -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">{{ t('admin.settings_rebuzz_delay_label') }}</span>
        </label>
        <div class="flex items-center gap-2 flex-wrap">
          <input v-model.number="form.rebuzz_delay" type="number" min="0" class="input input-bordered w-32" />
          <span class="text-base-content/50 text-sm">{{ t('admin.settings_seconds') }}</span>
          <button
            v-if="isOverridden('rebuzz_delay')"
            type="button"
            class="btn btn-xs btn-ghost text-base-content/40"
            @click="handleResetField('rebuzz_delay')"
          >
            <span class="i-fa-solid-rotate-left text-xs"></span>
            {{ t('client.settings_reset_with_default', { value: appSettings?.rebuzz_delay }) }}
          </button>
        </div>
        <p class="text-sm text-base-content/50 mt-1">{{ t('admin.settings_rebuzz_delay_hint') }}</p>
      </div>

      <!-- auto_reject_delay -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">{{ t('admin.settings_auto_reject_delay_label') }}</span>
        </label>
        <div class="flex items-center gap-2 flex-wrap">
          <input v-model.number="form.auto_reject_delay" type="number" min="0" class="input input-bordered w-32" />
          <span class="text-base-content/50 text-sm">{{ t('admin.settings_seconds') }}</span>
          <button
            v-if="isOverridden('auto_reject_delay')"
            type="button"
            class="btn btn-xs btn-ghost text-base-content/40"
            @click="handleResetField('auto_reject_delay')"
          >
            <span class="i-fa-solid-rotate-left text-xs"></span>
            {{ t('client.settings_reset_with_default', { value: appSettings?.auto_reject_delay }) }}
          </button>
        </div>
        <p class="text-sm text-base-content/50 mt-1">{{ t('admin.settings_auto_reject_delay_hint') }}</p>
      </div>

      <div class="divider"></div>

      <!-- continue_after_success -->
      <div class="form-control">
        <label class="label cursor-pointer justify-start gap-4">
          <input v-model="form.continue_after_success" type="checkbox" class="toggle toggle-primary" />
          <span class="label-text font-medium">{{ t('admin.settings_continue_after_success_label') }}</span>
        </label>
        <div class="flex items-center gap-2 mt-1">
          <p class="text-sm text-base-content/50">{{ t('admin.settings_continue_after_success_hint') }}</p>
          <button
            v-if="isOverridden('continue_after_success')"
            type="button"
            class="btn btn-xs btn-ghost text-base-content/40 shrink-0"
            @click="handleResetField('continue_after_success')"
          >
            <span class="i-fa-solid-rotate-left text-xs"></span>
            {{ t('client.settings_reset_with_default', { value: appSettings?.continue_after_success ? t('client.settings_yes') : t('client.settings_no') }) }}
          </button>
        </div>
      </div>

      <!-- stop_method (conditional) -->
      <div v-if="form.continue_after_success" class="form-control pl-2 border-l-2 border-primary/30">
        <label class="label">
          <span class="label-text font-medium">{{ t('admin.settings_stop_method_label') }}</span>
        </label>
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="form.stop_method" type="radio" value="vote_unanimous" class="radio radio-primary radio-sm" />
            <span class="text-sm">{{ t('admin.settings_stop_method_vote') }}</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="form.stop_method" type="radio" value="host_choice" class="radio radio-primary radio-sm" />
            <span class="text-sm">{{ t('admin.settings_stop_method_host') }}</span>
          </label>
        </div>
        <button
          v-if="isOverridden('stop_method')"
          type="button"
          class="btn btn-xs btn-ghost text-base-content/40 self-start mt-2"
          @click="handleResetField('stop_method')"
        >
          <span class="i-fa-solid-rotate-left text-xs"></span>
          {{ t('client.settings_reset_with_default', { value: appSettings?.stop_method === 'vote_unanimous' ? t('admin.settings_stop_method_vote') : t('admin.settings_stop_method_host') }) }}
        </button>
      </div>

      <div class="divider"></div>

      <!-- force_equity -->
      <div class="form-control">
        <label class="label cursor-pointer justify-start gap-4">
          <input v-model="form.force_equity" type="checkbox" class="toggle toggle-primary" />
          <span class="label-text font-medium">{{ t('admin.settings_force_equity_label') }}</span>
        </label>
        <div class="flex items-center gap-2 mt-1">
          <p class="text-sm text-base-content/50">{{ t('admin.settings_force_equity_hint') }}</p>
          <button
            v-if="isOverridden('force_equity')"
            type="button"
            class="btn btn-xs btn-ghost text-base-content/40 shrink-0"
            @click="handleResetField('force_equity')"
          >
            <span class="i-fa-solid-rotate-left text-xs"></span>
            {{ t('client.settings_reset_with_default', { value: appSettings?.force_equity ? t('client.settings_yes') : t('client.settings_no') }) }}
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="errorMessage" class="alert alert-error">
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Save -->
      <div class="flex items-center gap-4">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <span v-if="saving" class="loading loading-spinner loading-sm"></span>
          {{ saving ? t('client.settings_saving') : t('client.settings_save') }}
        </button>
        <span v-if="savedMessage" class="text-success text-sm flex items-center gap-1">
          <span class="i-fa-solid-check"></span>
          {{ t('client.settings_saved') }}
        </span>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useUserSettings, { type TUserSettings } from '../composables/useUserSettings'
import type { TSettings } from '@admin/composables/useSettings'

const { t } = useI36n()
const { appSettings, effective, isOverridden, saveOverrides, resetOverride, loadSettings, refreshAuth } = useUserSettings()

type TFormData = Omit<TSettings, 'id'>

const form = ref<TFormData | null>(null)
const saving = ref(false)
const savedMessage = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  await refreshAuth()
  await loadSettings()
  if (effective.value) {
    form.value = { ...effective.value }
  }
})

watch(effective, (val) => {
  if (val && !form.value) {
    form.value = { ...val }
  }
})

const handleResetField = async (key: keyof TUserSettings) => {
  await resetOverride(key)
  if (appSettings.value && form.value) {
    (form.value as any)[key] = (appSettings.value as any)[key]
  }
}

const handleSave = async () => {
  if (!form.value || !appSettings.value) { return }

  saving.value = true
  errorMessage.value = ''
  savedMessage.value = false

  try {
    const overrides: TUserSettings = {}
    const keys = ['max_buzz_attempts', 'rebuzz_delay', 'auto_reject_delay', 'continue_after_success', 'stop_method', 'force_equity'] as const

    for (const key of keys) {
      if ((form.value as any)[key] !== (appSettings.value as any)[key]) {
        (overrides as any)[key] = (form.value as any)[key]
      }
    }

    await saveOverrides(overrides)
    savedMessage.value = true
    setTimeout(() => { savedMessage.value = false }, 3000)
  } catch (error: any) {
    errorMessage.value = error.message || t('client.settings_error')
  } finally {
    saving.value = false
  }
}
</script>
