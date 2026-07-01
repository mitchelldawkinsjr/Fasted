import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_KEY = 'fasted-calendar-progress:guest';
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'issue-12');

function buildProgress(checkInDates: string[], checkInStreak: number) {
  return {
    checkIns: checkInDates.map((date) => ({
      date,
      followedPlan: true,
      prayedFocus: true,
      readScripture: true,
      journaled: true,
      win: 'Stayed faithful today.',
      completedAt: `${date}T20:00:00.000Z`,
    })),
    checkInStreak,
    journalEntries: [],
    badges: [],
    settings: {
      reminderTime: '07:00',
      theme: 'light',
      scriptureNote: 'Seed data for streak screenshots.',
    },
    activeJourneyId: 'fasted-journey',
    updatedAt: new Date().toISOString(),
  };
}

async function seedProgress(page: Page, checkInDates: string[], checkInStreak: number) {
  await page.goto('/');
  await page.evaluate(
    ({ key, progress }) => {
      localStorage.setItem(key, JSON.stringify(progress));
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    },
    { key: STORAGE_KEY, progress: buildProgress(checkInDates, checkInStreak) },
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('check-in streak', () => {
  test.beforeAll(() => {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  });

  test('shows prior streak before today check-in and updates after save', async ({ page }) => {
    await seedProgress(page, ['2026-06-25', '2026-06-26'], 2);
    await page.goto('/?date=2026-06-27');
    await page.waitForLoadState('networkidle');

    const streakLabel = page.getByText('CHECK-IN STREAK').locator('..');
    await expect(streakLabel).toContainText('2');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'today-before-checkin.png'), fullPage: true });

    await page.getByRole('button', { name: 'Check-in for Today' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByText('Check-in streak', { exact: true })).toBeVisible();
    await expect(modal.getByText('2 consecutive days')).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'checkin-modal-before-save.png'), fullPage: true });

    await modal.getByRole('button', { name: 'Save Check-In' }).click();
    await expect(modal.getByText('3 consecutive check-in days.')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'checkin-modal-celebration.png'), fullPage: true });

    await expect(modal.getByRole('button', { name: 'Continue' })).toBeEnabled({ timeout: 3000 });
    await modal.getByRole('button', { name: 'Continue' }).click();
    await expect(modal).toBeHidden();
    await expect(streakLabel).toContainText('3');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'today-after-checkin.png'), fullPage: true });
  });

  test('resets streak after a missed day', async ({ page }) => {
    await seedProgress(page, ['2026-06-24', '2026-06-25'], 2);
    await page.goto('/?date=2026-06-27');
    await page.waitForLoadState('networkidle');

    const streakLabel = page.getByText('CHECK-IN STREAK').locator('..');
    await expect(streakLabel).toContainText('0');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'streak-reset-after-gap.png'), fullPage: true });
  });

  test('progress page reflects current streak', async ({ page }) => {
    await seedProgress(page, ['2026-06-25', '2026-06-26'], 2);
    await page.goto('/progress');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel('Progress summary')).toContainText('2');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'progress-page-streak.png'), fullPage: true });
  });
});
