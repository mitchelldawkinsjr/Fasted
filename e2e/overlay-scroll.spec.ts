import { expect, test } from '@playwright/test';
import { FIXED_DATE } from './fixtures/constants';
import { detectOverflow, hasOverflowIssues } from './fixtures/overflow';
import {
  expectAboveMainNav,
  expectNotCoveredByNav,
  isFullyInViewport,
  MAIN_NAV,
} from './fixtures/nav-overlap';
import { MAIN_ROUTES } from './fixtures/routes';
import { preparePage } from './fixtures/stabilize';
import { mockSupabaseOffline } from './fixtures/supabase-mock';
import { MOBILE_SMOKE_VIEWPORTS } from './fixtures/viewports';

test.describe('Mobile overlay and scroll smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseOffline(page);
  });

  for (const viewport of MOBILE_SMOKE_VIEWPORTS) {
    test(`no horizontal page scroll on main routes (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await preparePage(page, { state: 'rich', date: FIXED_DATE });

      for (const route of MAIN_ROUTES) {
        await page.goto(route.path === '/' ? `/?date=${FIXED_DATE}` : route.path);
        await page.waitForLoadState('networkidle');

        const viewportWidth = await page.evaluate(() => window.innerWidth);
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(
          scrollWidth,
          `${route.label} should not scroll horizontally on ${viewport.name}`,
        ).toBeLessThanOrEqual(viewportWidth + 2);
      }
    });
  }

  test('daily reflection save button is visible without overlapping nav (iphone-se)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await preparePage(page, { state: 'streakReady', date: FIXED_DATE });

    await page.getByRole('button', { name: /check.?in for today/i }).click();
    await expect(page.locator('#daily-reflection')).toBeInViewport();

    const saveBtn = page.getByRole('button', { name: 'Save Reflection & Check-In' });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeInViewport();
    await saveBtn.click({ trial: true });
    await expectAboveMainNav(page, saveBtn, 'Daily reflection save');
    await expectNotCoveredByNav(page, saveBtn, 'Daily reflection save');
  });

  test('daily reflection mood picker is not covered by nav after scrolling into view (iphone-se)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await preparePage(page, { state: 'streakReady', date: FIXED_DATE });

    await page.getByRole('button', { name: /check.?in for today/i }).click();
    await expect(page.locator('#daily-reflection')).toBeInViewport();

    const moodGroup = page.getByRole('radiogroup', { name: 'How did today feel?' });
    await expect(moodGroup).toBeVisible();
    await expectNotCoveredByNav(page, moodGroup, 'Daily reflection mood picker');
  });

  test('journal save bar is visible without scrolling on small phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await preparePage(page, { state: 'rich', path: '/journal' });

    await page.getByRole('button', { name: '+ New' }).click();
    const saveBtn = page.getByRole('button', { name: 'Save Entry' });

    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeInViewport();
    expect(await isFullyInViewport(saveBtn)).toBe(true);
    await expectAboveMainNav(page, saveBtn, 'Journal Save Entry');
    await expectNotCoveredByNav(page, saveBtn, 'Journal Save Entry');
  });

  test('journal mood picker is not covered by nav at initial scroll (iphone-se)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await preparePage(page, { state: 'rich', path: '/journal' });

    await page.getByRole('button', { name: '+ New' }).click();
    await page.evaluate(() => window.scrollTo(0, 0));

    const moodGroup = page.getByRole('radiogroup', { name: 'How did today feel?' });
    await expect(moodGroup).toBeVisible();
    await expectNotCoveredByNav(page, moodGroup, 'Mood picker');
  });

  test('worst-case content passes overflow check on iphone-13 main routes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await preparePage(page, { state: 'worstCase', date: FIXED_DATE });

    const smokeRoutes = MAIN_ROUTES.filter((r) => r.path !== '/progress/badges');

    const failures: string[] = [];
    for (const route of smokeRoutes) {
      await page.goto(route.path === '/' ? `/?date=${FIXED_DATE}` : route.path);
      await page.waitForLoadState('networkidle');
      const issues = await detectOverflow(page);
      if (hasOverflowIssues(issues)) {
        failures.push(route.label);
      }
    }

    expect(failures, `Overflow on routes: ${failures.join(', ')}`).toEqual([]);
  });
});
