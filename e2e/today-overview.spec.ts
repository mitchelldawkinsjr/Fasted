import { expect, test } from '@playwright/test';
import * as path from 'path';
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

    const toggle = page.getByTestId('phase-overview-toggle');
    const panel = page.getByTestId('phase-overview-panel');

    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('Click for overview');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'today-overview-collapsed-mobile.png'),
      fullPage: true,
    });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toBeHidden();

    await toggle.click();

    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toContainText('Phase Overview');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'today-overview-expanded-mobile.png'),
      fullPage: true,
    });

    await toggle.click();

    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(panel).toBeVisible();
    await toggle.click();
    await expect(panel).toBeHidden();
  });
});
