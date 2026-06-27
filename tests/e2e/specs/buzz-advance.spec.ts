import { test, expect, type Browser, type Page } from '@playwright/test'
import { ytStubInitScript } from '../helpers/yt-stub'
import {
  seedAdvanceScenario,
  cleanup,
  getTrack,
  type Scenario,
  type SeededPlayer,
} from '../helpers/seed'

/**
 * Realtime convergence POC: 3 browser contexts (host + 2 players) share one
 * PocketBase session over SSE. Alice buzzes, the host validates, and because
 * `continue_after_success` is off the host must advance to the next track —
 * exactly once. Verifies the watcher chain (buzz → solved_by → advanceFrom)
 * converges across all clients and never double-advances.
 */

// Opens a page already "joined" as the given player by priming the localStorage
// keys App.vue.restorePlayer reads, plus stubbing the YouTube player.
async function openPlayer(browser: Browser, scenario: Scenario, player: SeededPlayer): Promise<Page> {
  const context = await browser.newContext()
  await context.addInitScript(ytStubInitScript)
  await context.addInitScript(
    ([sid, pid, secret]) => {
      localStorage.setItem(`blablind_player_${sid}`, pid)
      localStorage.setItem(`blablind_secret_${sid}`, secret)
    },
    [scenario.sessionId, player.id, player.secret] as const,
  )
  const page = await context.newPage()
  await page.goto(`/${scenario.slug}`)
  // Room is mounted once the header shows the session name.
  await expect(page.getByRole('heading', { name: 'E2E Room' })).toBeVisible({ timeout: 15_000 })
  return page
}

test('correct answer makes the host advance to the next track, once, for everyone', async ({ browser }) => {
  const scenario = await seedAdvanceScenario()

  let hostPage: Page | undefined
  let alicePage: Page | undefined
  let bobPage: Page | undefined

  try {
    hostPage = await openPlayer(browser, scenario, scenario.host)
    alicePage = await openPlayer(browser, scenario, scenario.alice)
    bobPage = await openPlayer(browser, scenario, scenario.bob)

    // Alice buzzes. The big buzz button appears once the (stubbed) player reports
    // playing and unlocks the audio overlay.
    const buzzButton = alicePage.getByTestId('buzz-button')
    await expect(buzzButton).toBeVisible({ timeout: 15_000 })
    await buzzButton.click()
    await alicePage.getByTestId('buzz-answer').fill('Never Gonna Give You Up')
    await alicePage.getByTestId('buzz-send').click()

    // The host (track owner) sees the validation panel and accepts the answer.
    const validate = hostPage.getByTestId('validate-correct')
    await expect(validate).toBeVisible({ timeout: 15_000 })
    await validate.click()

    // Convergence (server-side oracle): track1 done, track2 now playing.
    await expect.poll(async () => (await getTrack(scenario.track1Id)).status, { timeout: 15_000 })
      .toBe('done')
    await expect.poll(async () => (await getTrack(scenario.track2Id)).status, { timeout: 15_000 })
      .toBe('playing')

    // No double-advance: track2 must still be playing (not skipped past to done).
    await alicePage.waitForTimeout(2_000)
    expect((await getTrack(scenario.track2Id)).status).toBe('playing')

    // Convergence (clients): every context shows exactly one done track.
    for (const page of [hostPage, alicePage, bobPage]) {
      await expect(page.getByTestId('done-count')).toHaveText('1', { timeout: 15_000 })
    }
  } finally {
    await cleanup(scenario)
  }
})
