<template>
  <div class="p-4 lg:p-8">
    <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <span class="i-fa-solid-users"></span>
      Users
    </h2>
    <div class="card">
      <div class="flex justify-end mb-2">
        <button class="btn btn-primary btn-sm" @click="openAddModal">
          <span class="i-fa-solid-plus"></span>
          Add a user
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-sm lg:table-md w-full">
          <thead>
            <tr>
              <th class="hidden sm:table-cell" style="width: 80px"></th>
              <th>Name</th>
              <th class="hidden sm:table-cell">Email</th>
              <th>Roles</th>
              <th class="hidden sm:table-cell">Verified</th>
              <th class="hidden sm:table-cell">Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td class="hidden sm:table-cell">
                <div
                  class="w-10 h-10 bg-base-300 rounded-full flex items-center justify-center overflow-hidden"
                >
                  <img
                    v-if="user.avatar"
                    :src="getAvatarUrl(user)"
                    :alt="user.email"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="i-fa-solid-user text-xl"></span>
                </div>
              </td>
              <td>
                {{ user.name || '-' }}
                <!-- the Email column is hidden on mobile: keep the address visible here -->
                <span class="block sm:hidden text-xs opacity-50">{{ user.email }}</span>
              </td>
              <td class="hidden sm:table-cell">{{ user.email }}</td>
              <td>
                <div v-if="user.expand?.roles?.length" class="flex flex-wrap gap-1">
                  <span
                    v-for="role in user.expand.roles"
                    :key="role.id"
                    class="badge badge-primary badge-sm"
                  >
                    {{ role.name }}
                  </span>
                </div>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="hidden sm:table-cell">
                <span v-if="user.verified" class="badge badge-success badge-sm"> Verified </span>
                <span v-else class="badge badge-warning badge-sm">Not verified</span>
              </td>
              <td class="hidden sm:table-cell">{{ formatDate(user.created) }}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-xs btn-ghost" title="Edit" @click="editUser(user)">
                    <span class="i-fa-solid-pen"></span>
                  </button>
                  <button
                    class="btn btn-xs btn-ghost hidden sm:inline-flex"
                    title="Sign in as this user"
                    @click="impersonateUser(user)"
                  >
                    <span class="i-fa-solid-user-secret"></span>
                  </button>
                  <button
                    class="btn btn-xs btn-ghost hidden sm:inline-flex"
                    title="Merge into another account"
                    @click="openMergeModal(user)"
                  >
                    <span class="i-fa-solid-people-arrows"></span>
                  </button>
                  <button
                    class="btn btn-xs btn-ghost text-red-600"
                    title="Delete"
                    @click="confirmDelete(user)"
                  >
                    <span class="i-fa-solid-trash"></span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="text-sm text-gray-500 p-4">Total users: {{ users ? users.length : 0 }}</div>
    </div>

    <UserAddModal ref="addModalRef" @saved="loadUsers" />
    <UserEditModal ref="editModalRef" @saved="loadUsers" />
    <UserMergeModal ref="mergeModalRef" @merged="loadUsers" />
    <ConfirmModal
      v-model="showDeleteModal"
      title="Delete user?"
      :message="deleteMessage"
      @confirm="deleteUserConfirmed"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import dayjs from 'dayjs'
import useAuth from '@admin/composables/useAuth'
import useUsers, { type TUser } from '@admin/composables/useUsers'
import UserAddModal from '@admin/components/UserAddModal.vue'
import UserEditModal from '@admin/components/UserEditModal.vue'
import UserMergeModal from '@admin/components/UserMergeModal.vue'
import ConfirmModal from '@components/ConfirmModal.vue'

const { users, loadUsers, deleteUser, getAvatarUrl } = useUsers()
const { impersonate } = useAuth()
const addModalRef = useTemplateRef<InstanceType<typeof UserAddModal>>('addModalRef')
const editModalRef = useTemplateRef<InstanceType<typeof UserEditModal>>('editModalRef')
const mergeModalRef = useTemplateRef<InstanceType<typeof UserMergeModal>>('mergeModalRef')
const showDeleteModal = ref(false)
const editedUser = ref<TUser | null>(null)
const deleteMessage = ref('')

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('DD MMM YYYY, HH:mm')
}

const openAddModal = () => {
  addModalRef.value?.open()
}

const editUser = (user: TUser) => {
  editedUser.value = user
  editModalRef.value?.open(user)
}

const impersonateUser = async (user: TUser) => {
  try {
    await impersonate(user.id)
    window.location.href = '/profile/'
  } catch (error) {
    console.error('Error impersonating user:', error)
  }
}

const openMergeModal = (user: TUser) => {
  mergeModalRef.value?.open(
    user,
    users.value.filter(candidate => candidate.id !== user.id),
  )
}

const confirmDelete = (user: TUser) => {
  editedUser.value = user
  deleteMessage.value = `Are you sure you want to delete the user "${user.email}"?`
  showDeleteModal.value = true
}

const deleteUserConfirmed = async () => {
  if (!editedUser.value) return

  try {
    await deleteUser(editedUser.value.id)
    await loadUsers()
    showDeleteModal.value = false
    editedUser.value = null
  } catch (error) {
    console.error('Error deleting user:', error)
  }
}

onMounted(loadUsers)
</script>
