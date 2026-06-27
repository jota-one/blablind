import { defineConfig, devices } from '@playwright/test'

// Realtime multi-client e2e. Each spec drives several browser contexts (one per
// player) against a shared PocketBase + Astro dev stack.
//
// PB_URL   — where the Node seed client and the browser app reach PocketBase.
//            Defaults to the LAN-reachable 0.0.0.0 bind so seeding (127.0.0.1)
//            and the browser (whatever PUBLIC_PB_BASE_URI resolves to) hit the
//            same instance.
// BASE_URL — the Astro dev server.

const BASE_URL = process.env.BASE_URL || 'http://localhost:4321'
const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8093'

export default defineConfig({
  testDir: './tests/e2e/specs',
  // Realtime specs mutate shared PocketBase state, so never run them in parallel.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // SLOWMO=500 pnpm test:e2e --headed → slow enough to watch live.
    launchOptions: process.env.SLOWMO ? { slowMo: Number(process.env.SLOWMO) } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Auto-start the stack; reuse it if you already have `pnpm db` / `pnpm dev`
  // running. PocketBase binds 0.0.0.0 so the browser app reaches the same DB the
  // seed client writes to, regardless of PUBLIC_PB_BASE_URI.
  webServer: [
    {
      command: 'pnpm db:host',
      url: `${PB_URL}/api/health`,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'pnpm dev',
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
