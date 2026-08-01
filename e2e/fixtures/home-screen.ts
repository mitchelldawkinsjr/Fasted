import type { Page } from '@playwright/test';

/** Dismiss the product tour when it blocks the home screen. */
async function dismissTourIfShown(page: Page): Promise<void> {
  const tour = page.getByRole('dialog', { name: /welcome to fasted/i });
  if (!(await tour.isVisible().catch(() => false))) return;
  await tour.getByRole('button', { name: 'Skip tour' }).click();
  await tour.waitFor({ state: 'hidden', timeout: 5000 });
}

/** Advance past the welcome interstitial when it appears on the home screen. */
export async function completeDailyWelcomeIfShown(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await dismissTourIfShown(page);

  const interstitial = page.getByTestId('welcome-interstitial');
  if (await interstitial.isVisible().catch(() => false)) {
    await interstitial.click();
    await interstitial.waitFor({ state: 'hidden', timeout: 5000 });
  }

  await page.getByTestId('home-welcome-header').waitFor({ state: 'visible', timeout: 5000 });
  await dismissTourIfShown(page);
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

/** Advance the stepped morning reflection through journaling to the final check-in step. */
export async function advanceGuidedReflectionToCheckIn(
  page: Page,
  options?: { mood?: string },
): Promise<void> {
  const mood = options?.mood ?? 'Good';
  const continueBtn = page.getByTestId('guided-reflection-continue');

  await continueBtn.click();
  await continueBtn.click();
  await continueBtn.click();
  await page.getByRole('radio', { name: mood }).click();
  await continueBtn.click();
  await continueBtn.click();
  await continueBtn.click();
  await continueBtn.click();

  await page.getByRole('checkbox', { name: /follow today's fasting plan/i }).waitFor({ state: 'visible' });
}

/** Advance the stepped morning reflection to the mood question. */
export async function advanceGuidedReflectionToMood(page: Page): Promise<void> {
  const continueBtn = page.getByTestId('guided-reflection-continue');
  for (let i = 0; i < 3; i += 1) {
    await continueBtn.click();
  }
  await page.getByRole('radiogroup', { name: 'How did today feel?' }).waitFor({ state: 'visible' });
}
