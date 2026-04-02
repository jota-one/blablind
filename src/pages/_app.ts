import type { App } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'

const orangeSemantic = {
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
}

const customAura = definePreset(Aura, {
  semantic: orangeSemantic,
})

export default (app: App) => {
  app.use(PrimeVue, {
    theme: {
      preset: customAura,
    },
  })
}
