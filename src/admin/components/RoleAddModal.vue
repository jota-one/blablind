<template>
  <dialog ref="dialog" class="modal">
    <div class="modal-box">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <h3 class="font-bold text-lg mb-4">Add a role</h3>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="label">
            <span class="label-text">Name</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            placeholder="Role name..."
            class="input input-bordered w-full"
            required
          />
        </div>

        <div>
          <label class="label">
            <span class="label-text">Slug</span>
          </label>
          <input
            v-model="form.slug"
            type="text"
            placeholder="role-slug"
            class="input input-bordered w-full"
            pattern="^[a-z0-9]+$"
            required
          />
        </div>

        <div v-if="errorMessage" class="alert alert-error">
          <span>{{ errorMessage }}</span>
        </div>

        <div class="modal-action">
          <button type="button" @click="close" class="btn">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ loading ? 'Saving...' : 'Save' }}
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
import useRoles from '@admin/composables/useRoles'

const { addRole } = useRoles()
const emit = defineEmits<{ saved: [] }>()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const form = ref({ name: '', slug: '' })
const errorMessage = ref('')
const loading = ref(false)

const open = () => {
  dialog.value?.showModal()
  form.value = { name: '', slug: '' }
  errorMessage.value = ''
}

const close = () => {
  dialog.value?.close()
}

const handleSubmit = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
    await addRole({ name: form.value.name, slug: form.value.slug })
    emit('saved')
    close()
  } catch (error: any) {
    console.error('Error adding role:', error)
    errorMessage.value = error.message || 'Error saving role'
  } finally {
    loading.value = false
  }
}

defineExpose({ open, close })
</script>
