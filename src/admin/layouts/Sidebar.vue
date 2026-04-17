<template>
  <div class="drawer lg:drawer-open h-full">
    <input id="my-drawer" type="checkbox" class="drawer-toggle" />
    <aside class="drawer-side">
      <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <ul class="menu bg-base-200 text-base-content min-h-full w-60 p-4">
        <li>
          <RouterLink to="/" class="flex items-center gap-3" active-class="menu-active">
            <span class="i-fa6-solid-house text-xl"></span>
            {{ t('admin.nav_home') }}
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/sessions" class="flex items-center gap-3" active-class="menu-active">
            <span class="i-fa-solid-headphones text-xl"></span>
            {{ t('admin.nav_sessions') }}
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/users" class="flex items-center gap-3" active-class="menu-active">
            <span class="i-fa-solid-users text-xl"></span>
            {{ t('admin.nav_users') }}
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/roles" class="flex items-center gap-3" active-class="menu-active">
            <span class="i-fa-solid-user-shield text-xl"></span>
            Roles
          </RouterLink>
        </li>
        <li>
          <div class="flex items-center gap-3 cursor-pointer" @click="goOut">
            <span class="i-fa-solid-sign-out-alt text-xl"></span>
            {{ t('admin.nav_back') }}
          </div>
        </li>
      </ul>
    </aside>
    <div class="drawer-content p-4 overflow-y-auto h-[calc(100vh-5rem)]">
      <label for="my-drawer" class="drawer-button cursor-pointer lg:hidden">
        <span class="i-fa-solid-bars text-xl"></span>
      </label>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI36n } from '@jota-one/i36n'

const { t } = useI36n()

const goOut = () => {
  window.location.href = '/'
}
</script>
