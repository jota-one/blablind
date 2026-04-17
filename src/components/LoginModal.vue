<template>
  <dialog ref="loginDialog" class="modal">
    <div class="modal-box">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
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
}>()

const { login } = useAuth()

const loginDialog = useTemplateRef<HTMLDialogElement>('loginDialog')
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

const open = () => {
  loginDialog.value?.showModal()
  email.value = ''
  password.value = ''
  errorMessage.value = ''
}

const close = () => {
  loginDialog.value?.close()
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

defineExpose({
  open,
  close,
})
</script>
