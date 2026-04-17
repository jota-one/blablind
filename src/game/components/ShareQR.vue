<template>
  <button class="btn btn-xs btn-ghost" :title="t('share.title')" @click="open = true">
    <span class="i-fa-solid-qrcode text-lg"></span>
  </button>

  <Teleport to="body">
    <dialog class="modal" :class="{ 'modal-open': open }">
      <div class="modal-box flex flex-col items-center gap-4 max-w-xs">
        <h3 class="font-bold text-lg font-display">{{ t('share.title') }}</h3>
        <div ref="qrContainer"></div>
        <p class="text-xs text-base-content/50 break-all text-center select-all">{{ url }}</p>
        <div class="flex gap-2 w-full">
          <button class="btn btn-sm flex-1" @click="copy">
            <span :class="copied ? 'i-fa-solid-check text-success' : 'i-fa-solid-copy'"></span>
            {{ copied ? t('share.copied') : t('share.copy') }}
          </button>
          <button class="btn btn-sm btn-ghost" @click="open = false">{{ t('share.close') }}</button>
        </div>
      </div>
      <div class="modal-backdrop bg-black/40" @click="open = false"></div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, useTemplateRef } from 'vue'
import { useI36n } from '@jota-one/i36n'

const { t } = useI36n()

const props = defineProps<{ slug: string }>()

const open = ref(false)
const copied = ref(false)
const qrContainer = useTemplateRef<HTMLElement>('qrContainer')
const url = typeof window !== 'undefined' ? `${window.location.origin}/${props.slug}` : ''

let qrRendered = false

watch(open, async (val) => {
  if (!val || qrRendered) return
  await nextTick()
  const { default: QRCodeStyling } = await import('qr-code-styling')
  const qr = new QRCodeStyling({
    width: 200,
    height: 200,
    data: url,
    dotsOptions: { type: 'square', color: '#000000' },
    cornersSquareOptions: { type: 'square', color: '#f97316' },
    cornersDotOptions: { color: '#f97316' },
    backgroundOptions: { color: '#ffffff' },
    qrOptions: { errorCorrectionLevel: 'M' },
  })
  qr.append(qrContainer.value!)
  qrRendered = true
})

const copy = async () => {
  await navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>
