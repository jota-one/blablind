<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4">
    <div class="card bg-base-200 shadow-xl w-full max-w-sm p-8">
      <h1 class="text-2xl font-bold font-display mb-1 text-center">
        <span class="i-fa-solid-music text-primary mr-2"></span>
        {{ session.name }}
      </h1>
      <p class="text-base-content/50 text-sm text-center mb-6">
        {{ t('join.subtitle') }}
      </p>

      <form @submit.prevent="handleJoin" class="space-y-4">
        <input
          v-model="name"
          v-focus
          type="text"
          :placeholder="t('join.placeholder')"
          class="input input-bordered w-full text-center text-lg"
          maxlength="30"
          required
        />
        <button type="submit" class="btn btn-primary w-full" :disabled="loading">
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          {{ t('join.button') }}
        </button>
      </form>

      <p v-if="error" class="text-error text-sm mt-3 text-center">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI36n } from '@jota-one/i36n'

const { t } = useI36n()

const props = defineProps<{
  session: any
}>()

const emit = defineEmits<{
  joined: [player: any]
}>()

const name = ref('')
const loading = ref(false)
const error = ref('')

const handleJoin = async () => {
  if (!name.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    emit('joined', name.value.trim())
  } catch (e: any) {
    error.value = e.message || t('join.error')
    loading.value = false
  }
}
</script>
