<template>
  <div class="flex flex-col">
    <!-- Hero -->
    <header class="px-4 pt-32 pb-12 text-center">
      <h1
        class="text-4xl md:text-5xl font-black font-display uppercase tracking-wide bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4"
      >
        {{ t('tutorial.title') }}
      </h1>
      <p class="text-lg text-base-content/70 max-w-2xl mx-auto mb-6">
        {{ t('tutorial.subtitle') }}
      </p>
      <p class="text-base-content/60 max-w-2xl mx-auto">{{ t('tutorial.intro') }}</p>
    </header>

    <!-- Screenshot flavour switch -->
    <div class="sticky top-20 z-30 bg-base-100/90 backdrop-blur-md border-y border-base-300">
      <div class="container mx-auto px-4 py-2 flex items-center justify-center gap-3">
        <span class="text-xs uppercase tracking-wide text-base-content/50 font-semibold">
          {{ t('tutorial.view_label') }}
        </span>
        <div class="join">
          <button
            v-for="v in views"
            :key="v.key"
            :class="['btn btn-xs join-item', view === v.key ? 'btn-primary' : 'btn-ghost']"
            @click="setView(v.key)"
          >
            <span :class="v.icon"></span>
            {{ t(v.label) }}
          </button>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-12 flex gap-12 items-start">
      <!-- Table of contents -->
      <aside class="hidden lg:block w-56 shrink-0 sticky top-36">
        <p class="text-xs uppercase tracking-wide text-base-content/50 font-semibold mb-3">
          {{ t('tutorial.toc_title') }}
        </p>
        <nav class="flex flex-col gap-1">
          <a
            v-for="section in sections"
            :key="section.id"
            :href="`#${section.id}`"
            class="text-sm py-1.5 px-3 rounded-lg hover:bg-base-200 text-base-content/70 hover:text-base-content transition-colors"
          >
            {{ t(section.title) }}
          </a>
        </nav>
      </aside>

      <!-- Sections -->
      <main class="flex-1 min-w-0 space-y-20">
        <section
          v-for="(section, si) in sections"
          :key="section.id"
          :id="section.id"
          class="scroll-mt-40"
        >
          <div class="flex items-baseline gap-4 mb-3">
            <span class="text-5xl font-black font-display text-primary/20 leading-none">
              {{ String(si + 1).padStart(2, '0') }}
            </span>
            <h2 class="text-2xl md:text-3xl font-bold font-display uppercase tracking-wide">
              {{ t(section.title) }}
            </h2>
          </div>
          <p class="text-base-content/60 mb-10 max-w-2xl">{{ t(section.intro) }}</p>

          <!-- Portrait shots sit beside the text; wide ones need the full column. -->
          <ol class="space-y-14">
            <li
              v-for="(step, i) in section.steps"
              :key="step.shot"
              :class="[
                'flex gap-6',
                view === 'mobile' ? 'flex-col md:flex-row md:gap-8' : 'flex-col',
              ]"
            >
              <div class="flex-1 min-w-0 md:pt-2">
                <h3 class="font-bold text-lg mb-2 flex items-start gap-3">
                  <span
                    class="shrink-0 mt-0.5 h-6 w-6 rounded-full bg-primary text-primary-content text-xs font-bold flex items-center justify-center"
                  >
                    {{ i + 1 }}
                  </span>
                  <span>{{ t(step.title) }}</span>
                </h3>
                <p class="text-base-content/70 leading-relaxed md:pl-9">{{ t(step.text) }}</p>
              </div>
              <figure
                :class="['shrink-0', view === 'mobile' ? 'w-56 mx-auto md:mx-0' : 'w-full md:pl-9']"
              >
                <a :href="shotUrl(step.shot)" target="_blank" rel="noopener" class="block">
                  <!-- Phone shell for portrait shots, browser chrome for wide ones. -->
                  <div
                    v-if="view === 'mobile'"
                    class="rounded-[2rem] border-8 border-neutral bg-neutral shadow-xl overflow-hidden"
                  >
                    <img
                      :src="shotUrl(step.shot)"
                      :alt="t(step.title)"
                      width="390"
                      height="844"
                      loading="lazy"
                      class="block w-full h-auto bg-base-100"
                    />
                  </div>
                  <div
                    v-else
                    class="rounded-lg border border-base-300 shadow-xl overflow-hidden bg-base-200"
                  >
                    <div class="flex items-center gap-1.5 px-3 py-2 bg-base-300">
                      <span class="h-2 w-2 rounded-full bg-base-content/20"></span>
                      <span class="h-2 w-2 rounded-full bg-base-content/20"></span>
                      <span class="h-2 w-2 rounded-full bg-base-content/20"></span>
                    </div>
                    <img
                      :src="shotUrl(step.shot)"
                      :alt="t(step.title)"
                      width="1440"
                      height="900"
                      loading="lazy"
                      class="block w-full h-auto bg-base-100"
                    />
                  </div>
                </a>
              </figure>
            </li>
          </ol>

          <div v-if="section.tip" class="alert alert-info mt-12 items-start">
            <span class="i-fa-solid-lightbulb text-lg shrink-0 mt-0.5"></span>
            <span class="text-sm">
              <strong class="block">{{ t('tutorial.tip') }}</strong>
              {{ t(section.tip) }}
            </span>
          </div>
        </section>

        <!-- Call to action -->
        <section class="card bg-base-200 shadow-xl p-8 text-center">
          <h2 class="text-xl font-bold font-display uppercase tracking-wide mb-6">
            {{ t('tutorial.cta_title') }}
          </h2>
          <div class="flex flex-wrap gap-3 justify-center">
            <a href="/" class="btn btn-primary">
              <span class="i-fa-solid-wand-magic-sparkles mr-2"></span>
              {{ t('tutorial.cta_button') }}
            </a>
            <a href="/" class="btn btn-ghost">{{ t('tutorial.back_home') }}</a>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI36n } from '@jota-one/i36n'
import { detectLang } from '@/i18n'

const { t } = useI36n()

type View = 'mobile' | 'desktop'

const views: { key: View; label: string; icon: string }[] = [
  { key: 'mobile', label: 'tutorial.view_mobile', icon: 'i-fa-solid-mobile-screen mr-1' },
  { key: 'desktop', label: 'tutorial.view_desktop', icon: 'i-fa-solid-desktop mr-1' },
]

const lang = detectLang()

// Readers get the flavour matching the device they're holding, and it follows a
// resize. The switch is an override for looking at the other one, and only lasts
// as long as the page — so a phone opened later still opens on phone shots.
const isWide = useMediaQuery('(min-width: 1024px)')
const override = ref<View | null>(null)
const view = computed<View>(() => override.value ?? (isWide.value ? 'desktop' : 'mobile'))

const setView = (next: View) => {
  override.value = next
}

const shotUrl = (shot: string) => `/tutorial/${lang}-${view.value}/${shot}.webp`

// One entry per section, in reading order: its id keys the translations
// (`tutorial.<id>_title`, `_intro`, `_tip`, `_<n>_title`, `_<n>_text`) and its
// screenshots give the steps, so reordering either only happens here.
const OUTLINE = [
  { id: 'account', shots: ['login', 'signup'] },
  { id: 'create', shots: ['home-actions', 'wizard-mode', 'wizard-name', 'wizard-settings'] },
  { id: 'invite', shots: ['share', 'join', 'lobby', 'add-track', 'add-track-youtube'] },
  { id: 'play', shots: ['playing', 'dj', 'buzz', 'validate', 'scores', 'gameover'] },
  {
    id: 'member',
    shots: ['profile', 'blindtests', 'playlists', 'playlist-editor', 'favorites', 'settings'],
  },
]

const sections = OUTLINE.map(section => ({
  id: section.id,
  title: `tutorial.${section.id}_title`,
  intro: `tutorial.${section.id}_intro`,
  tip: `tutorial.${section.id}_tip`,
  steps: section.shots.map((shot, i) => ({
    shot,
    title: `tutorial.${section.id}_${i + 1}_title`,
    text: `tutorial.${section.id}_${i + 1}_text`,
  })),
}))
</script>
