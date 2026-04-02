import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import useAuth from '../composables/useAuth'

const routes = [{ path: '', component: Home }]

const baseUrl = (import.meta as any).env?.BASE_URL || '/'

const router = createRouter({
  history: createWebHistory(baseUrl + 'admin/'),
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
