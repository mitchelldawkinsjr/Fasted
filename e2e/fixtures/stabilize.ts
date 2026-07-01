import type { Page } from '@playwright/test';
import { FIXED_DATE } from './constants';
import { seedProgress, type SeedStateName } from './seed-states';

export async function preparePage(
  page: Page,
  options: {
    path?: string;
    state?: SeedStateName;
    date?: string;
  } = {},
) {
  const { path = '/', state = 'empty', date = FIXED_DATE } = options;

  await seedProgress(page, state);
  await page.clock.install({ time: new Date(`${date}T12:00:00.000Z`) });

  const url = date && path === '/' ? `/?date=${date}` : path;
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

export const screenshotOptions = {
  fullPage: false,
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.01,
};
