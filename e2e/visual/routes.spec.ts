import { expect, test } from '@playwright/test';
import { FIXED_DATE } from '../fixtures/constants';
import { MAIN_ROUTES } from '../fixtures/routes';
import { type SeedStateName } from '../fixtures/seed-states';
import { preparePage, screenshotOptions } from '../fixtures/stabilize';
import { mockSupabaseOffline } from '../fixtures/supabase-mock';

const ROUTE_STATES: Array<{ route: (typeof MAIN_ROUTES)[number]; state: SeedStateName }> = [];

for (const route of MAIN_ROUTES) {
  ROUTE_STATES.push({ route, state: 'empty' });
  ROUTE_STATES.push({ route, state: 'rich' });
}

test.describe('Route visual baselines', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseOffline(page);
  });

  for (const { route, state } of ROUTE_STATES) {
    test(`${route.label} — ${state}`, async ({ page }) => {
      const path = route.path === '/' ? `/?date=${FIXED_DATE}` : route.path;
      await preparePage(page, { path, state, date: FIXED_DATE });
      await expect(page).toHaveScreenshot(`${route.label}-${state}.png`, screenshotOptions);
    });
  }
});
