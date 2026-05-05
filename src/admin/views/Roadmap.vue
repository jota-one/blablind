<template>
  <div class="p-8 max-w-5xl">
    <h2 class="text-2xl font-bold mb-10 flex items-center gap-3">
      <span class="i-fa6-solid-map text-xl text-primary"></span>
      {{ t('admin.roadmap_title') }}
    </h2>

    <!-- ── COMING SOON ─────────────────────────────────────────────────────── -->
    <section class="mb-14">
      <div class="flex items-center gap-3 mb-7">
        <span class="i-fa6-solid-fire text-2xl text-orange-400"></span>
        <h3 class="text-lg font-bold tracking-tight">{{ t('admin.roadmap_upcoming_section') }}</h3>
      </div>

      <!-- New features -->
      <p class="text-xs uppercase font-semibold tracking-widest opacity-40 mb-4">{{ t('admin.roadmap_features_label') }}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="group bg-base-100 border border-base-200 rounded-xl p-5 cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 flex flex-col gap-3"
          @click="openFeature(feature)"
        >
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span :class="[featureIcon(feature.title), 'text-primary text-base']"></span>
            </div>
            <h4 class="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">{{ feature.title }}</h4>
          </div>
          <p class="text-xs text-base-content/50 line-clamp-2 pl-12">{{ feature.excerpt }}</p>
          <div class="flex justify-end">
            <span class="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {{ t('admin.roadmap_see_detail') }}
              <span class="i-fa6-solid-arrow-right text-xs"></span>
            </span>
          </div>
        </div>
      </div>

      <!-- Improvements -->
      <p class="text-xs uppercase font-semibold tracking-widest opacity-40 mb-4">{{ t('admin.roadmap_improvements_label') }}</p>
      <div class="flex flex-col gap-2">
        <div
          v-for="(imp, i) in improvements"
          :key="i"
          class="flex items-start gap-3 px-4 py-3 rounded-lg bg-base-100 border border-base-200"
        >
          <span class="i-fa6-solid-circle-dot text-primary/40 mt-1 shrink-0"></span>
          <span class="text-sm text-base-content/80">{{ imp }}</span>
        </div>
      </div>
    </section>

    <!-- ── RECENTLY SHIPPED ────────────────────────────────────────────────── -->
    <section>
      <div class="flex items-center gap-3 mb-7">
        <span class="i-fa6-solid-circle-check text-2xl text-success"></span>
        <h3 class="text-lg font-bold tracking-tight">{{ t('admin.roadmap_history_section') }}</h3>
      </div>

      <ul class="timeline timeline-vertical timeline-snap-icon timeline-compact">
        <li v-for="entry in history" :key="entry.date + entry.title">
          <div class="timeline-middle">
            <span class="i-fa-solid-circle text-success"></span>
          </div>
          <div class="timeline-start mb-8">
            <time class="font-bold text-xs uppercase tracking-widest text-success/70">{{ formatDate(entry.date) }}</time>
            <p class="font-semibold text-sm mt-0.5">{{ entry.title }}</p>
            <p v-if="entry.detail" class="text-xs text-base-content/50 mt-0.5 line-clamp-2">{{ entry.detail }}</p>
          </div>
          <hr class="bg-success/30" />
        </li>
      </ul>
    </section>

    <!-- ── FEATURE DETAIL MODAL ───────────────────────────────────────────── -->
    <Dialog v-model:visible="showModal" modal :header="selectedFeature?.title" class="w-[55%]">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <article class="prose prose-sm max-w-none" v-html="selectedFeatureHtml" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import Dialog from 'primevue/dialog'
import { useI36n } from '@jota-one/i36n'
import roadmapContent from '../../../ROADMAP.md?raw'

const { t } = useI36n()

// ─── Types ──────────────────────────────────────────────────────────────────

interface Feature { title: string; excerpt: string; content: string }
interface HistoryEntry { date: string; title: string; detail: string }

// ─── Parser ─────────────────────────────────────────────────────────────────

function parseRoadmap(raw: string) {
  const features: Feature[] = []
  const improvements: string[] = []
  const history: HistoryEntry[] = []

  for (const section of raw.split(/^## /m).slice(1)) {
    const [heading, ...rest] = section.split('\n')
    const body = rest.join('\n').trim()

    if (heading.startsWith('Improvements')) {
      for (const line of body.split('\n')) {
        const match = line.match(/^- (.+)/)
        if (!match) { continue }
        improvements.push(match[1].trim())
      }
    } else if (heading.startsWith('New Features')) {
      for (const sub of body.split(/^### /m).slice(1)) {
        const [title, ...lines] = sub.split('\n')
        const subContent = lines.join('\n').trim()
        const excerpt = subContent.replace(/`[^`]+`/g, '').split(/[.\n]/)[0].trim()
        features.push({ title: title.trim(), excerpt, content: subContent })
      }
    } else if (heading.startsWith('History')) {
      for (const line of body.split('\n')) {
        const match = line.match(/^- \[(\d{4}-\d{2}-\d{2})\] (.+)/)
        if (!match) { continue }
        const [, date, rest2] = match
        const sep = rest2.indexOf(' — ')
        history.push({
          date,
          title: sep > -1 ? rest2.slice(0, sep).trim() : rest2.trim(),
          detail: sep > -1 ? rest2.slice(sep + 3).trim() : '',
        })
      }
    }
  }

  return { features, improvements, history }
}

const { features, improvements, history } = parseRoadmap(roadmapContent)

// ─── Modal ──────────────────────────────────────────────────────────────────

const selectedFeature = ref<Feature | null>(null)
const showModal = ref(false)

const openFeature = (f: Feature) => { selectedFeature.value = f; showModal.value = true }
const selectedFeatureHtml = computed(() =>
  selectedFeature.value ? String(marked.parse(selectedFeature.value.content)) : ''
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const formatDate = (d: string) => {
  const [year, month, day] = d.split('-').map(Number)
  return `${MONTHS_EN[month - 1]} ${day}, ${year}`
}

const ICONS: [string, string][] = [
  ['settings', 'i-fa6-solid-gear'],
  ['config', 'i-fa6-solid-gear'],
  ['client', 'i-fa6-solid-user'],
  ['profile', 'i-fa6-solid-user'],
  ['autonomous', 'i-fa6-solid-robot'],
  ['auto', 'i-fa6-solid-robot'],
  ['espace', 'i-fa6-solid-user'],
  ['mode', 'i-fa6-solid-play'],
]
const featureIcon = (title: string) => {
  const lower = title.toLowerCase()
  return ICONS.find(([k]) => lower.includes(k))?.[1] ?? 'i-fa6-solid-star'
}
</script>
