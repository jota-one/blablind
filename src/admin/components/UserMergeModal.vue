<template>
  <dialog ref="dialog" class="modal">
    <div class="modal-box max-w-xl">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <h3 class="font-bold text-lg mb-4">Merge user</h3>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <p class="text-sm">
          All activity of <strong>{{ source?.email }}</strong> (sessions, game history,
          favorites, playlists) will be moved to the selected account, then
          <strong>{{ source?.email }}</strong> will be deleted.
        </p>

        <div>
          <label class="label">
            <span class="label-text">Merge into</span>
          </label>
          <select v-model="targetId" class="select select-bordered w-full" required>
            <option disabled value="">Select the target account...</option>
            <option v-for="user in candidates" :key="user.id" :value="user.id">
              {{ user.name ? `${user.name} — ${user.email}` : user.email }}
            </option>
          </select>
        </div>

        <div class="alert alert-warning">
          <span>This action is irreversible.</span>
        </div>

        <div v-if="errorMessage" class="alert alert-error">
          <span>{{ errorMessage }}</span>
        </div>

        <div class="modal-action">
          <button type="button" @click="close" class="btn">Cancel</button>
          <button type="submit" class="btn btn-error" :disabled="loading || !targetId">
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ loading ? 'Merging...' : 'Merge and delete' }}
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
import useUsers, { type TUser } from '@admin/composables/useUsers'

const { mergeUsers } = useUsers()
const emit = defineEmits<{ merged: [] }>()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const source = ref<TUser | null>(null)
const candidates = ref<TUser[]>([])
const targetId = ref('')
const errorMessage = ref('')
const loading = ref(false)

const open = (user: TUser, otherUsers: TUser[]) => {
  source.value = user
  candidates.value = otherUsers
  targetId.value = ''
  errorMessage.value = ''
  dialog.value?.showModal()
}

const close = () => {
  dialog.value?.close()
}

const handleSubmit = async () => {
  if (!source.value || !targetId.value) return

  errorMessage.value = ''
  loading.value = true

  try {
    await mergeUsers(source.value.id, targetId.value)
    emit('merged')
    close()
  } catch (error: any) {
    console.error('Error merging users:', error)
    errorMessage.value = error.message || 'Error merging users'
  } finally {
    loading.value = false
  }
}

defineExpose({ open, close })
</script>
