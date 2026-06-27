<template>
  <dialog ref="loginDialog" class="modal">
    <div class="modal-box">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <template v-if="!forgotMode">
        <h3 class="font-bold text-lg mb-4">{{ t('login.title') }}</h3>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="label">
              <span class="label-text">{{ t('login.email_label') }}</span>
            </label>
            <input
              v-model="email"
              type="email"
              :placeholder="t('login.email_placeholder')"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div>
            <label class="label">
              <span class="label-text">{{ t('login.password_label') }}</span>
            </label>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div v-if="errorMessage" class="alert alert-error">
            <span>{{ errorMessage }}</span>
          </div>

          <div class="modal-action">
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner"></span>
              {{ loading ? t('login.button_loading') : t('login.button') }}
            </button>
          </div>
        </form>

        <div class="mt-4 text-center text-sm space-y-1">
          <div>
            {{ t('login.no_account_yet') }}
            <button @click="emitSwitchToSignup" class="link link-primary">
              {{ t('signup.button') }}
            </button>
          </div>
          <div>
            <button @click="enterForgotMode" class="link link-neutral text-xs" data-testid="forgot-link">
              {{ t('login.forgot_password') }}
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <h3 class="font-bold text-lg mb-4">{{ t('login.forgot_password_title') }}</h3>

        <template v-if="!forgotSent">
          <p class="text-sm text-base-content/70 mb-4">{{ t('login.forgot_password_hint') }}</p>
          <form @submit.prevent="handleForgotPassword" class="space-y-4">
            <div>
              <label class="label">
                <span class="label-text">{{ t('login.email_label') }}</span>
              </label>
              <input
                v-model="email"
                type="email"
                :placeholder="t('login.email_placeholder')"
                class="input input-bordered w-full"
                required
                data-testid="forgot-email"
              />
            </div>

            <div v-if="forgotError" class="alert alert-error">
              <span>{{ forgotError }}</span>
            </div>

            <div class="modal-action">
              <button type="button" class="btn btn-ghost" @click="exitForgotMode">
                {{ t('login.back_to_login') }}
              </button>
              <button type="submit" class="btn btn-primary" :disabled="forgotLoading" data-testid="forgot-submit">
                <span v-if="forgotLoading" class="loading loading-spinner"></span>
                {{ forgotLoading ? t('login.forgot_password_submit_loading') : t('login.forgot_password_submit') }}
              </button>
            </div>
          </form>
        </template>

        <template v-else>
          <div class="alert alert-success" data-testid="forgot-success">
            <span>{{ t('login.forgot_password_success') }}</span>
          </div>
          <div class="modal-action">
            <button class="btn btn-ghost" @click="exitForgotMode">
              {{ t('login.back_to_login') }}
            </button>
          </div>
        </template>
      </template>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'

const { t } = useI36n()
const emit = defineEmits<{
  loginSuccess: []
  switchToSignup: []
}>()

const { login, pb } = useAuth()

const loginDialog = useTemplateRef<HTMLDialogElement>('loginDialog')
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)
const forgotMode = ref(false)
const forgotLoading = ref(false)
const forgotSent = ref(false)
const forgotError = ref('')

const open = () => {
  loginDialog.value?.showModal()
  email.value = ''
  password.value = ''
  errorMessage.value = ''
  forgotMode.value = false
  forgotSent.value = false
  forgotError.value = ''
}

const close = () => {
  loginDialog.value?.close()
}

const enterForgotMode = () => {
  forgotMode.value = true
  forgotSent.value = false
  forgotError.value = ''
  password.value = ''
  errorMessage.value = ''
}

const exitForgotMode = () => {
  forgotMode.value = false
  forgotSent.value = false
  forgotError.value = ''
}

const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''

  const result = await login({
    email: email.value,
    password: password.value,
  })

  loading.value = false

  if (typeof result === 'string') {
    emit('loginSuccess')
    close()

    const returnUrl = sessionStorage.getItem('returnUrl')
    if (returnUrl) {
      sessionStorage.removeItem('returnUrl')
      window.location.href = returnUrl
    } else if (window.location.pathname === '/') {
      window.location.reload()
    }
  } else if (result.error) {
    errorMessage.value = result.message || t('login.error')
  }
}

const handleForgotPassword = async () => {
  forgotLoading.value = true
  forgotError.value = ''
  try {
    await pb.collection('users').requestPasswordReset(email.value)
    forgotSent.value = true
  } catch {
    forgotError.value = t('login.forgot_password_error')
  } finally {
    forgotLoading.value = false
  }
}

defineExpose({
  open,
  close,
})

const emitSwitchToSignup = () => {
  close()
  emit('switchToSignup')
}
</script>
