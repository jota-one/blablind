import { createRouter, createWebHistory } from 'vue-router'
import Profile from '../views/Profile.vue'
import MyBlindtests from '../views/MyBlindtests.vue'
import GameSettings from '../views/GameSettings.vue'
import useAuth from '@admin/composables/useAuth'

const routes = [
  { path: '/', component: Profile },
  { path: '/blindtests', component: MyBlindtests },
  { path: '/settings', component: GameSettings },
]

const baseUrl = (import.meta as any).env?.BASE_URL || '/'

const router = createRouter({
  history: createWebHistory(baseUrl + 'profile/'),
  routes,
})

router.beforeEach(async (_to, _from) => {
  const { isAuthenticated, refreshAuth } = useAuth()

  if (isAuthenticated.value) {
    await refreshAuth()
  }

  if (!isAuthenticated.value) {
    window.location.href = '/'
    return false
  }
})

export default router
