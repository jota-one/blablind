import { useSessionStorage } from '@vueuse/core'
import PocketBase from 'pocketbase'
import { ref, computed } from 'vue'
import config from '../../config'

const pb = new PocketBase(config.apiBaseUrl)

const userJwt = useSessionStorage('userJwt', '')

const user = ref<any>({})

if (userJwt.value && !pb.authStore.isValid) {
  try {
    const payload = JSON.parse(atob(userJwt.value.split('.')[1]))
    pb.authStore.save(userJwt.value, {
      id: payload.id,
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
    } as any)
  } catch {
    pb.authStore.save(userJwt.value, null)
  }
}

export default function useAuth() {
  const login = async (auth: { email: string; password: string }) => {
    try {
      const authData = await pb.collection('users').authWithPassword(auth.email, auth.password, {
        expand: 'roles',
      })
      userJwt.value = authData.token
      user.value = authData.record
      return authData.token
    } catch (e: any) {
      return { error: true, message: e.message }
    }
  }

  const refreshAuth = async () => {
    if (!pb.authStore.isValid) return null
    try {
      const data = await pb.collection('users').authRefresh({ expand: 'roles' })
      userJwt.value = data.token
      user.value = data.record
      return data
    } catch (e) {
      console.error('Auth refresh failed', e)
      return null
    }
  }

  const logout = () => {
    pb.authStore.clear()
    userJwt.value = ''
    user.value = {}
  }

  const isAuthenticated = computed(() => !!userJwt.value && userJwt.value.length > 0)
  const isAdmin = computed(
    () => isAuthenticated.value && user.value?.expand?.roles?.some((r: any) => r.slug === 'admin'),
  )

  return {
    isAuthenticated,
    isAdmin,
    login,
    logout,
    refreshAuth,
    pb,
    user,
    userJwt,
  }
}
