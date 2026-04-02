<template>
  <div>
    <h1 class="text-2xl font-bold mb-6 flex items-center gap-2">
      <span class="i-fa-solid-user"></span>
      Mon compte
    </h1>

    <div v-if="user?.id" class="card bg-base-100 shadow-md p-6 space-y-4">
      <div class="flex items-center gap-4">
        <div class="w-20 h-20 rounded-full bg-base-300 flex items-center justify-center flex-shrink-0">
          <span class="i-fa-solid-user text-3xl text-base-content/40"></span>
        </div>
        <div>
          <p class="text-xl font-semibold">{{ user.name || '—' }}</p>
          <p class="text-base-content/70 text-sm">{{ user.email }}</p>
        </div>
      </div>

      <div class="divider"></div>

      <div class="flex gap-2">
        <a href="/admin" class="btn btn-sm btn-primary" v-if="isAdmin">
          <span class="i-fa-solid-cog"></span>
          Administration
        </a>
        <button class="btn btn-sm btn-error btn-outline" @click="handleLogout">
          <span class="i-fa-solid-sign-out-alt"></span>
          Déconnexion
        </button>
      </div>
    </div>

    <div v-else class="loading loading-spinner loading-lg"></div>
  </div>
</template>

<script setup lang="ts">
import useAuth from '@admin/composables/useAuth'

const { user, isAdmin, logout, refreshAuth } = useAuth()

refreshAuth()

const handleLogout = () => {
  logout()
  window.location.href = '/'
}
</script>
