import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { FIXED_DATE, INSTALL_TOAST_KEY, STORAGE_KEY } from './fixtures/constants';
import { SEED_STATES } from './fixtures/seed-states';

const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'issue-108');

async function seedPage(page: Page, progress = SEED_STATES.rich) {
  await page.goto('/');
  await page.evaluate(
    ({ key, seededProgress, toastKey }) => {
      localStorage.setItem(key, JSON.stringify(seededProgress));
      localStorage.setItem(toastKey, '1');
    },
    { key: STORAGE_KEY, seededProgress: progress, toastKey: INSTALL_TOAST_KEY },
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('milestone detail navigation', () => {
  test.beforeAll(() => {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  });

  test('shows Day labels on daily commitment and opens milestone detail', async ({ page }) => {
    await seedPage(page);
    await page.goto(`/?date=${FIXED_DATE}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /Day 7:/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Day 14:/ })).toBeVisible();
    await expect(page.getByText('Next milestone ·')).toHaveCount(0);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'daily-commitment-milestones.png'),
      fullPage: true,
    });

    await page.getByRole('link', { name: /Day 7:/ }).click();
    await expect(page).toHaveURL(/\/progress\/milestones\/phase-1-milestone-7$/);
    await expect(page.getByRole('heading', { name: 'Week of Dedication' })).toBeVisible();
    await expect(page.getByText('Not yet earned')).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'milestone-detail-unearned.png'),
      fullPage: true,
    });
  });

  test('shows earned state on milestone detail when badge is earned', async ({ page }) => {
    const earnedProgress = {
      ...SEED_STATES.rich,
      badges: [
        {
          id: 'phase-1-milestone-7',
          title: 'Week of Dedication',
          description: 'Seven faithful check-ins in Phase 1.',
          phaseId: 1,
          earnedAt: `${FIXED_DATE}T12:00:00.000Z`,
        },
      ],
    };

    await seedPage(page, earnedProgress);

    await page.goto(`/progress/milestones/phase-1-milestone-7`);
    await expect(page.getByText('Earned')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Week of Dedication' })).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'milestone-detail-earned.png'),
      fullPage: true,
    });
  });
});
