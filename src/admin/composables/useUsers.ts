import { ref } from 'vue'
import config from '../../config'
import PocketBase from 'pocketbase'

export interface TUser {
  id: string
  email: string
  emailVisibility: boolean
  verified: boolean
  created: string
  updated: string
  name?: string
  avatar?: string
  roles?: string[]
  expand?: {
    roles?: Array<{
      id: string
      name: string
      slug: string
    }>
  }
}

export interface TUserForm {
  email: string
  emailVisibility: boolean
  password?: string
  passwordConfirm?: string
  name?: string
  avatar?: File | null
  verified?: boolean
  roles?: string[]
}

export default function useUsers() {
  const pb = new PocketBase(config.apiBaseUrl)

  const users = ref<TUser[]>([])

  const loadUsers = async () => {
    users.value = await pb.collection('users').getFullList<TUser>({
      sort: '-created',
      expand: 'roles',
    })
  }

  const loadUser = async (id: string) => {
    return pb.collection('users').getOne<TUser>(id, {
      expand: 'roles',
    })
  }

  const addUser = async (payload: TUserForm) => {
    const formData = new FormData()

    formData.append('email', payload.email.trim())
    formData.append('emailVisibility', String(payload.emailVisibility))

    if (payload.password) {
      formData.append('password', payload.password)
      formData.append('passwordConfirm', payload.passwordConfirm || payload.password)
    }

    if (payload.name) {
      formData.append('name', payload.name.trim())
    }

    if (payload.avatar && payload.avatar instanceof File) {
      formData.append('avatar', payload.avatar)
    }

    if (payload.verified !== undefined) {
      formData.append('verified', String(payload.verified))
    }

    if (payload.roles && payload.roles.length > 0) {
      payload.roles.forEach(roleId => {
        formData.append('roles', roleId)
      })
    }

    return pb.collection('users').create(formData)
  }

  const updateUser = async (id: string, payload: TUserForm) => {
    const formData = new FormData()

    formData.append('email', payload.email.trim())

    // Only include password if it's being changed
    if (payload.password) {
      formData.append('password', payload.password)
      formData.append('passwordConfirm', payload.passwordConfirm || payload.password)
    }

    if (payload.name) {
      formData.append('name', payload.name.trim())
    }

    if (payload.avatar && payload.avatar instanceof File) {
      formData.append('avatar', payload.avatar)
    }

    if (payload.roles) {
      payload.roles.forEach(roleId => {
        formData.append('roles', roleId)
      })
    }

    await pb.collection('users').update(id, formData)

    // `verified` cannot be set via the regular update endpoint — use custom route
    if (payload.verified !== undefined) {
      await pb.send(`/api/admin/users/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified: payload.verified }),
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const deleteUser = async (id: string) => {
    return pb.collection('users').delete(id)
  }

  const getAvatarUrl = (user: TUser): string => {
    if (!user.avatar) return ''
    return `${config.apiBaseUrl}/api/files/_pb_users_auth_/${user.id}/${user.avatar}`
  }

  return {
    users,
    loadUsers,
    loadUser,
    addUser,
    updateUser,
    deleteUser,
    getAvatarUrl,
  }
}
