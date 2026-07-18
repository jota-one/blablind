<template>
  <div
    v-if="isImpersonating"
    class="fixed bottom-0 inset-x-0 z-50 bg-warning text-warning-content px-4 py-2 flex items-center justify-center gap-4"
  >
    <span>{{ t('client.impersonation_banner', { name: user?.name || user?.email || '' }) }}</span>
    <button class="btn btn-xs" @click="handleStopImpersonation">
      {{ t('client.impersonation_stop') }}
    </button>
  </div>
  <div class="drawer lg:drawer-open h-full">
    <input id="client-drawer" type="checkbox" class="drawer-toggle" />
    <aside class="drawer-side z-40">
      <label for="client-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <div class="bg-base-200 text-base-content w-60 h-screen lg:h-[calc(100vh-5rem)] flex flex-col pt-24 lg:pt-4">
        <ul class="menu flex-1 px-4">
          <li>
            <RouterLink
              to="/"
              exact-active-class="menu-active"
              class="flex items-center gap-3"
              @click="closeDrawer"
            >
              <span class="i-fa-solid-user text-xl"></span>
              {{ t('client.nav_profile') }}
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/blindtests"
              exact-active-class="menu-active"
              class="flex items-center gap-3"
              @click="closeDrawer"
            >
              <span class="i-fa-solid-music text-xl"></span>
              {{ t('client.nav_blindtests') }}
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/playlists"
              exact-active-class="menu-active"
              class="flex items-center gap-3"
              @click="closeDrawer"
            >
              <span class="i-fa-solid-list-ol text-xl"></span>
              {{ t('client.nav_playlists') }}
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/favorites"
              exact-active-class="menu-active"
              class="flex items-center gap-3"
              @click="closeDrawer"
            >
              <span class="i-fa-solid-star text-xl"></span>
              {{ t('client.nav_favorites') }}
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/settings"
              exact-active-class="menu-active"
              class="flex items-center gap-3"
              @click="closeDrawer"
            >
              <span class="i-fa6-solid-sliders text-xl"></span>
              {{ t('client.nav_settings') }}
            </RouterLink>
          </li>
        </ul>
        <ul class="menu px-4 pb-4">
          <li>
            <div class="flex items-center gap-3 cursor-pointer" @click="handleLogout">
              <span class="i-fa-solid-sign-out-alt text-xl"></span>
              {{ t('profile.logout') }}
            </div>
          </li>
        </ul>
      </div>
    </aside>
    <div class="drawer-content p-4 lg:p-8 overflow-y-auto h-[calc(100vh-5rem)]">
      <div class="max-w-xl">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'

const { t } = useI36n()
const { logout, user, isImpersonating, stopImpersonation } = useAuth()

const handleStopImpersonation = () => {
  stopImpersonation()
  window.location.href = '/admin/users'
}

const closeDrawer = () => {
  const drawer = document.getElementById('client-drawer') as HTMLInputElement | null
  if (drawer) { drawer.checked = false }
}

const handleLogout = () => {
  logout()
  window.location.href = '/'
}
</script>
