<template>
  <div v-if="user?.id" class="space-y-6 max-w-4xl">
    <!-- Identity -->
    <div class="card bg-base-100 shadow-md p-4 sm:p-6">
      <div class="flex flex-wrap items-center gap-4">
        <button
          type="button"
          class="relative group w-20 h-20 rounded-full overflow-hidden bg-base-300 flex-shrink-0 flex items-center justify-center cursor-pointer"
          :class="{ 'opacity-60': savingAvatar }"
          :disabled="savingAvatar"
          @click="triggerFileInput"
        >
          <img
            v-if="avatarPreview || currentAvatarUrl"
            :src="avatarPreview || currentAvatarUrl"
            alt="avatar"
            class="w-full h-full object-cover"
          />
          <span v-else class="i-fa-solid-user text-3xl text-base-content/40"></span>
          <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span v-if="!savingAvatar" class="i-fa-solid-camera text-white text-xl"></span>
            <span v-else class="loading loading-spinner loading-sm text-white"></span>
          </div>
        </button>
        <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />

        <div class="flex-1 min-w-0">
          <div v-if="!editingName" class="flex items-center gap-2">
            <p class="text-xl font-semibold truncate">{{ user.name || '—' }}</p>
            <button
              class="btn btn-xs btn-ghost text-base-content/40 hover:text-base-content"
              @click="startEditName"
            >
              <span class="i-fa-solid-pen text-xs"></span>
            </button>
          </div>
          <div v-else class="flex items-center gap-2">
            <input
              ref="nameInputRef"
              v-model="nameForm"
              type="text"
              class="input input-sm input-bordered flex-1 min-w-0"
              @keydown.enter="saveName"
              @keydown.escape="cancelEditName"
            />
            <button class="btn btn-xs btn-primary" :disabled="savingName" @click="saveName">
              <span v-if="savingName" class="loading loading-spinner loading-xs"></span>
              <span v-else class="i-fa-solid-check"></span>
            </button>
            <button class="btn btn-xs btn-ghost" @click="cancelEditName">
              <span class="i-fa-solid-xmark"></span>
            </button>
          </div>
          <p class="text-base-content/70 text-sm mt-0.5 truncate">{{ user.email }}</p>
        </div>

        <div class="flex gap-2 w-full sm:w-auto">
          <a v-if="isAdmin" href="/admin" class="btn btn-sm btn-primary">
            <span class="i-fa-solid-cog"></span>
            {{ t('profile.admin_link') }}
          </a>
          <button class="btn btn-sm btn-error btn-outline" @click="handleLogout">
            <span class="i-fa-solid-sign-out-alt"></span>
            {{ t('profile.logout') }}
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="alert alert-error py-2 text-sm mt-4">
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <!-- Quick access -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <RouterLink
        v-for="tile in tiles"
        :key="tile.to"
        :to="tile.to"
        class="card bg-base-200 hover:bg-base-300 transition-colors p-4 flex flex-col gap-1"
      >
        <span :class="[tile.icon, 'text-xl text-primary']"></span>
        <span class="font-semibold text-sm mt-1">{{ tile.label }}</span>
        <span v-if="tile.count !== null" class="text-2xl font-bold font-mono leading-none">
          {{ tile.count }}
        </span>
      </RouterLink>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Last blindtest -->
      <section>
        <div class="flex items-center gap-2 mb-3">
          <h3 class="font-semibold flex items-center gap-2">
            <span class="i-fa-solid-music text-primary"></span>
            {{ t('dashboard.last_blindtest') }}
          </h3>
          <RouterLink to="/blindtests" class="btn btn-xs btn-ghost ml-auto">
            {{ t('dashboard.see_all') }}
            <span class="i-fa6-solid-arrow-right text-xs"></span>
          </RouterLink>
        </div>
        <div v-if="lastSession" class="card bg-base-200 p-4 flex flex-col gap-3">
          <div class="flex items-start gap-2">
            <div class="min-w-0">
              <p class="font-semibold truncate">{{ lastSession.name }}</p>
              <p class="text-xs opacity-50">{{ formatDate(lastSession.created) }}</p>
            </div>
            <span class="badge badge-sm ml-auto shrink-0" :class="statusBadge(lastSession.status)">
              {{ t(`room.status_${lastSession.status}`) }}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm opacity-70 flex items-center gap-1.5">
              <span class="i-fa-solid-music text-xs opacity-50"></span>
              {{ t('playlists.track_count', { count: lastSessionTracks }) }}
            </span>
            <a :href="`/${lastSession.slug}`" class="btn btn-xs btn-primary ml-auto">
              {{ t('profile.open_session') }}
            </a>
          </div>
        </div>
        <p v-else class="text-sm text-base-content/50 py-4">{{ t('profile.no_blindtests') }}</p>
      </section>

      <!-- Last playlist -->
      <section>
        <div class="flex items-center gap-2 mb-3">
          <h3 class="font-semibold flex items-center gap-2">
            <span class="i-fa-solid-list-ol text-primary"></span>
            {{ t('dashboard.last_playlist') }}
          </h3>
          <RouterLink to="/playlists" class="btn btn-xs btn-ghost ml-auto">
            {{ t('dashboard.see_all') }}
            <span class="i-fa6-solid-arrow-right text-xs"></span>
          </RouterLink>
        </div>
        <div v-if="lastPlaylist" class="card bg-base-200 p-4 flex flex-col gap-3">
          <div class="flex items-start gap-2">
            <div class="min-w-0">
              <p class="font-semibold truncate">{{ lastPlaylist.name }}</p>
              <p class="text-xs opacity-50">{{ formatDate(lastPlaylist.updated) }}</p>
            </div>
            <span v-if="lastPlaylist.public" class="badge badge-sm badge-info ml-auto shrink-0">
              {{ t('playlists.public_badge') }}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm opacity-70 flex items-center gap-1.5">
              <span class="i-fa-solid-music text-xs opacity-50"></span>
              {{ t('playlists.track_count', { count: playlistTrackCount }) }}
            </span>
            <RouterLink :to="`/playlists/${lastPlaylist.id}`" class="btn btn-xs btn-primary ml-auto">
              {{ t('playlists.edit') }}
            </RouterLink>
          </div>
        </div>
        <p v-else class="text-sm text-base-content/50 py-4">{{ t('dashboard.no_playlist') }}</p>
      </section>
    </div>

    <!-- Recent favorites -->
    <section>
      <div class="flex items-center gap-2 mb-3">
        <h3 class="font-semibold flex items-center gap-2">
          <span class="i-fa-solid-star text-primary"></span>
          {{ t('dashboard.recent_favorites') }}
        </h3>
        <RouterLink to="/favorites" class="btn btn-xs btn-ghost ml-auto">
          {{ t('dashboard.see_all') }}
          <span class="i-fa6-solid-arrow-right text-xs"></span>
        </RouterLink>
      </div>
      <ul v-if="recentFavorites.length" class="flex flex-col gap-2">
        <li
          v-for="favorite in recentFavorites"
          :key="favorite.id"
          class="card bg-base-200 p-2 flex flex-row items-center gap-3"
        >
          <img
            :src="`https://img.youtube.com/vi/${favorite.expand?.video?.video_id}/default.jpg`"
            :alt="favorite.expand?.video?.title"
            class="w-16 h-12 object-cover rounded shrink-0"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{{ favorite.expand?.video?.title || '—' }}</p>
            <p class="text-xs opacity-50 truncate">{{ favorite.expand?.video?.artist }}</p>
          </div>
        </li>
      </ul>
      <p v-else class="text-sm text-base-content/50 py-4">{{ t('dashboard.no_favorites') }}</p>
    </section>
  </div>

  <div v-else class="flex justify-center py-16">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'
import useDashboard from '../composables/useDashboard'
import config from '@config'
import type { SessionStatus } from '@/types/records'

const { t } = useI36n()
const { user, isAdmin, logout, refreshAuth, pb } = useAuth()
const { lastSession, lastSessionTracks, lastPlaylist, recentFavorites, counts } = useDashboard()

refreshAuth()

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const nameInputRef = useTemplateRef<HTMLInputElement>('nameInputRef')

const avatarPreview = ref('')
const savingAvatar = ref(false)
const editingName = ref(false)
const nameForm = ref('')
const savingName = ref(false)
const errorMessage = ref('')

const tiles = computed(() => [
  { to: '/blindtests', icon: 'i-fa-solid-music', label: t('client.nav_blindtests'), count: counts.value.sessions },
  { to: '/playlists', icon: 'i-fa-solid-list-ol', label: t('client.nav_playlists'), count: counts.value.playlists },
  { to: '/favorites', icon: 'i-fa-solid-star', label: t('client.nav_favorites'), count: counts.value.favorites },
  { to: '/settings', icon: 'i-fa6-solid-sliders', label: t('client.nav_settings'), count: null },
])

const playlistTrackCount = computed(
  () => lastPlaylist.value?.expand?.playlist_tracks_via_playlist?.length ?? 0,
)

const currentAvatarUrl = computed(() => {
  if (!user.value?.avatar) { return '' }
  return `${config.apiBaseUrl}/api/files/_pb_users_auth_/${user.value.id}/${user.value.avatar}`
})

const statusBadge = (status: SessionStatus) => {
  if (status === 'playing') { return 'badge-success' }
  if (status === 'waiting') { return 'badge-warning' }
  return 'badge-ghost'
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleAvatarChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) { return }

  avatarPreview.value = URL.createObjectURL(file)
  savingAvatar.value = true
  errorMessage.value = ''

  try {
    const formData = new FormData()
    formData.append('avatar', file)
    await pb.collection('users').update(user.value.id, formData)
    await refreshAuth()
    avatarPreview.value = ''
  } catch {
    errorMessage.value = t('profile.save_error')
    avatarPreview.value = ''
  } finally {
    savingAvatar.value = false
    if (fileInputRef.value) { fileInputRef.value.value = '' }
  }
}

const startEditName = async () => {
  nameForm.value = user.value.name || ''
  editingName.value = true
  await nextTick()
  nameInputRef.value?.focus()
  nameInputRef.value?.select()
}

const cancelEditName = () => {
  editingName.value = false
}

const saveName = async () => {
  savingName.value = true
  errorMessage.value = ''

  try {
    const formData = new FormData()
    formData.append('name', nameForm.value.trim())
    await pb.collection('users').update(user.value.id, formData)
    await refreshAuth()
    editingName.value = false
  } catch {
    errorMessage.value = t('profile.save_error')
  } finally {
    savingName.value = false
  }
}

const handleLogout = () => {
  logout()
  window.location.href = '/'
}
</script>
