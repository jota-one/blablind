// `playwright` itself isn't a direct dependency — @playwright/test re-exports it.
import { chromium, devices, type BrowserContext, type Page } from '@playwright/test'
import PocketBase from 'pocketbase'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { DEMO_PASSWORD, ROOT, SEED_FILE, SHOTS_DIR, type Seed } from './config.ts'

// Drives the app through every screen the tutorial page shows and writes one PNG
// per screen, for each language × viewport. Needs `pnpm tutorial:seed` first,
// plus the app and PocketBase running.
// Run: pnpm tutorial:shoot   (then `pnpm tutorial:webp`)

const APP = process.env.BASE_URL || 'http://localhost:4321'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const LANGS = (process.env.LANGS || 'fr,en').split(',')
const VPS = (process.env.VPS || 'mobile,desktop').split(',')

const SEED: Seed = JSON.parse(await readFile(SEED_FILE, 'utf8'))
const TR: Record<string, Record<string, string>> = {
  fr: JSON.parse(await readFile(path.join(ROOT, 'src/translations/fr.json'), 'utf8')),
  en: JSON.parse(await readFile(path.join(ROOT, 'src/translations/en.json'), 'utf8')),
}

const pb = new PocketBase(process.env.PB_URL || 'http://127.0.0.1:8093')
const asAdmin = () =>
  pb
    .collection('_superusers')
    .authWithPassword(process.env.PB_ADMIN_EMAIL!, process.env.PB_ADMIN_PASSWORD!)

if (!process.env.PB_ADMIN_EMAIL || !process.env.PB_ADMIN_PASSWORD) {
  console.error('PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD required.')
  process.exit(1)
}
await asAdmin()

// The member-area shots need an authenticated page. The token is fetched over
// the API and primed into sessionStorage — no password is ever typed into a form.
const DEMO_JWT = (await pb.collection('users').authWithPassword(SEED.email, DEMO_PASSWORD)).token
await asAdmin()

const playlists = await pb
  .collection('playlists')
  .getFullList({ filter: `owner="${SEED.user}"`, sort: 'created' })
const PLAYLIST_ID = playlists[0]!.id

/** Seeded players read as offline after 45 s — re-beat them before room shots. */
const refreshPresence = async () => {
  for (const sid of Object.values(SEED.sessionIds)) {
    for (const p of await pb.collection('players').getFullList({ filter: `session="${sid}"` })) {
      await pb
        .collection('players')
        .update(p.id, { last_seen: new Date().toISOString() })
        .catch(() => {})
    }
  }
}

const clearBuzzes = async () => {
  for (const b of await pb
    .collection('buzzes')
    .getFullList({ filter: `track="${SEED.playingTrackId}"` })) {
    await pb
      .collection('buzzes')
      .delete(b.id)
      .catch(() => {})
  }
}

/** A pending buzz, so the track owner's screen shows the validation panel.
 *  IRL games carry no written answer — the player says it out loud. */
const armBuzz = async () => {
  await clearBuzzes()
  await pb.collection('buzzes').create({
    track: SEED.playingTrackId,
    player: SEED.players.game!.sarah!.id,
    status: 'pending',
    answer: '',
  })
}

const VIEWPORTS: Record<string, Record<string, unknown>> = {
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 13']!.userAgent,
  },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

for (const lang of LANGS) {
  const t = (key: string, vars: Record<string, string> = {}) => {
    let out = TR[lang]?.[key] ?? key
    for (const [name, value] of Object.entries(vars)) {
      out = out.replace(`{${name}}`, value)
    }
    return out
  }

  for (const vpName of VPS) {
    const dir = path.join(SHOTS_DIR, `${lang}-${vpName}`)
    await mkdir(dir, { recursive: true })

    const browser = await chromium.launch()
    const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
    const done: string[] = []
    const failed: string[] = []

    /** Fresh context; `as` primes which seeded player identity the page restores. */
    const makeCtx = async ({ auth = false, as = '' } = {}): Promise<BrowserContext> => {
      const ctx = await browser.newContext({ ...VIEWPORTS[vpName], locale } as any)
      await ctx.addInitScript(
        ({ lang, seed, jwt, auth, as }: any) => {
          localStorage.setItem('blablind_lang', lang)
          if (as) {
            for (const [key, sid] of Object.entries(seed.sessionIds) as [string, string][]) {
              const who = seed.players[key]?.[as]
              if (who) {
                localStorage.setItem(`blablind_player_${sid}`, who.id)
                localStorage.setItem(`blablind_secret_${sid}`, who.secret)
              }
            }
          }
          if (auth) {
            sessionStorage.setItem('userJwt', jwt)
          }
        },
        { lang, seed: SEED, jwt: DEMO_JWT, auth, as },
      )
      return ctx
    }

    type Goto = (url: string, wait?: number) => Promise<void>

    const shot = async (
      name: string,
      ctxOpts: { auth?: boolean; as?: string },
      fn: (page: Page, goto: Goto) => Promise<void>,
    ) => {
      if (ONLY.length && !ONLY.includes(name)) {
        return
      }
      const ctx = await makeCtx(ctxOpts)
      const page = await ctx.newPage()
      const goto: Goto = async (url, wait = 1500) => {
        await page.goto(APP + url, { waitUntil: 'domcontentloaded' })
        // The Astro dev toolbar overlays the bottom of every dev-server page.
        await page
          .addStyleTag({ content: 'astro-dev-toolbar { display: none !important }' })
          .catch(() => {})
        await sleep(wait)
      }
      try {
        await fn(page, goto)
        await page.screenshot({ path: path.join(dir, `${name}.png`) })
        done.push(name)
      } catch (e: any) {
        failed.push(`${name}: ${String(e.message).split('\n')[0]!.slice(0, 110)}`)
      } finally {
        await ctx.close()
      }
    }

    const sessionName = lang === 'fr' ? 'Soirée 90s' : '90s Night'
    /** Modals are <dialog class="modal">; scope to the open one so fills don't
     *  land on the identically-typed inputs of the page underneath. */
    const modal = (p: Page) => p.locator('dialog[open]')

    /**
     * Assert what the shot is supposed to show before taking it. Without this a
     * click that quietly did nothing — a modal that never opened, a lazily
     * imported widget that 504'd — yields a plausible-looking screenshot of the
     * wrong screen, and nothing tells you.
     */
    const expectVisible = (p: Page, selector: string) =>
      p.locator(selector).first().waitFor({ state: 'visible', timeout: 15_000 })

    /** Member-area views render a spinner first; wait it out before shooting. */
    const settled = async (p: Page) => {
      await p
        .locator('.loading')
        .first()
        .waitFor({ state: 'hidden', timeout: 15_000 })
        .catch(() => {})
      await expectVisible(p, 'h1, h2, h3')
    }
    const openWizard = async (p: Page) => {
      await p
        .getByRole('button', { name: t('home.create_button'), exact: true })
        .first()
        .click()
      await modal(p).waitFor({ state: 'visible' })
      await sleep(700)
    }
    const wizardNext = async (p: Page) => {
      await modal(p)
        .getByRole('button', { name: t('wizard.next') })
        .click()
      await sleep(700)
    }

    // ── site & sign-up (anonymous) ──────────────────────────────────────────
    await shot('home-actions', {}, async (p, goto) => {
      await goto('/', 2200)
      await p
        .getByRole('button', { name: t('home.create_button'), exact: true })
        .first()
        .scrollIntoViewIfNeeded()
      await expectVisible(p, `input[placeholder="${t('home.join_placeholder')}"]`)
      await sleep(600)
    })

    await shot('login', {}, async (p, goto) => {
      await goto('/')
      await p.click('[data-testid="login-open"]')
      await expectVisible(p, 'dialog[open]')
      await sleep(900)
    })

    await shot('signup', {}, async (p, goto) => {
      await goto('/')
      await p.click('[data-testid="login-open"]')
      await sleep(600)
      await p
        .getByRole('button', { name: t('signup.button'), exact: true })
        .first()
        .click()
      await sleep(800)
      await modal(p)
        .locator('input[type="text"]')
        .first()
        .fill(lang === 'fr' ? 'Léa' : 'Lea')
      await modal(p).locator('input[type="email"]').first().fill('lea@example.com')
      await expectVisible(p, 'dialog[open] input[type="password"]')
      await sleep(400)
    })

    // ── creating a blindtest ────────────────────────────────────────────────
    await shot('wizard-mode', {}, async (p, goto) => {
      await goto('/')
      await openWizard(p)
    })

    await shot('wizard-name', {}, async (p, goto) => {
      await goto('/')
      await openWizard(p)
      await wizardNext(p)
      await modal(p).locator('input[type="text"]').first().fill(sessionName)
      await sleep(500)
    })

    await shot('wizard-settings', {}, async (p, goto) => {
      await goto('/')
      await openWizard(p)
      await wizardNext(p)
      await modal(p).locator('input[type="text"]').first().fill(sessionName)
      await sleep(400)
      await wizardNext(p)
      await sleep(500)
    })

    // ── inviting and joining ────────────────────────────────────────────────
    await shot('join', {}, async (_p, goto) => {
      await goto(`/${SEED.lobbySlug}`, 2000)
    })

    await refreshPresence()
    await shot('lobby', { auth: true, as: 'lea' }, async (_p, goto) => {
      await goto(`/${SEED.lobbySlug}`, 2200)
    })

    await shot('share', { auth: true, as: 'lea' }, async (p, goto) => {
      await goto(`/${SEED.lobbySlug}`, 2200)
      await p
        .locator(`button[title="${t('room.menu')}"]`)
        .first()
        .click()
      await sleep(500)
      await p
        .getByRole('button', { name: t('share.title') })
        .first()
        .click()
      // The QR itself comes from a dynamically imported renderer, so the dialog
      // can open empty (a stale Vite dep cache 504s the import). Wait for the
      // drawn code — otherwise this shot silently captures a QR-less dialog.
      await p.locator('dialog.modal-open canvas, dialog.modal-open svg').first().waitFor({
        state: 'visible',
        timeout: 15_000,
      })
      await sleep(600)
    })

    await shot('add-track', { auth: true, as: 'lea' }, async (p, goto) => {
      await goto(`/${SEED.lobbySlug}`, 2200)
      await p
        .getByRole('button', { name: t('room.add_track_button') })
        .first()
        .click()
      // The add-track modal is a plain fixed overlay, not a <dialog>.
      await expectVisible(p, `input[placeholder="${t('search.placeholder')}"]`)
      await p.getByPlaceholder(t('search.placeholder')).first().fill('queen bohemian rhapsody')
      await p.keyboard.press('Enter')
      // Results carry a thumbnail; without one the search returned nothing and
      // the shot would show an empty modal.
      await expectVisible(p, 'img[src*="img.youtube.com"]')
      await sleep(1500)
    })

    await shot('add-track-youtube', { auth: true, as: 'lea' }, async (p, goto) => {
      await goto(`/${SEED.lobbySlug}`, 2200)
      await p
        .getByRole('button', { name: t('room.add_track_button') })
        .first()
        .click()
      await expectVisible(p, `input[placeholder="${t('search.placeholder')}"]`)
      await p.getByPlaceholder(t('search.placeholder')).first().fill('queen bohemian rhapsody')
      await p.keyboard.press('Enter')
      await expectVisible(p, 'img[src*="img.youtube.com"]')
      // The widen-to-YouTube button only exists once the library has answered.
      await p
        .getByRole('button', { name: t('search.youtube_button') })
        .first()
        .click()
      await expectVisible(p, `text=${t('search.youtube_label')}`)
      await sleep(2500)
    })

    // ── playing ─────────────────────────────────────────────────────────────
    await refreshPresence()
    await clearBuzzes()
    // Léa is the host but not the DJ, so this is what an ordinary player sees.
    await shot('playing', { auth: true, as: 'lea' }, async (p, goto) => {
      await goto(`/${SEED.gameSlug}`, 2600)
      await expectVisible(p, '[data-testid="buzz-button"]')
      await expectVisible(p, `text=${t('room.irl_music_on', { player: 'Tom' })}`)
    })

    await shot('dj', { auth: true, as: 'lea' }, async (p, goto) => {
      await goto(`/${SEED.gameSlug}`, 2600)
      await p
        .locator(`button[title="${t('room.menu')}"]`)
        .first()
        .click()
      await sleep(500)
      await p
        .getByRole('button', { name: t('room.roles_title') })
        .first()
        .click()
      await expectVisible(p, `text=${t('room.become_dj')}`)
      await sleep(800)
    })

    await shot('buzz', { auth: true, as: 'lea' }, async (p, goto) => {
      await goto(`/${SEED.gameSlug}`, 2600)
      await p.locator('[data-testid="buzz-button"]').first().click()
      // IRL buzzes submit on the spot — no text box, the answer is spoken. The
      // "your turn to speak" overlay fades in over 0.3s and is gone after 2s.
      await expectVisible(p, `text=${t('room.buzz_won')}`)
      await sleep(500)
    })

    // Tom owns the playing track, so he is the one who validates Sarah's buzz.
    await armBuzz()
    await refreshPresence()
    await shot('validate', { as: 'tom' }, async (p, goto) => {
      await goto(`/${SEED.gameSlug}`, 2800)
      await expectVisible(p, '[data-testid="validate-correct"]')
    })
    await clearBuzzes()

    await shot('scores', { auth: true, as: 'lea' }, async (p, goto) => {
      await goto(`/${SEED.gameSlug}`, 2600)
      await p
        .getByRole('button', { name: t('room.tab_scores') })
        .first()
        .click()
      await expectVisible(p, `button.bg-base-100:has-text("${t('room.tab_scores')}")`)
      await sleep(1000)
    })

    await refreshPresence()
    await shot('gameover', { auth: true, as: 'lea' }, async (p, goto) => {
      await goto(`/${SEED.overSlug}`, 2800)
      await expectVisible(p, `text=${t('gameover.title')}`)
    })

    // ── member area ─────────────────────────────────────────────────────────
    const member = { auth: true }
    await shot('profile', member, async (p, goto) => {
      await goto('/profile/', 2200)
      await settled(p)
    })
    await shot('blindtests', member, async (p, goto) => {
      await goto('/profile/blindtests', 2400)
      await settled(p)
    })
    await shot('playlists', member, async (p, goto) => {
      await goto('/profile/playlists', 2400)
      await settled(p)
    })
    await shot('playlist-editor', member, async (p, goto) => {
      await goto(`/profile/playlists/${PLAYLIST_ID}`, 2600)
      await expectVisible(p, 'input[type="text"]')
    })
    await shot('favorites', member, async (p, goto) => {
      await goto('/profile/favorites', 2600)
      await settled(p)
    })
    await shot('settings', member, async (p, goto) => {
      await goto('/profile/settings', 2400)
      await settled(p)
    })

    console.log(
      `${lang}/${vpName}: ${done.length} ok${failed.length ? `, ${failed.length} failed` : ''}`,
    )
    for (const f of failed) {
      console.log(`   ✗ ${f}`)
    }
    await browser.close()
  }
}
