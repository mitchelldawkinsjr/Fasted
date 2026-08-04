import { expect, test } from '@playwright/test';
import { preparePage, screenshotOptions } from '../fixtures/stabilize';
import { mockSupabaseOffline } from '../fixtures/supabase-mock';

test.describe('Auth visual baselines', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseOffline(page);
  });

  test('Facebook OAuth button — disabled', async ({ page }) => {
    await preparePage(page, { path: '/settings#account-sign-in' });
    const facebookButton = page.getByRole('button', { name: 'Continue with Facebook' });
    await expect(facebookButton).toBeVisible();
    await expect(facebookButton).toBeDisabled();
    await expect(facebookButton).toHaveScreenshot('FacebookOAuth-disabled.png', screenshotOptions);
  });
});
