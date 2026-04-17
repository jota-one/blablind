<template>
  <div class="p-8">
    <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <span class="i-fa-solid-user-shield"></span>
      Roles
    </h2>
    <div class="card">
      <div class="flex justify-end mb-2">
        <button
          class="btn btn-primary btn-sm"
          @click="openAddModal"
        >
          <span class="i-fa-solid-plus"></span>
          Add a role
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="role in roles" :key="role.id">
              <td class="font-semibold">{{ role.name }}</td>
              <td class="font-mono text-sm">{{ role.slug }}</td>
              <td>{{ formatDate(role.created) }}</td>
              <td>
                <div class="flex gap-2">
                  <button
                    class="btn btn-xs btn-ghost"
                    title="Edit"
                    @click="editRole(role)"
                  >
                    <span class="i-fa-solid-pen"></span>
                  </button>
                  <button
                    v-if="role.slug !== 'user' && role.slug !== 'admin'"
                    class="btn btn-xs btn-ghost text-red-600"
                    title="Delete"
                    @click="confirmDelete(role)"
                  >
                    <span class="i-fa-solid-trash"></span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="text-sm text-gray-500 p-4">
        Total roles: {{ roles ? roles.length : 0 }}
      </div>
    </div>

    <RoleAddModal ref="addModalRef" @saved="loadRoles" />
    <RoleEditModal ref="editModalRef" @saved="loadRoles" />
    <ConfirmModal
      v-model="showDeleteModal"
      title="Delete role?"
      :message="deleteMessage"
      @confirm="deleteRoleConfirmed"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import dayjs from 'dayjs'
import useRoles, { type TRole } from '@admin/composables/useRoles'
import RoleAddModal from '@admin/components/RoleAddModal.vue'
import RoleEditModal from '@admin/components/RoleEditModal.vue'
import ConfirmModal from '@components/ConfirmModal.vue'

const { roles, loadRoles, deleteRole } = useRoles()
const addModalRef = useTemplateRef<InstanceType<typeof RoleAddModal>>('addModalRef')
const editModalRef = useTemplateRef<InstanceType<typeof RoleEditModal>>('editModalRef')
const showDeleteModal = ref(false)
const editedRole = ref<TRole | null>(null)
const deleteMessage = ref('')

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('DD MMM YYYY, HH:mm')
}

const openAddModal = () => {
  addModalRef.value?.open()
}

const editRole = (role: TRole) => {
  editedRole.value = role
  editModalRef.value?.open(role)
}

const confirmDelete = (role: TRole) => {
  editedRole.value = role
  deleteMessage.value = `Are you sure you want to delete the role "${role.name}"?`
  showDeleteModal.value = true
}

const deleteRoleConfirmed = async () => {
  if (!editedRole.value) return

  try {
    await deleteRole(editedRole.value.id)
    await loadRoles()
    showDeleteModal.value = false
    editedRole.value = null
  } catch (error) {
    console.error('Error deleting role:', error)
  }
}

onMounted(loadRoles)
</script>
