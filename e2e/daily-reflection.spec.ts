import { expect, test } from '@playwright/test';
import { TOUR_DISMISSED } from './fixtures/constants';

const STORAGE_KEY = 'fasted-calendar-progress:guest';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    ({ key, tourDismissed }) => {
      localStorage.setItem(key, JSON.stringify(tourDismissed));
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    },
    { key: STORAGE_KEY, tourDismissed: TOUR_DISMISSED },
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
});

test('saves daily reflection and check-in together from Today page', async ({ page }) => {
  await page.goto('/?date=2026-06-27');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Morning Reflection' })).toBeVisible();
  await expect(page.getByRole('heading', { name: "Today's Check-In" })).toBeVisible();

  await page.getByRole('checkbox', { name: /follow today's fasting plan/i }).check();
  await page.getByRole('checkbox', { name: /pray over today's focus/i }).check();
  await page.getByRole('radio', { name: 'Good' }).click();
  await page.getByRole('textbox', { name: "Today's Meditation" }).fill('Morning prayer focus on Today page');
  await page.getByRole('textbox', { name: 'Victory today' }).fill('Stayed faithful with water only');

  await page.getByRole('button', { name: 'Save Reflection & Check-In' }).click();

  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Checked In')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored?.journalEntries).toHaveLength(1);
  expect(stored.journalEntries[0].type).toBe('daily-reflection');
  expect(stored.journalEntries[0].dayMood).toBe('good');
  expect(stored.journalEntries[0].prayerFocus).toBe('Morning prayer focus on Today page');
  expect(stored.checkIns).toHaveLength(1);
  expect(stored.checkIns[0].followedPlan).toBe(true);
  expect(stored.checkIns[0].prayedFocus).toBe(true);
  expect(stored.checkIns[0].journaled).toBe(true);
});

test('requires reflection content before saving check-in', async ({ page }) => {
  await page.goto('/?date=2026-06-27');
  await page.waitForLoadState('networkidle');

  await page.getByRole('checkbox', { name: /follow today's fasting plan/i }).check();
  await page.getByRole('radio', { name: 'Good' }).click();
  await page.getByRole('button', { name: 'Save Reflection & Check-In' }).click();

  await expect(page.getByText('Write something in your reflection before saving.')).toBeVisible();
  await expect(page.getByText('Checked In')).toHaveCount(0);

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored?.checkIns ?? []).toHaveLength(0);
  expect(stored?.journalEntries ?? []).toHaveLength(0);
});

test('check-in button scrolls to daily reflection section', async ({ page }) => {
  await page.goto('/?date=2026-06-27');
  await page.waitForLoadState('networkidle');

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Check-in for Today' }).click();
  await expect(page.locator('#daily-reflection')).toBeInViewport();
});

test('other reflection links still navigate to journal', async ({ page }) => {
  await page.goto('/?date=2026-06-27');
  await page.waitForLoadState('networkidle');

  await page.getByRole('link', { name: 'Prayer' }).click();
  await expect(page).toHaveURL('/journal?type=prayer');
  await expect(page.getByRole('button', { name: 'Prayer', exact: true })).toHaveClass(/bg-primary/);
});
