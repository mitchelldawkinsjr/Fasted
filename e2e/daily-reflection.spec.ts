import { expect, test } from '@playwright/test';
import { TOUR_DISMISSED } from './fixtures/constants';
import { completeDailyWelcomeIfShown, openGuidedJourneyToReflection, advanceGuidedReflectionToCheckIn } from './fixtures/home-screen';

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

  await openGuidedJourneyToReflection(page);

  await expect(page.getByTestId('guided-daily-reflection')).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: "What do I get from today's meditation?" }),
  ).toBeVisible();

  await page
    .getByRole('textbox', { name: "What do I get from today's meditation?" })
    .fill('Morning insight on Today page');
  await page.getByTestId('guided-reflection-continue').click();
  await page.getByTestId('guided-reflection-continue').click();
  await page.getByRole('radio', { name: 'Good' }).click();
  await page.getByTestId('guided-reflection-continue').click();
  await page.getByTestId('guided-reflection-continue').click();
  await page
    .getByRole('textbox', { name: 'What are you grateful for today?' })
    .fill('Stayed faithful with water only');
  await page.getByTestId('guided-reflection-continue').click();
  await page.getByTestId('guided-reflection-continue').click();
  await expect(page.getByTestId('prayer-focus-step')).toBeVisible();
  await page.getByTestId('guided-reflection-continue').click();

  await page.getByRole('checkbox', { name: /follow today's fasting plan/i }).check();
  await page.getByRole('checkbox', { name: /pray over today's focus/i }).check();

  await page.getByRole('button', { name: 'Save Reflection & Check-In' }).click();

  await expect(page.getByTestId('morning-reflection-complete')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Close guided journey' }).click();
  await expect(page.getByText('Checked In', { exact: true })).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored?.journalEntries).toHaveLength(1);
  expect(stored.journalEntries[0].type).toBe('daily-reflection');
  expect(stored.journalEntries[0].dayMood).toBe('good');
  expect(stored.journalEntries[0].godTeaching).toBe('Morning insight on Today page');
  expect(stored.journalEntries[0].victory).toBe('Stayed faithful with water only');
  expect(stored.journalEntries[0].prayerFocus).toBe('');
  expect(stored.checkIns).toHaveLength(1);
  expect(stored.checkIns[0].followedPlan).toBe(true);
  expect(stored.checkIns[0].prayedFocus).toBe(true);
  expect(stored.checkIns[0].journaled).toBe(true);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await completeDailyWelcomeIfShown(page);
  await expect(page.getByText("Today's journey complete")).toBeVisible();
  await expect(page.getByText('Checked In', { exact: true })).toBeVisible();
});

test('requires reflection content before saving check-in', async ({ page }) => {
  await page.goto('/?date=2026-06-27');
  await page.waitForLoadState('networkidle');

  await openGuidedJourneyToReflection(page);

  await advanceGuidedReflectionToCheckIn(page);
  await page.getByRole('checkbox', { name: /follow today's fasting plan/i }).check();
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

  await openGuidedJourneyToReflection(page);
  await expect(page.locator('#daily-reflection')).toBeInViewport();
});

test('other reflection links still navigate to journal', async ({ page }) => {
  await page.goto('/?date=2026-06-27');
  await page.waitForLoadState('networkidle');
  await completeDailyWelcomeIfShown(page);

  await page.getByRole('link', { name: 'Prayer', exact: true }).click();
  await expect(page).toHaveURL('/journal?type=prayer');
  await expect(page.getByRole('button', { name: 'Prayer', exact: true })).toHaveClass(/bg-primary/);
});
