<template>
  <div class="flex gap-5 items-center">
    <template v-if="!isAuthenticated">
      <button
        class="btn btn-primary px-5 py-2 font-semibold rounded-lg cursor-pointer"
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
          class="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
        >
          <div class="flex flex-col">
            <span class="text-xs font-medium text-white/70 uppercase tracking-wide">{{ t('auth.connected') }}</span>
            <span class="text-sm font-semibold text-white">{{ user.name }}</span>
          </div>
          <span class="i-fa-solid-chevron-down text-xs text-white/70"></span>
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
import { useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'
import LoginModal from './LoginModal.vue'
import SignupModal from './SignupModal.vue'

const { t } = useI36n()
const { isAuthenticated, user, logout } = useAuth()
const loginModalRef = useTemplateRef<InstanceType<typeof LoginModal>>('loginModalRef')
const signupModalRef = useTemplateRef<InstanceType<typeof SignupModal>>('signupModalRef')

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
