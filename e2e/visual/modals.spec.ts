import { expect, test } from '@playwright/test';
import { FIXED_DATE } from '../fixtures/constants';
import { preparePage, screenshotOptions } from '../fixtures/stabilize';
import { mockSupabaseOffline } from '../fixtures/supabase-mock';

test.describe('Modal visual baselines', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseOffline(page);
  });

  test('CheckInModal — streakReady', async ({ page }) => {
    await preparePage(page, { state: 'streakReady', date: FIXED_DATE });
    await page.getByRole('button', { name: /check.?in for today/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveScreenshot('CheckInModal-streakReady.png', screenshotOptions);
  });

  test('JournalEditor — worstCase', async ({ page }) => {
    await preparePage(page, { state: 'worstCase', path: '/journal', date: FIXED_DATE });
    await page.getByRole('button', { name: '+ New' }).click();
    await expect(page.getByRole('button', { name: 'Save Entry' })).toBeVisible();
    await expect(page).toHaveScreenshot('JournalEditor-worstCase.png', screenshotOptions);
  });

  test('JournalViewer — worstCase', async ({ page }) => {
    await preparePage(page, { state: 'worstCase', path: '/journal', date: FIXED_DATE });
    await page.getByRole('button', { name: /View reflection from/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Reflection' })).toBeVisible();
    await expect(page).toHaveScreenshot('JournalViewer-worstCase.png', screenshotOptions);
  });
});
