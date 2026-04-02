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

const loadUser = async (model: any) => {
  if (!model?.id) return
  try {
    const full = await pb.collection('users').getOne(model.id)
    user.value = full
  } catch (e) {
    console.error('Failed to load user', e)
    user.value = model
  }
}

pb.authStore.onChange((_, model) => {
  if (model !== null) {
    void loadUser(model)
  }
}, true)

export default function useAuth() {
  const login = async (auth: { email: string; password: string }) => {
    try {
      const authData = await pb.collection('users').authWithPassword(auth.email, auth.password)
      userJwt.value = authData.token
      user.value = authData.record
      return authData.token
    } catch (e: any) {
      return { error: true, message: e.message }
    }
  }

  const refreshAuth = async () => {
    if (!pb.authStore.isValid && userJwt.value) {
      pb.authStore.save(userJwt.value, null)
    }
    if (!pb.authStore.isValid) return null
    try {
      const data = await pb.collection('users').authRefresh()
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
  const isAdmin = computed(() => isAuthenticated.value)

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
