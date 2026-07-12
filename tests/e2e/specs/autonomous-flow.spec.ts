import { test, expect, type Browser, type Page } from '@playwright/test'
import { ytStubInitScript } from '../helpers/yt-stub'
import {
  seedAutonomousScenario,
  cleanup,
  getTrack,
  getSession,
  type Scenario,
  type SeededPlayer,
} from '../helpers/seed'

/**
 * Autonomous mode happy path (remote): everyone can buzz during the window,
 * answers are typed onto the buzz, the window closes after 2s, peers vote on
 * the first buzzer's answer, the point lands on solved_by, the group advances,
 * and the session auto-finishes when the queue empties.
 */

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
  await expect(page.getByRole('heading', { name: 'E2E Auto Room' })).toBeVisible({ timeout: 15_000 })
  return page
}

test('buzz order + peer votes award the point, then the session auto-finishes', async ({ browser }) => {
  const scenario = await seedAutonomousScenario()

  let hostPage: Page | undefined
  let alicePage: Page | undefined
  let bobPage: Page | undefined

  try {
    hostPage = await openPlayer(browser, scenario, scenario.host)
    alicePage = await openPlayer(browser, scenario, scenario.alice)
    bobPage = await openPlayer(browser, scenario, scenario.bob)

    // Alice buzzes first and types her answer onto her buzz record.
    const aliceBuzz = alicePage.getByTestId('buzz-button')
    await expect(aliceBuzz).toBeVisible({ timeout: 15_000 })
    await aliceBuzz.click()
    await alicePage.getByTestId('auto-answer').fill('Never Gonna Give You Up')
    await alicePage.getByTestId('auto-answer-save').click()

    // Bob buzzes second — everyone may buzz in autonomous mode.
    const bobBuzz = bobPage.getByTestId('buzz-button')
    await expect(bobBuzz).toBeVisible({ timeout: 15_000 })
    await bobBuzz.click()

    // The 2s window closes: the host reconciler opens the voting phase and the
    // revealed answer + first candidate (Alice) appear on the voters' screens.
    const bobVoteYes = bobPage.getByTestId('auto-vote-yes')
    await expect(bobVoteYes).toBeVisible({ timeout: 15_000 })
    await expect(bobPage.getByText('Never Gonna Give You Up')).toBeVisible()

    // Candidate = Alice → voters = host + bob (2 voters, 1 yes suffices).
    await bobVoteYes.click()

    // Resolution (server oracle): Alice gets the point.
    await expect.poll(async () => (await getTrack(scenario.track1Id)).solved_by, { timeout: 15_000 })
      .toBe(scenario.alice.id)

    // Reveal phase: everyone votes to move on (unanimous skip → advance).
    for (const page of [hostPage, alicePage, bobPage]) {
      const stop = page.getByTestId('still-playing-stop')
      await expect(stop).toBeVisible({ timeout: 15_000 })
      await stop.click()
    }

    await expect.poll(async () => (await getTrack(scenario.track1Id)).status, { timeout: 15_000 })
      .toBe('done')
    await expect.poll(async () => (await getTrack(scenario.track2Id)).status, { timeout: 15_000 })
      .toBe('playing')

    // Track 2: nobody buzzes. Window closes → no-winner reveal (skip_revealed).
    await expect.poll(async () => (await getTrack(scenario.track2Id)).skip_revealed, { timeout: 15_000 })
      .toBe(true)

    // Everyone votes to move on; the queue is empty so the host auto-ends.
    for (const page of [hostPage, alicePage, bobPage]) {
      const stop = page.getByTestId('still-playing-stop')
      await expect(stop).toBeVisible({ timeout: 15_000 })
      await stop.click()
    }

    await expect.poll(async () => (await getSession(scenario.sessionId)).status, { timeout: 15_000 })
      .toBe('finished')

    // Scoring: with no track owners every done track is guessable by everyone —
    // Alice guessed 1 of 2. The podium shows her ratio.
    await expect(alicePage.getByText('50% (1/2)')).toBeVisible({ timeout: 15_000 })
  } finally {
    await cleanup(scenario)
  }
})
