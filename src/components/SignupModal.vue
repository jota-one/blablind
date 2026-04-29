<template>
  <dialog ref="signupDialog" class="modal">
    <div class="modal-box">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <h3 class="font-bold text-lg mb-4">{{ t('signup.title') }}</h3>

      <form @submit.prevent="handleSignup" class="space-y-4">
        <div>
          <label class="label">
            <span class="label-text">{{ t('signup.name_label') }}</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            :placeholder="t('signup.name_placeholder')"
            class="input input-bordered w-full"
            required
          />
        </div>

        <div>
          <label class="label">
            <span class="label-text">{{ t('signup.email_label') }}</span>
          </label>
          <input
            v-model="form.email"
            type="email"
            :placeholder="t('signup.email_placeholder')"
            class="input input-bordered w-full"
            required
          />
        </div>

        <div>
          <label class="label">
            <span class="label-text">{{ t('signup.password_label') }}</span>
          </label>
          <input
            v-model="form.password"
            type="password"
            :placeholder="t('signup.password_placeholder')"
            class="input input-bordered w-full"
            required
          />
        </div>

        <div>
          <label class="label">
            <span class="label-text">{{ t('signup.confirm_password_label') }}</span>
          </label>
          <input
            v-model="form.passwordConfirm"
            type="password"
            :placeholder="t('signup.confirm_password_placeholder')"
            class="input input-bordered w-full"
            required
          />
        </div>

        <div v-if="errorMessage" class="alert alert-error">
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="successMessage" class="alert alert-success">
          <span>{{ successMessage }}</span>
        </div>

        <div v-if="!successMessage" class="modal-action">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ loading ? t('signup.button_loading') : t('signup.button') }}
          </button>
        </div>

        <div v-if="successMessage" class="modal-action">
          <button type="button" @click="close" class="btn btn-primary">
            {{ t('signup.close_button') }}
          </button>
        </div>
      </form>

      <div v-if="!successMessage" class="mt-4 text-center text-sm">
        {{ t('login.no_account_yet') }}
        <button @click="emitSwitchToLogin" class="link link-primary">
          {{ t('signup.login_link') }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import PocketBase from 'pocketbase'
import config from '@config'

const { t } = useI36n()
const emit = defineEmits<{
  signupSuccess: []
  switchToLogin: []
}>()

const pb = new PocketBase(config.apiBaseUrl)

const signupDialog = useTemplateRef<HTMLDialogElement>('signupDialog')
const form = ref({
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
})
const errorMessage = ref('')
const successMessage = ref('')
const loading = ref(false)

const open = () => {
  signupDialog.value?.showModal()
  resetForm()
}

const close = () => {
  signupDialog.value?.close()
  resetForm()
}

const resetForm = () => {
  form.value = {
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
  }
  errorMessage.value = ''
  successMessage.value = ''
}

const handleSignup = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  // Validation
  if (form.value.password !== form.value.passwordConfirm) {
    errorMessage.value = t('signup.passwords_dont_match')
    return
  }

  if (form.value.password.length < 8) {
    errorMessage.value = t('signup.password_too_short')
    return
  }

  loading.value = true

  try {
    // Get user role ID
    const userRole = await pb.collection('roles').getFirstListItem('slug="user"')

    // Create user with verified=false and user role
    const formData = new FormData()
    formData.append('email', form.value.email.trim())
    formData.append('name', form.value.name.trim())
    formData.append('password', form.value.password)
    formData.append('passwordConfirm', form.value.passwordConfirm)
    formData.append('emailVisibility', 'false')
    formData.append('verified', 'false')
    formData.append('roles', userRole.id)

    await pb.collection('users').create(formData)
    await pb.collection('users').requestVerification(form.value.email.trim())

    successMessage.value = t('signup.success_message')
    emit('signupSuccess')
  } catch (error: any) {
    console.error('Signup error:', error)
    if (error.response?.data?.email?.message) {
      errorMessage.value = t('signup.email_exists')
    } else {
      errorMessage.value = error.message || t('signup.error')
    }
  } finally {
    loading.value = false
  }
}

const emitSwitchToLogin = () => {
  close()
  emit('switchToLogin')
}

defineExpose({
  open,
  close,
})
</script>
