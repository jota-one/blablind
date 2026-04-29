<template>
  <div>
    <h1 class="text-2xl font-bold mb-6 flex items-center gap-2">
      <span class="i-fa-solid-user"></span>
      {{ t('profile.title') }}
    </h1>

    <div v-if="user?.id" class="card bg-base-100 shadow-md p-6 space-y-4">
      <div class="flex items-center gap-4">
        <!-- Avatar -->
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

        <!-- Name + email -->
        <div class="flex-1 min-w-0">
          <!-- Name display mode -->
          <div v-if="!editingName" class="flex items-center gap-2">
            <p class="text-xl font-semibold">{{ user.name || '—' }}</p>
            <button
              class="btn btn-xs btn-ghost text-base-content/40 hover:text-base-content"
              @click="startEditName"
            >
              <span class="i-fa-solid-pen text-xs"></span>
            </button>
          </div>
          <!-- Name edit mode -->
          <div v-else class="flex items-center gap-2">
            <input
              ref="nameInputRef"
              v-model="nameForm"
              type="text"
              class="input input-sm input-bordered flex-1 min-w-0"
              @keydown.enter="saveName"
              @keydown.escape="cancelEditName"
            />
            <button
              class="btn btn-xs btn-primary"
              :disabled="savingName"
              @click="saveName"
            >
              <span v-if="savingName" class="loading loading-spinner loading-xs"></span>
              <span v-else class="i-fa-solid-check"></span>
            </button>
            <button class="btn btn-xs btn-ghost" @click="cancelEditName">
              <span class="i-fa-solid-xmark"></span>
            </button>
          </div>
          <p class="text-base-content/70 text-sm mt-0.5">{{ user.email }}</p>
        </div>
      </div>

      <div v-if="errorMessage" class="alert alert-error py-2 text-sm">
        <span>{{ errorMessage }}</span>
      </div>

      <div class="divider"></div>

      <!-- Mes blindtests -->
      <div>
        <h2 class="text-base font-semibold mb-3 flex items-center gap-2">
          <span class="i-fa-solid-music text-primary"></span>
          {{ t('profile.my_blindtests') }}
        </h2>
        <div v-if="loadingSessions" class="flex justify-center py-4">
          <span class="loading loading-spinner loading-sm"></span>
        </div>
        <ul v-else-if="mySessions.length > 0" class="space-y-2">
          <li
            v-for="session in mySessions"
            :key="session.id"
            class="flex items-center justify-between gap-3 rounded-lg bg-base-200 px-3 py-2"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ session.name }}</p>
              <p class="text-xs text-base-content/40">{{ formatDate(session.created) }}</p>
            </div>
            <span :class="['badge badge-xs shrink-0', session.status === 'playing' ? 'badge-success' : session.status === 'finished' ? 'badge-neutral' : 'badge-warning']">
              {{ t(`room.status_${session.status}`) }}
            </span>
            <a :href="`/${session.slug}`" class="btn btn-xs btn-primary shrink-0">
              {{ t('profile.open_session') }}
            </a>
          </li>
        </ul>
        <p v-else class="text-sm text-base-content/40 text-center py-4">{{ t('profile.no_blindtests') }}</p>
      </div>

      <div class="divider"></div>

      <div class="flex gap-2">
        <a href="/admin" class="btn btn-sm btn-primary" v-if="isAdmin">
          <span class="i-fa-solid-cog"></span>
          {{ t('profile.admin_link') }}
        </a>
        <button class="btn btn-sm btn-error btn-outline" @click="handleLogout">
          <span class="i-fa-solid-sign-out-alt"></span>
          {{ t('profile.logout') }}
        </button>
      </div>
    </div>

    <div v-else class="loading loading-spinner loading-lg"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'
import useAuth from '@admin/composables/useAuth'
import config from '@config'

const { t } = useI36n()
const { user, isAdmin, logout, refreshAuth, pb } = useAuth()

refreshAuth()

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const nameInputRef = useTemplateRef<HTMLInputElement>('nameInputRef')

const avatarPreview = ref('')
const savingAvatar = ref(false)
const editingName = ref(false)
const nameForm = ref('')
const savingName = ref(false)
const errorMessage = ref('')
const mySessions = ref<any[]>([])
const loadingSessions = ref(false)

const loadMySessions = async () => {
  if (!user.value?.id) return
  loadingSessions.value = true
  try {
    mySessions.value = await pb.collection('sessions').getFullList({
      filter: `owner="${user.value.id}"`,
      sort: '-created',
      requestKey: null,
    })
  } finally {
    loadingSessions.value = false
  }
}

watch(() => user.value?.id, (id) => { if (id) loadMySessions() }, { immediate: true })

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

const currentAvatarUrl = computed(() => {
  if (!user.value?.avatar) return ''
  return `${config.apiBaseUrl}/api/files/_pb_users_auth_/${user.value.id}/${user.value.avatar}`
})

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleAvatarChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

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
    if (fileInputRef.value) fileInputRef.value.value = ''
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
