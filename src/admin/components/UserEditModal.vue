<template>
  <dialog ref="dialog" class="modal">
    <div class="modal-box max-w-2xl">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <h3 class="font-bold text-lg mb-4">Edit user</h3>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">
              <span class="label-text">Name</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="User name..."
              class="input input-bordered w-full"
              required
            />
          </div>

          <div>
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              v-model="form.email"
              type="email"
              placeholder="user@example.com"
              class="input input-bordered w-full"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">
              <span class="label-text">Password (leave empty to keep current)</span>
            </label>
            <input
              v-model="form.password"
              type="password"
              placeholder="New password (optional)"
              class="input input-bordered w-full"
            />
          </div>

          <div>
            <label class="label">
              <span class="label-text">Confirm password</span>
            </label>
            <input
              v-model="form.passwordConfirm"
              type="password"
              placeholder="Confirm password"
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <div>
          <label class="label">
            <span class="label-text">Roles</span>
          </label>
          <select v-model="form.roles" multiple class="select select-bordered w-full">
            <option v-for="role in roles" :key="role.id" :value="role.id">
              {{ role.name }}
            </option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <input
            v-model="form.verified"
            type="checkbox"
            class="checkbox checkbox-sm"
          />
          <label class="label cursor-pointer flex-1">
            <span class="label-text">Verified</span>
          </label>
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
import { ref, useTemplateRef, onMounted } from 'vue'
import useUsers, { type TUser } from '@admin/composables/useUsers'
import useRoles from '@admin/composables/useRoles'

interface Props {
  userId?: string
}

const props = defineProps<Props>()
const { updateUser, loadUser } = useUsers()
const { roles, loadRoles } = useRoles()
const emit = defineEmits<{ saved: [] }>()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const form = ref({
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
  verified: false,
  roles: [] as string[],
})
const errorMessage = ref('')
const loading = ref(false)
const userId = ref<string | undefined>()

onMounted(loadRoles)

const open = async (user: TUser) => {
  userId.value = user.id
  form.value = {
    name: user.name || '',
    email: user.email,
    password: '',
    passwordConfirm: '',
    verified: user.verified,
    roles: user.roles || [],
  }
  errorMessage.value = ''
  dialog.value?.showModal()
}

const close = () => {
  dialog.value?.close()
}

const handleSubmit = async () => {
  errorMessage.value = ''

  if (form.value.password && form.value.password !== form.value.passwordConfirm) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  if (form.value.password && form.value.password.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters'
    return
  }

  loading.value = true

  if (!userId.value) return

  try {
    await updateUser(userId.value, {
      name: form.value.name,
      email: form.value.email,
      password: form.value.password || undefined,
      passwordConfirm: form.value.passwordConfirm || undefined,
      emailVisibility: false,
      verified: form.value.verified,
      roles: form.value.roles,
    })
    emit('saved')
    close()
  } catch (error: any) {
    console.error('Error updating user:', error)
    errorMessage.value = error.message || 'Error saving user'
  } finally {
    loading.value = false
  }
}

defineExpose({ open, close })
</script>
