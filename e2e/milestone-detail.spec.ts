import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { FIXED_DATE, INSTALL_TOAST_KEY, STORAGE_KEY } from './fixtures/constants';
import { SEED_STATES } from './fixtures/seed-states';

const ARTIFACT_DIR_108 = path.join(process.cwd(), 'artifacts', 'issue-108');
const ARTIFACT_DIR_117 = path.join(process.cwd(), 'artifacts', 'issue-117');

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
    fs.mkdirSync(ARTIFACT_DIR_108, { recursive: true });
    fs.mkdirSync(ARTIFACT_DIR_117, { recursive: true });
  });

  test('shows Day labels on daily commitment and opens milestone detail', async ({ page }) => {
    await seedPage(page);
    await page.goto(`/?date=${FIXED_DATE}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /Day 7:/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Day 14:/ })).toBeVisible();
    await expect(page.getByText('Next milestone ·')).toHaveCount(0);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR_108, 'daily-commitment-milestones.png'),
      fullPage: true,
    });

    await page.getByRole('link', { name: /Day 7:/ }).click();
    await expect(page).toHaveURL(/\/progress\/milestones\/phase-1-milestone-7$/);
    await expect(page.getByRole('heading', { name: 'Week of Dedication' })).toBeVisible();
    await expect(page.getByText('Not yet earned')).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR_108, 'milestone-detail-unearned.png'),
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
      path: path.join(ARTIFACT_DIR_108, 'milestone-detail-earned.png'),
      fullPage: true,
    });
  });

  test('shows earned badges in full color on badge gallery', async ({ page }) => {
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
    await page.goto('/progress/badges');

    const earnedBadge = page
      .locator('figure')
      .filter({ hasText: 'Week of Dedication' })
      .locator('img');
    const lockedBadge = page
      .locator('figure')
      .filter({ hasText: 'Steadfast Heart' })
      .locator('img');

    await expect(earnedBadge).not.toHaveClass(/badge-locked/);
    await expect(lockedBadge).toHaveClass(/badge-locked/);
  });

  test('navigates from sacred milestones on progress page to milestone detail', async ({
    page,
  }) => {
    await seedPage(page);
    await page.goto('/progress');
    await page.waitForLoadState('networkidle');

    const badgeWall = page.locator('section[aria-labelledby="badges-heading"]');
    await expect(badgeWall.getByRole('heading', { name: 'Sacred Milestones' })).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR_117, 'progress-sacred-milestones.png'),
      fullPage: true,
    });

    const phaseMilestone = badgeWall.getByRole('link', {
      name: /Week of Dedication, not yet earned/,
    });
    await expect(phaseMilestone).toBeVisible();
    await phaseMilestone.click();

    await expect(page).toHaveURL(/\/progress\/milestones\/phase-1-milestone-7$/);
    await expect(page.getByRole('heading', { name: 'Week of Dedication' })).toBeVisible();
    await expect(page.getByText('Not yet earned')).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR_117, 'sacred-milestone-detail-unearned.png'),
      fullPage: true,
    });

    await page.goto('/progress');
    await badgeWall.getByRole('link', { name: /7-Day Streak, not yet earned/ }).click();
    await expect(page).toHaveURL(/\/progress\/milestones\/streak-7$/);
    await expect(page.getByRole('heading', { name: '7-Day Streak' })).toBeVisible();
    await expect(page.getByText('Not yet earned')).toBeVisible();
  });

  test('shows earned state for sacred milestone clicked from progress page', async ({ page }) => {
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
    await page.goto('/progress');
    const badgeWall = page.locator('section[aria-labelledby="badges-heading"]');
    await badgeWall.getByRole('link', { name: /Week of Dedication, earned/ }).click();

    await expect(page).toHaveURL(/\/progress\/milestones\/phase-1-milestone-7$/);
    await expect(page.getByText('Earned')).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR_117, 'sacred-milestone-detail-earned.png'),
      fullPage: true,
    });
  });
});
