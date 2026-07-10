<template>
  <button
    type="button"
    class="btn btn-ghost btn-xs btn-circle shrink-0"
    :class="active ? 'text-warning' : 'text-base-content/25 hover:text-warning'"
    :title="active ? t('room.favorite_remove') : t('room.favorite_add')"
    data-testid="favorite-button"
    @click.stop="$emit('toggle')"
  >
    <span class="i-fa-solid-star text-base"></span>
  </button>
</template>

<script setup lang="ts">
import { useI36n } from '@jota-one/i36n'

const { t } = useI36n()

type Props = {
  active: boolean
}

defineProps<Props>()
defineEmits<{ toggle: [] }>()
</script>
