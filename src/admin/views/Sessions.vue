<template>
  <div class="p-4 lg:p-8">
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <h2 class="text-2xl font-bold flex items-center gap-2">
        <span class="i-fa-solid-headphones"></span>
        {{ t('admin.sessions_title') }}
      </h2>
      <button
        class="btn btn-ghost btn-sm ml-auto"
        :disabled="loading"
        :title="t('admin.sessions_refresh')"
        @click="load"
      >
        <span class="i-fa-solid-rotate" :class="{ 'animate-spin': loading }"></span>
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <button
        v-for="option in filters"
        :key="option.value"
        class="btn btn-xs"
        :class="statusFilter === option.value ? 'btn-primary' : 'btn-ghost'"
        @click="selectFilter(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <p class="text-xs text-base-content/40 mb-4">{{ t('admin.sessions_live_hint') }}</p>

    <div v-if="!rows.length" class="text-base-content/50 py-8 text-center">
      {{ t('admin.sessions_empty') }}
    </div>

    <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div
        v-for="session in rows"
        :key="session.id"
        class="bg-base-200 rounded-xl p-4 flex flex-col gap-3"
      >
        <div class="flex items-start gap-2">
          <div class="min-w-0">
            <p class="font-semibold truncate">{{ session.name }}</p>
            <a
              :href="`/${session.slug}`"
              target="_blank"
              rel="noopener noreferrer"
              class="link link-hover font-mono text-xs opacity-60 flex items-center gap-1"
            >
              /{{ session.slug }}
              <span class="i-fa-solid-arrow-up-right-from-square text-[0.6rem]"></span>
            </a>
          </div>
          <div class="ml-auto flex flex-wrap justify-end gap-1 shrink-0">
            <span class="badge badge-sm" :class="statusBadge(session.status)">
              {{ t(`room.status_${session.status}`) }}
            </span>
            <span v-if="session.paused" class="badge badge-sm badge-info">
              {{ t('room.status_paused') }}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span class="flex items-center gap-1.5" :title="t('admin.sessions_players')">
            <span class="i-fa-solid-users text-xs opacity-50"></span>
            <span class="font-mono">
              <span :class="session.playersOnline > 0 ? 'text-success font-bold' : 'opacity-50'">
                {{ session.playersOnline }}
              </span>
              <span class="opacity-40">/{{ session.playersTotal }}</span>
            </span>
          </span>
          <span class="flex items-center gap-1.5" :title="t('admin.sessions_tracks')">
            <span class="i-fa-solid-music text-xs opacity-50"></span>
            <span class="font-mono opacity-70"
              >{{ session.tracksDone }}/{{ session.tracksTotal }}</span
            >
          </span>
          <span class="badge badge-sm badge-ghost">
            {{ t(`wizard.mode_${session.mode || 'classic'}`) }}
          </span>
          <div class="flex items-center justify-end gap-1 w-full sm:w-auto sm:ml-auto">
            <span class="text-xs opacity-40">{{ formatDate(session.created) }}</span>
            <button
              class="btn btn-xs btn-ghost text-red-600"
              :title="t('admin.sessions_delete')"
              @click="confirmDelete(session)"
            >
              <span class="i-fa-solid-trash"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-model="showDeleteModal"
      :title="t('admin.sessions_delete_title')"
      :message="deleteMessage"
      @confirm="deleteSessionConfirmed"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { useI36n } from '@jota-one/i36n'
import useSessions, { type TSessionRow } from '@admin/composables/useSessions'
import ConfirmModal from '@components/ConfirmModal.vue'
import type { SessionStatus } from '@/types/records'

const { t } = useI36n()
const { rows, statusFilter, loading, load, deleteSession } = useSessions()

const showDeleteModal = ref(false)
const sessionToDelete = ref<TSessionRow | null>(null)
const deleteMessage = ref('')

const filters = computed(() => [
  { value: '' as const, label: t('admin.sessions_filter_all') },
  { value: 'playing' as const, label: t('room.status_playing') },
  { value: 'waiting' as const, label: t('room.status_waiting') },
  { value: 'finished' as const, label: t('room.status_finished') },
])

const selectFilter = (value: SessionStatus | '') => {
  statusFilter.value = value
  load()
}

const statusBadge = (status: SessionStatus) => {
  if (status === 'playing') {
    return 'badge-success'
  }
  if (status === 'waiting') {
    return 'badge-warning'
  }
  return 'badge-ghost'
}

const confirmDelete = (session: TSessionRow) => {
  sessionToDelete.value = session
  deleteMessage.value = t('admin.sessions_delete_message', { name: session.name })
  if (session.playersOnline > 0) {
    deleteMessage.value += ` ${t('admin.sessions_delete_live_warning', { count: session.playersOnline })}`
  }
  showDeleteModal.value = true
}

const deleteSessionConfirmed = async () => {
  if (!sessionToDelete.value) {
    return
  }
  try {
    await deleteSession(sessionToDelete.value.id)
  } catch (error) {
    console.error('Error deleting session:', error)
  }
  showDeleteModal.value = false
  sessionToDelete.value = null
}

const formatDate = (date: string) => dayjs(date).format('DD/MM/YY HH:mm')
</script>
