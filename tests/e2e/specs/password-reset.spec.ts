import { test, expect } from '@playwright/test'
import PocketBase from 'pocketbase'
import {
  ensureAdmin,
  seedUser,
  deleteUser,
  configureMailForTests,
  restoreSettings,
  type SeededUser,
} from '../helpers/seed'
import { clearMailpit, waitForEmail, extractLinkFromEmail, mailpitUp } from '../helpers/mailpit'

/**
 * End-to-end password reset over real email (Mailpit):
 * request a link from the login modal → open the link from the caught email →
 * set a new password → confirm the new credentials actually authenticate.
 *
 * Needs superuser creds (seed user + point PB mail at Mailpit) and a running
 * Mailpit; skips cleanly otherwise.
 */

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8093'
const BASE_URL = process.env.BASE_URL || 'http://localhost:4321'
const NEW_PASSWORD = 'e2eNewPassw0rd!'

let user: SeededUser
let previousSettings: Record<string, any>
let ready = false

test.beforeAll(async () => {
  if (!(await ensureAdmin())) {
    return // ready stays false → tests skip
  }
  if (!(await mailpitUp())) {
    return
  }
  previousSettings = await configureMailForTests(BASE_URL)
  user = await seedUser()
  ready = true
})

test.afterAll(async () => {
  if (user) await deleteUser(user)
  if (previousSettings) await restoreSettings(previousSettings)
})

test('user resets password via the emailed link and can log in with it', async ({ page }) => {
  test.skip(!ready, 'Needs PB_ADMIN_* creds and a running Mailpit (see tests/e2e/README.md)')

  await clearMailpit()

  // Request the reset link from the login modal.
  await page.goto('/')
  await page.getByTestId('login-open').click()
  await page.getByTestId('forgot-link').click()
  await page.getByTestId('forgot-email').fill(user.email)
  await page.getByTestId('forgot-submit').click()
  await expect(page.getByTestId('forgot-success')).toBeVisible({ timeout: 10_000 })

  // Open the link from the caught email.
  const email = await waitForEmail(user.email)
  const link = extractLinkFromEmail(email, '/password-reset?token=')
  expect(link).toContain('/password-reset?token=')

  await page.goto(link)
  await page.getByTestId('reset-password').fill(NEW_PASSWORD)
  await page.getByTestId('reset-confirm').fill(NEW_PASSWORD)
  await page.getByTestId('reset-submit').click()
  await expect(page.getByTestId('reset-success')).toBeVisible({ timeout: 10_000 })

  // Oracle: the new password authenticates, the old one no longer does.
  const fresh = new PocketBase(PB_URL)
  await expect(fresh.collection('users').authWithPassword(user.email, NEW_PASSWORD)).resolves.toBeTruthy()

  const stale = new PocketBase(PB_URL)
  await expect(stale.collection('users').authWithPassword(user.email, user.password)).rejects.toThrow()
})
