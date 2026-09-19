<template>
  <a href="/tutorial" :class="linkClass">
    <span class="i-fa-solid-circle-question mr-2"></span>
    {{ t('tutorial.nav') }}
  </a>
</template>

<script setup lang="ts">
import { useI36n } from '@jota-one/i36n'

type Props = {
  linkClass?: string
}

withDefaults(defineProps<Props>(), { linkClass: 'link link-hover' })

const { t } = useI36n()
</script>
