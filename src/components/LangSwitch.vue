<template>
  <div class="flex items-center gap-1">
    <button
      v-for="l in langs"
      :key="l.code"
      :class="['btn btn-xs', currentLang === l.code ? 'btn-primary' : 'btn-ghost opacity-50']"
      @click="switchLang(l.code)"
    >
      {{ l.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { detectLang, setLang, type Lang } from '@/i18n'

const langs: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
]

const currentLang = detectLang()

const switchLang = (lang: Lang) => {
  if (lang !== currentLang) setLang(lang)
}
</script>
