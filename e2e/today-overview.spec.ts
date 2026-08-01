import { expect, test } from '@playwright/test';
import * as path from 'path';
import { completeDailyWelcomeIfShown } from './fixtures/home-screen';
import { seedProgress } from './fixtures/seed-states';

const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'issue-159');

test.describe('Today phase overview', () => {
  test.beforeEach(async ({ page }) => {
    await seedProgress(page, 'empty');
  });

  test('opens and closes the phase overview on Today', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?date=2026-07-12');
    await page.waitForLoadState('networkidle');
    await completeDailyWelcomeIfShown(page);

    const fastDetailsToggle = page.getByTestId('fast-details-toggle');
    const overviewToggle = page.getByTestId('phase-overview-toggle');
    const panel = page.getByTestId('phase-overview-panel');

    await expect(fastDetailsToggle).toBeVisible();
    await fastDetailsToggle.click();
    await expect(overviewToggle).toBeVisible();
    await expect(overviewToggle).toContainText('Click for overview');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'today-overview-collapsed-mobile.png'),
      fullPage: true,
    });
    await expect(overviewToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toBeHidden();

    await overviewToggle.click();

    await expect(panel).toBeVisible();
    await expect(overviewToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toContainText('Phase Overview');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'today-overview-expanded-mobile.png'),
      fullPage: true,
    });

    await overviewToggle.click();

    await expect(panel).toBeHidden();
    await expect(overviewToggle).toHaveAttribute('aria-expanded', 'false');

    await overviewToggle.click();
    await expect(panel).toBeVisible();

    const overviewImage = page.getByTestId('phase-overview-image');
    await expect(overviewImage).toBeVisible();
    await overviewImage.click();
    const lightbox = page.getByRole('dialog', { name: /phase illustration/i });
    await expect(lightbox).toBeVisible();
    await page.getByRole('button', { name: 'Close image' }).click();
    await expect(lightbox).toBeHidden();

    await fastDetailsToggle.click();
    await expect(overviewToggle).toBeHidden();
  });
});
