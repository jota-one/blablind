<template>
  <div class="flex gap-5 items-center">
    <template v-if="!isAuthenticated">
      <button
        class="btn btn-primary px-5 py-2 font-semibold rounded-lg cursor-pointer"
        data-testid="login-open"
        @click="openLoginModal"
      >
        {{ t('auth.login_button') }}
      </button>
      <LoginModal ref="loginModalRef" @login-success="handleLoginSuccess" @switch-to-signup="handleSwitchToSignup" />
      <SignupModal ref="signupModalRef" @signup-success="handleSignupSuccess" @switch-to-login="handleSwitchToLogin" />
    </template>
    <template v-else>
      <div class="dropdown dropdown-end">
        <button
          tabindex="0"
          role="button"
          class="flex items-center gap-3 sm:px-4 sm:py-2 sm:rounded-lg sm:bg-white/10 sm:backdrop-blur-sm sm:border sm:border-white/20 sm:hover:bg-white/15 transition-colors cursor-pointer"
        >
          <div class="flex-shrink-0">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="user.name"
              class="w-8 h-8 rounded-full object-cover border border-white/30"
            />
            <span v-else class="i-fa-solid-user text-xl text-white"></span>
          </div>
          <div class="hidden sm:flex flex-col">
            <span class="text-xs font-medium text-white/70 uppercase tracking-wide">{{ t('auth.connected') }}</span>
            <span class="text-sm font-semibold text-white">{{ user.name }}</span>
          </div>
          <span class="hidden sm:inline i-fa-solid-chevron-down text-xs text-white/70"></span>
        </button>
        <ul
          tabindex="0"
          class="dropdown-content menu bg-white shadow-lg rounded-box z-[1] w-56 p-2 border border-gray-200 mt-3"
        >
          <li>
            <a href="/profile" class="flex items-center gap-3 text-gray-700 hover:bg-gray-100">
              <span class="i-fa-solid-user text-base"></span>
              <span>{{ t('auth.my_account') }}</span>
            </a>
          </li>
          <li>
            <button
              @click="handleLogout"
              class="flex items-center gap-3 text-red-600 hover:bg-red-50 w-full text-left"
            >
              <span class="i-fa-solid-sign-out-alt text-base"></span>
              <span>{{ t('auth.logout') }}</span>
            </button>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'
import config from '@config'
import LoginModal from './LoginModal.vue'
import SignupModal from './SignupModal.vue'

const { t } = useI36n()
const { isAuthenticated, user, logout, refreshAuth } = useAuth()

onMounted(() => {
  if (isAuthenticated.value) { refreshAuth() }
})
const loginModalRef = useTemplateRef<InstanceType<typeof LoginModal>>('loginModalRef')
const signupModalRef = useTemplateRef<InstanceType<typeof SignupModal>>('signupModalRef')

const avatarUrl = computed(() => {
  if (!user.value?.avatar) { return '' }
  return `${config.apiBaseUrl}/api/files/_pb_users_auth_/${user.value.id}/${user.value.avatar}`
})

const openLoginModal = () => {
  loginModalRef.value?.open()
}

const openSignupModal = () => {
  signupModalRef.value?.open()
}

const handleLoginSuccess = () => {
  // Réactivité automatique
}

const handleSignupSuccess = () => {
  // Signup successful, let user know they need approval
}

const handleSwitchToSignup = () => {
  openSignupModal()
}

const handleSwitchToLogin = () => {
  openLoginModal()
}

const handleLogout = () => {
  logout()
  window.location.reload()
}
</script>
