import { expect, test } from '@playwright/test';
import * as path from 'path';
import { TOUR_DISMISSED } from './fixtures/constants';

const STORAGE_KEY = 'fasted-calendar-progress:guest';
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'issue-159');

test.describe('Today phase overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ key, tourFlags }) => {
        localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
        localStorage.setItem(
          key,
          JSON.stringify({
            ...tourFlags,
            checkIns: [],
            journalEntries: [],
            badges: [],
            settings: { reminderTime: '07:00', theme: 'light' },
            activeJourneyId: 'fasted-journey',
          }),
        );
      },
      { key: STORAGE_KEY, tourFlags: TOUR_DISMISSED },
    );
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
    await expect(panel).toHaveCount(0);

    await toggle.click();

    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toContainText('Phase Overview');
    await expect(panel).toContainText('2 Samuel 12:16');
    await expect(panel).toContainText('Schedule');
    await expect(panel).toContainText('Prayer Focus');
    await expect(panel).toContainText('Healing');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'today-overview-expanded-mobile.png'),
      fullPage: true,
    });

    await page.getByTestId('phase-overview-close').click();

    await expect(panel).toHaveCount(0);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(panel).toBeVisible();
    await toggle.click();
    await expect(panel).toHaveCount(0);
  });
});
