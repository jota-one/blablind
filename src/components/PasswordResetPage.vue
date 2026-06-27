<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="card bg-base-100 shadow-xl w-full max-w-md">
      <div class="card-body">
        <h2 class="card-title text-2xl mb-2">{{ t('password_reset.title') }}</h2>

        <template v-if="!token">
          <div class="alert alert-error">
            <span>{{ t('password_reset.token_expired') }}</span>
          </div>
          <div class="mt-4">
            <a href="/" class="btn btn-ghost btn-sm">← {{ t('login.back_to_login') }}</a>
          </div>
        </template>

        <template v-else-if="submitted">
          <div class="alert alert-success" data-testid="reset-success">
            <span>{{ t('password_reset.success') }}</span>
          </div>
          <div class="mt-4">
            <a href="/" class="btn btn-primary w-full">{{ t('auth.login_button') }}</a>
          </div>
        </template>

        <template v-else>
          <form @submit.prevent="handleSubmit" class="space-y-4 mt-2">
            <div>
              <label class="label">
                <span class="label-text">{{ t('password_reset.new_label') }}</span>
              </label>
              <input
                v-model="password"
                type="password"
                placeholder="••••••••"
                class="input input-bordered w-full"
                required
                minlength="8"
                autocomplete="new-password"
                data-testid="reset-password"
              />
            </div>

            <div>
              <label class="label">
                <span class="label-text">{{ t('password_reset.confirm_label') }}</span>
              </label>
              <input
                v-model="passwordConfirm"
                type="password"
                placeholder="••••••••"
                class="input input-bordered w-full"
                required
                minlength="8"
                autocomplete="new-password"
                data-testid="reset-confirm"
              />
            </div>

            <div v-if="errorMessage" class="alert alert-error">
              <span>{{ errorMessage }}</span>
            </div>

            <button type="submit" class="btn btn-primary w-full" :disabled="loading" data-testid="reset-submit">
              <span v-if="loading" class="loading loading-spinner"></span>
              {{ t('password_reset.submit') }}
            </button>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'

const { t } = useI36n()
const { pb } = useAuth()

const token = ref('')
const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const submitted = ref(false)
const errorMessage = ref('')

onMounted(() => {
  token.value = new URLSearchParams(window.location.search).get('token') ?? ''
})

const handleSubmit = async () => {
  errorMessage.value = ''
  if (password.value !== passwordConfirm.value) {
    errorMessage.value = t('password_reset.passwords_dont_match')
    return
  }
  loading.value = true
  try {
    await pb.collection('users').confirmPasswordReset(token.value, password.value, passwordConfirm.value)
    submitted.value = true
  } catch {
    errorMessage.value = t('password_reset.error')
  } finally {
    loading.value = false
  }
}
</script>
