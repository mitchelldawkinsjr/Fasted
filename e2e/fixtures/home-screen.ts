import type { Page } from '@playwright/test';

/** Dismiss the product tour when it blocks the home screen. */
async function dismissTourIfShown(page: Page): Promise<void> {
  const tour = page.getByRole('dialog', { name: /welcome to fasted/i });
  if (!(await tour.isVisible().catch(() => false))) return;
  await tour.getByRole('button', { name: 'Skip tour' }).click();
  await tour.waitFor({ state: 'hidden', timeout: 5000 });
}

/** Complete the daily welcome check-in when it appears on the home screen. */
export async function completeDailyWelcomeIfShown(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await dismissTourIfShown(page);

  const welcome = page.getByTestId('daily-welcome-checkin');
  if (!(await welcome.isVisible().catch(() => false))) return;

  await dismissTourIfShown(page);

  await page.getByRole('radio', { name: 'Peaceful' }).click();
  await page.getByRole('radio', { name: 'Fully committed' }).click();
  await page.getByRole('button', { name: 'Hungry' }).click();
  await page.getByRole('button', { name: 'Grow closer to God' }).click();
  await page.getByTestId('home-welcome-header').waitFor({ state: 'visible' });
}

/** Open the guided journey flow and advance to the morning reflection step. */
export async function openGuidedJourneyToReflection(page: Page): Promise<void> {
  await completeDailyWelcomeIfShown(page);
  await page.getByTestId('begin-journey-btn').click();
  await page.getByTestId('guided-journey-flow').waitFor({ state: 'visible' });

  for (let i = 0; i < 3; i += 1) {
    await page.getByTestId('guided-journey-continue').click();
  }

  await page.locator('#daily-reflection').waitFor({ state: 'visible' });
}

/** Legacy alias: scroll/open path to daily reflection from the home screen. */
export async function openDailyReflectionFromHome(page: Page): Promise<void> {
  await openGuidedJourneyToReflection(page);
}
