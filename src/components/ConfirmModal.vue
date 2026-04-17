<template>
  <dialog ref="dialog" class="modal">
    <div class="modal-box">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <h3 class="font-bold text-lg mb-4">{{ title }}</h3>
      <p class="py-4">{{ message }}</p>
      <div class="modal-action">
        <button type="button" @click="handleCancel" class="btn">Cancel</button>
        <button type="button" @click="handleConfirm" class="btn btn-error">
          Delete
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { watch, useTemplateRef } from 'vue'

interface Props {
  modelValue: boolean
  title: string
  message: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; confirm: [] }>()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      dialog.value?.showModal()
    } else {
      dialog.value?.close()
    }
  }
)

const handleCancel = () => {
  emit('update:modelValue', false)
}

const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}
</script>
