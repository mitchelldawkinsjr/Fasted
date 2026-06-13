import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'fasted-calendar-progress:guest';

async function selectTags(page: import('@playwright/test').Page, ...labels: string[]) {
  const group = page.getByRole('group', { name: 'Reflection type' });
  for (const label of labels) {
    const button = group.getByRole('button', { name: label });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/journal');
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
  }, STORAGE_KEY);
  await page.reload();
});

test('saves a new journal entry and shows it in the list', async ({ page }) => {
  await expect(page.getByText('0 reflections')).toBeVisible();

  await page.getByRole('button', { name: '+ New' }).click();
  await selectTags(page, 'Prayer', 'Victory');
  await page.getByLabel('Prayer point I focused on').fill('Morning prayer focus');
  await page.getByLabel('Victory today').fill('Stayed faithful with water only');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await expect(page.getByText('Reflection saved.')).toBeVisible();
  await expect(page.getByText('1 reflections')).toBeVisible();
  await expect(page.getByText('Morning prayer focus')).toBeVisible();
  await expect(page.getByText('Stayed faithful with water only')).toBeVisible();
  await expect(page.getByText('#PRAYER')).toBeVisible();
  await expect(page.getByText('#VICTORY')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored?.journalEntries).toHaveLength(1);
  expect(stored.journalEntries[0].tags).toEqual(['prayer', 'victory']);
  expect(stored.journalEntries[0].prayerFocus).toBe('Morning prayer focus');
  expect(stored.journalEntries[0].victory).toBe('Stayed faithful with water only');
});

test('saved entry remains visible after clearing an active search filter', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search journal entries' }).fill('nothing-matches');
  await page.getByRole('button', { name: '+ New' }).click();
  await selectTags(page, 'Victory');
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

  await selectTags(page, 'Gratitude');
  await page.getByLabel('Victory today').fill('Plan date save');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].date >= '2026-06-13').toBe(true);
  expect(stored.journalEntries[0].date <= '2026-12-19').toBe(true);
  expect(stored.journalEntries[0].tags).toEqual(['gratitude']);
});

test('filter chips show only entries with matching stored tags', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectTags(page, 'Prayer');
  await page.getByLabel('Prayer point I focused on').fill('Prayer only entry');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.getByRole('button', { name: '+ New' }).click();
  await selectTags(page, 'Victory');
  await page.getByLabel('Victory today').fill('Victory only entry');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.getByRole('button', { name: 'Prayer' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Prayer only entry' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Victory only entry' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Victory' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Victory only entry' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Prayer only entry' })).toHaveCount(0);
});
