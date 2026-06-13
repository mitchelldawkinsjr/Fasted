import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'fasted-calendar-progress:guest';

test.beforeEach(async ({ page }) => {
  await page.goto('/journal');
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
});

test('saves a new journal entry and shows it in the list', async ({ page }) => {
  await expect(page.getByText('0 reflections')).toBeVisible();

  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByLabel('Prayer point I focused on').fill('Morning prayer focus');
  await page.getByLabel('Victory today').fill('Stayed faithful with water only');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await expect(page.getByText('Reflection saved.')).toBeVisible();
  await expect(page.getByText('1 reflections')).toBeVisible();
  await expect(page.getByText('Morning prayer focus')).toBeVisible();
  await expect(page.getByText('Stayed faithful with water only')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored?.journalEntries).toHaveLength(1);
  expect(stored.journalEntries[0].prayerFocus).toBe('Morning prayer focus');
  expect(stored.journalEntries[0].victory).toBe('Stayed faithful with water only');
});

test('saved entry remains visible after clearing an active search filter', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search journal entries' }).fill('nothing-matches');
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByLabel('Victory today').fill('Visible after save');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await expect(page.getByText('1 reflections')).toBeVisible();
  await expect(page.getByText('Visible after save')).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search journal entries' })).toHaveValue('');
});

test('date stays within plan bounds on save', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  const dateInput = page.getByLabel('Date');
  await expect(dateInput).toHaveAttribute('min', '2026-06-13');
  await expect(dateInput).toHaveAttribute('max', '2026-12-19');

  await page.getByLabel('Victory today').fill('Plan date save');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].date >= '2026-06-13').toBe(true);
  expect(stored.journalEntries[0].date <= '2026-12-19').toBe(true);
});
