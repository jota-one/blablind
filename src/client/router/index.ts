import { createRouter, createWebHistory } from 'vue-router'
import Profile from '../views/Profile.vue'
import MyBlindtests from '../views/MyBlindtests.vue'
import Favorites from '../views/Favorites.vue'
import GameSettings from '../views/GameSettings.vue'
import Playlists from '../views/Playlists.vue'
import PlaylistEditor from '../views/PlaylistEditor.vue'
import useAuth from '@admin/composables/useAuth'

const routes = [
  { path: '/', component: Profile },
  { path: '/blindtests', component: MyBlindtests },
  { path: '/playlists', component: Playlists },
  { path: '/playlists/:id', component: PlaylistEditor },
  { path: '/favorites', component: Favorites },
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
