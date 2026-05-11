<template>
  <ClientLayout>
    <router-view></router-view>
  </ClientLayout>
</template>

<script setup lang="ts">
import { onBeforeMount, getCurrentInstance, type App } from 'vue'
import router from '../client/router'
import ClientLayout from '../client/layouts/ClientLayout.vue'

onBeforeMount(() => {
  const app = getCurrentInstance()?.appContext.app as App
  app.use(router)
})
</script>
