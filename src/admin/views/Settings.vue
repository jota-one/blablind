<template>
  <div class="p-8 max-w-xl">
    <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
      <span class="i-fa-solid-sliders text-xl"></span>
      {{ t('admin.settings_title') }}
    </h2>

    <div v-if="!form" class="text-base-content/50">{{ t('admin.settings_loading') }}</div>

    <form v-else class="card space-y-6 p-6" @submit.prevent="handleSave">

      <!-- max_buzz_attempts -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">{{ t('admin.settings_max_buzz_attempts_label') }}</span>
        </label>
        <div class="flex items-center gap-2">
          <input
            v-model.number="form.max_buzz_attempts"
            type="number"
            min="1"
            class="input input-bordered w-32"
          />
          <span class="text-base-content/50 text-sm">{{ t('admin.settings_attempts') }}</span>
        </div>
        <p class="text-sm text-base-content/50 mt-1">{{ t('admin.settings_max_buzz_attempts_hint') }}</p>
      </div>

      <!-- rebuzz_delay -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">{{ t('admin.settings_rebuzz_delay_label') }}</span>
        </label>
        <div class="flex items-center gap-2">
          <input
            v-model.number="form.rebuzz_delay"
            type="number"
            min="0"
            class="input input-bordered w-32"
          />
          <span class="text-base-content/50 text-sm">{{ t('admin.settings_seconds') }}</span>
        </div>
        <p class="text-sm text-base-content/50 mt-1">{{ t('admin.settings_rebuzz_delay_hint') }}</p>
      </div>

      <!-- auto_reject_delay -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">{{ t('admin.settings_auto_reject_delay_label') }}</span>
        </label>
        <div class="flex items-center gap-2">
          <input
            v-model.number="form.auto_reject_delay"
            type="number"
            min="0"
            class="input input-bordered w-32"
          />
          <span class="text-base-content/50 text-sm">{{ t('admin.settings_seconds') }}</span>
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
        <p class="text-sm text-base-content/50 mt-1">{{ t('admin.settings_continue_after_success_hint') }}</p>
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
      </div>

      <div class="divider"></div>

      <!-- force_equity -->
      <div class="form-control">
        <label class="label cursor-pointer justify-start gap-4">
          <input v-model="form.force_equity" type="checkbox" class="toggle toggle-primary" />
          <span class="label-text font-medium">{{ t('admin.settings_force_equity_label') }}</span>
        </label>
        <p class="text-sm text-base-content/50 mt-1">{{ t('admin.settings_force_equity_hint') }}</p>
      </div>

      <!-- Error -->
      <div v-if="errorMessage" class="alert alert-error">
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Save -->
      <div class="flex items-center gap-4">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <span v-if="saving" class="loading loading-spinner loading-sm"></span>
          {{ saving ? t('admin.settings_saving') : t('admin.settings_save') }}
        </button>
        <span v-if="savedMessage" class="text-success text-sm flex items-center gap-1">
          <span class="i-fa-solid-check"></span>
          {{ t('admin.settings_saved') }}
        </span>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useSettings, { type TSettings } from '@admin/composables/useSettings'

const { t } = useI36n()
const { settings, loadSettings, saveSettings } = useSettings()

const form = ref<Omit<TSettings, 'id'> | null>(null)
const saving = ref(false)
const savedMessage = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  await loadSettings()
  if (settings.value) {
    const { id: _, ...rest } = settings.value
    form.value = { ...rest }
  }
})

const handleSave = async () => {
  if (!form.value) { return }
  saving.value = true
  errorMessage.value = ''
  savedMessage.value = false
  try {
    await saveSettings(form.value)
    savedMessage.value = true
    setTimeout(() => { savedMessage.value = false }, 3000)
  } catch (error: any) {
    errorMessage.value = error.message || t('admin.settings_error')
  } finally {
    saving.value = false
  }
}
</script>
