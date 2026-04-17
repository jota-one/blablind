import { ref } from 'vue'
import config from '../../config'
import PocketBase from 'pocketbase'

export interface TRole {
  id: string
  name: string
  slug: string
  created: string
  updated: string
}

export default function useRoles() {
  const pb = new PocketBase(config.apiBaseUrl)

  const roles = ref<TRole[]>([])

  const loadRoles = async () => {
    roles.value = await pb.collection('roles').getFullList<TRole>({
      sort: 'name',
    })
  }

  const addRole = async (payload: { name: string; slug: string }) => {
    const formData = new FormData()
    formData.append('name', payload.name.trim())
    formData.append('slug', payload.slug.trim().toLowerCase())
    return pb.collection('roles').create(formData)
  }

  const updateRole = async (id: string, payload: { name: string; slug: string }) => {
    const formData = new FormData()
    formData.append('name', payload.name.trim())
    formData.append('slug', payload.slug.trim().toLowerCase())
    return pb.collection('roles').update(id, formData)
  }

  const deleteRole = async (id: string) => {
    return pb.collection('roles').delete(id)
  }

  return {
    roles,
    loadRoles,
    addRole,
    updateRole,
    deleteRole,
  }
}
