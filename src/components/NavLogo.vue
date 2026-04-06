<template>
  <Transition name="slide-down">
    <a v-if="showLogo" href="/" aria-label="BlaBlind">
      <img src="/logo.png" alt="BlaBlind" class="h-15 w-auto" />
    </a>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWindowScroll } from '@vueuse/core'

const isHome = window.location.pathname === '/'
const { y } = useWindowScroll()
const showLogo = computed(() => !isHome || y.value > window.innerHeight * 0.4)
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-120%);
  opacity: 0;
}
</style>
