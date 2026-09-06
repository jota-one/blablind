// @ts-check
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

import vue from '@astrojs/vue'

import node from '@astrojs/node'

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: { allowedHosts: true },
    optimizeDeps: {
      rolldownOptions: {
        plugins: [
          {
            name: 'fix-pocketbase-import-method',
            transform(code, id) {
              if (id.includes('pocketbase')) {
                return code.replace(/\basync import\(/g, 'async _pb_import(')
              }
            },
          },
        ],
      },
    },
    ...(process.env.NODE_ENV === 'production'
      ? {
          ssr: {
            // The deploy artifact ships only pb/ (no node_modules), so the SSR
            // bundle must be fully self-contained.
            noExternal: true,
          },
        }
      : {}),
  },

  integrations: [vue({ appEntrypoint: '/src/pages/_app' })],
  outDir: 'pb/pb_public',

  ...(process.env.NODE_ENV === 'production'
    ? {
        server: {
          host: '127.0.0.1',
        },
      }
    : {}),

  adapter: node({
    mode: 'standalone',
  }),
})
