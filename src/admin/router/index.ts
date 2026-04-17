import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Users from '../views/Users.vue'
import Roles from '../views/Roles.vue'
import useAuth from '../composables/useAuth'

const routes = [
  { path: '/', component: Home },
  { path: '/users', component: Users },
  { path: '/roles', component: Roles },
]

const baseUrl = (import.meta as any).env?.BASE_URL || '/'

const router = createRouter({
  history: createWebHistory(baseUrl + 'admin/'),
  routes,
})

router.beforeEach(async (_to, _from) => {
  const { isAuthenticated, isAdmin, refreshAuth } = useAuth()

  if (isAuthenticated.value) {
    await refreshAuth()
  }

  if (!isAdmin.value) {
    window.location.href = '/'
    return false
  }
})

export default router
