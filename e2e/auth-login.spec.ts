import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'fasted-calendar-progress:guest';

test.beforeEach(async ({ page }) => {
  await page.goto('/settings');
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
  }, STORAGE_KEY);
  await page.reload();
});

test('shows a friendly network error instead of "Load failed" on sign in', async ({ page }) => {
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    await route.abort('failed');
  });

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password1234');
  await page.locator('button[type="submit"]').click();

  await expect(
    page.getByText('Could not reach the server. Check your connection and try again.'),
  ).toBeVisible();
  await expect(page.getByText('Load failed')).toHaveCount(0);
});

test('shows invalid credentials message for bad login', async ({ page }) => {
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Invalid login credentials',
      }),
    });
  });

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('wrong-password');
  await page.locator('button[type="submit"]').click();

  await expect(page.getByText('Incorrect email or password. Please try again.')).toBeVisible();
});
