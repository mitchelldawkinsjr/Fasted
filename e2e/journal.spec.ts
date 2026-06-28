import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'fasted-calendar-progress:guest';

async function selectType(page: import('@playwright/test').Page, label: string) {
  const group = page.getByRole('group', { name: 'Reflection type' });
  const button = group.getByRole('button', { name: label, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/journal');
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
  }, STORAGE_KEY);
  await page.reload();
});

test('saves a daily reflection with multiple fields', async ({ page }) => {
  await expect(page.getByText('0 reflections')).toBeVisible();

  await page.getByRole('button', { name: '+ New' }).click();
  await expect(page.getByRole('button', { name: 'Daily Reflection' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('radio', { name: 'Good' }).click();
  await page.getByLabel('Verse of the Day').fill('Morning prayer focus');
  await page.getByLabel('Victory today').fill('Stayed faithful with water only');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await expect(page.getByText('Reflection saved.')).toBeVisible();
  await expect(page.getByText('1 reflections')).toBeVisible();
  await expect(page.getByText('Morning prayer focus')).toBeVisible();
  await expect(page.getByText('Stayed faithful with water only')).toBeVisible();
  await expect(page.getByText('#DAILY REFLECTION')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored?.journalEntries).toHaveLength(1);
  expect(stored.journalEntries[0].type).toBe('daily-reflection');
  expect(stored.journalEntries[0].dayMood).toBe('good');
  expect(stored.journalEntries[0].prayerFocus).toBe('Morning prayer focus');
  expect(stored.journalEntries[0].victory).toBe('Stayed faithful with water only');
});

test('saves a simple prayer entry in one text box', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Prayer');
  await expect(page.getByLabel('Verse of the Day')).toHaveCount(0);
  await page.getByLabel('Prayer').fill('Prayed for family healing');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await expect(page.getByRole('listitem').filter({ hasText: 'Prayed for family healing' })).toBeVisible();
  await expect(page.getByText('#PRAYER')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].type).toBe('prayer');
  expect(stored.journalEntries[0].content).toBe('Prayed for family healing');
});

test('saved entry remains visible after clearing an active search filter', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search journal entries' }).fill('nothing-matches');
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Victory');
  await page.getByLabel('Victory').fill('Visible after save');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await expect(page.getByText('1 reflections')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Visible after save' })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search journal entries' })).toHaveValue('');
});

test('date stays within plan bounds on save', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  const dateInput = page.getByLabel('Date');
  await expect(dateInput).toHaveAttribute('min', '2026-06-13');
  await expect(dateInput).toHaveAttribute('max', '2026-12-19');

  await selectType(page, 'Gratitude');
  await page.getByLabel('Gratitude').fill('Plan date save');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].date >= '2026-06-13').toBe(true);
  expect(stored.journalEntries[0].date <= '2026-12-19').toBe(true);
  expect(stored.journalEntries[0].type).toBe('gratitude');
});

test('morning reflection tag links to filtered journal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Prayer' }).click();
  await expect(page).toHaveURL('/journal?type=prayer');
  await expect(page.getByRole('button', { name: 'Prayer', exact: true })).toHaveClass(/bg-primary/);

  await page.goto('/');
  await page.getByRole('link', { name: 'Daily Reflection' }).click();
  await expect(page).toHaveURL('/journal?type=daily-reflection');
  await expect(page.getByRole('button', { name: 'Daily Reflection', exact: true })).toHaveClass(
    /bg-primary/,
  );
});

test('shows verse of the day chapter link in daily reflection form', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await expect(page.getByText('Verse of the Day')).toBeVisible();

  const chapterLink = page.getByRole('link', { name: /read full chapter on Bible.com/i });
  await expect(chapterLink).toBeVisible();
  await expect(chapterLink).toHaveAttribute('href', /bible\.com\/bible\/116\/.+\.NLT$/);
});

test('opens a read-only view of a saved entry', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Great' }).click();
  await page.getByLabel('Verse of the Day').fill('Evening prayer focus');
  await page.getByLabel('What I prayed about').fill('Family healing and peace');
  await page.getByLabel('Victory today').fill('Completed the fast without complaint');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.getByRole('button', { name: /View reflection from/i }).click();

  await expect(page.getByRole('heading', { name: 'Reflection' })).toBeVisible();
  await expect(page.getByText('Evening prayer focus')).toBeVisible();
  await expect(page.getByText('Great')).toBeVisible();
  await expect(page.getByText('Family healing and peace')).toBeVisible();
  await expect(page.getByText('Completed the fast without complaint')).toBeVisible();
  await expect(page.getByLabel('Verse of the Day')).toHaveCount(0);

  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page.getByText('1 reflections')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reflection' })).toHaveCount(0);

  await page.getByRole('button', { name: /View reflection from/i }).click();
  await expect(page.getByRole('button', { name: 'Back to Journal' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Journal' }).click();
  await expect(page.getByText('1 reflections')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reflection' })).toHaveCount(0);
});

test('filter chips and listing hashtags show only entries with matching types', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Prayer');
  await page.getByLabel('Prayer').fill('Prayer only entry');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Victory');
  await page.getByLabel('Victory').fill('Victory only entry');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.getByRole('button', { name: 'Prayer', exact: true }).click();
  await expect(page).toHaveURL('/journal?type=prayer');
  await expect(page.getByRole('listitem').filter({ hasText: 'Prayer only entry' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Victory only entry' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Victory', exact: true }).click();
  await expect(page).toHaveURL('/journal?type=victory');
  await expect(page.getByRole('listitem').filter({ hasText: 'Victory only entry' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Prayer only entry' })).toHaveCount(0);

  await page.getByRole('button', { name: 'All Reflections' }).click();
  await expect(page).toHaveURL('/journal');
  await expect(page.getByRole('listitem').filter({ hasText: 'Prayer only entry' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Victory only entry' })).toBeVisible();
  await page.getByRole('button', { name: 'Filter by Prayer' }).first().click();

  await expect(page).toHaveURL('/journal?type=prayer');
  await expect(page.getByRole('button', { name: 'Prayer', exact: true })).toHaveClass(/bg-primary/);
  await expect(page.getByRole('listitem').filter({ hasText: 'Prayer only entry' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Victory only entry' })).toHaveCount(0);
});

test('viewer hashtag returns to filtered journal listing', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Victory');
  await page.getByLabel('Victory').fill('Victory viewer hashtag entry');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Prayer');
  await page.getByLabel('Prayer').fill('Prayer viewer hashtag entry');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page
    .getByRole('listitem')
    .filter({ hasText: 'Prayer viewer hashtag entry' })
    .getByRole('button', { name: /View reflection from/i })
    .click();
  await expect(page.getByRole('heading', { name: 'Reflection' })).toBeVisible();

  await page.getByRole('button', { name: 'Filter by Prayer' }).click();

  await expect(page).toHaveURL('/journal?type=prayer');
  await expect(page.getByRole('heading', { name: 'Reflection' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prayer', exact: true })).toHaveClass(/bg-primary/);
  await expect(page.getByRole('listitem').filter({ hasText: 'Prayer viewer hashtag entry' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Victory viewer hashtag entry' })).toHaveCount(0);
});

test('saves a food entry with meal fields', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Food');
  await page.getByLabel('What did you eat for breakfast?').fill('Oatmeal with berries');
  await page.getByLabel('What did you eat for lunch?').fill('Grilled chicken salad');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await expect(page.getByRole('listitem').filter({ hasText: 'Oatmeal with berries' })).toBeVisible();
  await expect(page.getByText('#FOOD')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].type).toBe('food');
  expect(stored.journalEntries[0].breakfast).toBe('Oatmeal with berries');
  expect(stored.journalEntries[0].lunch).toBe('Grilled chicken salad');
});

test('saves a fitness entry', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Fitness');
  await page.getByLabel('How did you move your body today?').fill('30-minute walk after dinner');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await expect(
    page.getByRole('listitem').filter({ hasText: '30-minute walk after dinner' }),
  ).toBeVisible();
  await expect(page.getByText('#FITNESS')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].type).toBe('fitness');
  expect(stored.journalEntries[0].content).toBe('30-minute walk after dinner');
});

test('migrates legacy tagged entries on load', async ({ page }) => {
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        checkIns: [],
        journalEntries: [
          {
            id: 'legacy-1',
            date: '2026-06-13',
            tags: ['prayer'],
            prayerFocus: 'Legacy prayer note',
            prayedAbout: '',
            godTeaching: '',
            hungerNotes: '',
            victory: '',
            tomorrowIntention: '',
            updatedAt: '2026-06-13T12:00:00.000Z',
          },
        ],
        badges: [],
        settings: {
          reminderTime: '07:00',
          theme: 'light',
          scriptureNote: '',
        },
      }),
    );
  }, STORAGE_KEY);
  await page.reload();

  await expect(page.getByRole('listitem').filter({ hasText: 'Legacy prayer note' })).toBeVisible();
  await expect(page.getByText('#PRAYER')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].type).toBe('prayer');
  expect(stored.journalEntries[0].content).toBe('Legacy prayer note');
});

test('preserves text when switching prayer -> daily reflection -> prayer', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Prayer');
  await page.getByLabel('Prayer').fill('Prayer text preserved across switches');
  await selectType(page, 'Daily Reflection');
  await selectType(page, 'Prayer');
  await expect(page.getByLabel('Prayer')).toHaveValue('Prayer text preserved across switches');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].type).toBe('prayer');
  expect(stored.journalEntries[0].content).toBe('Prayer text preserved across switches');
});

test('migrates legacy food tagged entries', async ({ page }) => {
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        checkIns: [],
        journalEntries: [
          {
            id: 'legacy-food-1',
            date: '2026-06-13',
            tags: ['food'],
            prayerFocus: 'Legacy breakfast note',
            prayedAbout: '',
            godTeaching: '',
            hungerNotes: '',
            victory: '',
            tomorrowIntention: '',
            updatedAt: '2026-06-13T12:00:00.000Z',
          },
        ],
        badges: [],
        settings: {
          reminderTime: '07:00',
          theme: 'light',
          scriptureNote: '',
        },
      }),
    );
  }, STORAGE_KEY);
  await page.reload();

  await expect(page.getByRole('listitem').filter({ hasText: 'Legacy breakfast note' })).toBeVisible();
  await expect(page.getByText('#FOOD')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].type).toBe('food');
  expect(stored.journalEntries[0].breakfast).toBe('Legacy breakfast note');
});

test('migrates legacy fitness tagged entries', async ({ page }) => {
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        checkIns: [],
        journalEntries: [
          {
            id: 'legacy-fitness-1',
            date: '2026-06-13',
            tags: ['fitness'],
            prayerFocus: 'Legacy movement note',
            prayedAbout: '',
            godTeaching: '',
            hungerNotes: '',
            victory: '',
            tomorrowIntention: '',
            updatedAt: '2026-06-13T12:00:00.000Z',
          },
        ],
        badges: [],
        settings: {
          reminderTime: '07:00',
          theme: 'light',
          scriptureNote: '',
        },
      }),
    );
  }, STORAGE_KEY);
  await page.reload();

  await expect(page.getByRole('listitem').filter({ hasText: 'Legacy movement note' })).toBeVisible();
  await expect(page.getByText('#FITNESS')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].type).toBe('fitness');
  expect(stored.journalEntries[0].content).toBe('Legacy movement note');
});

test('journal list back arrow returns to the calendar on direct entry', async ({ page }) => {
  await page.getByRole('link', { name: 'Go back' }).click();

  await expect(page).toHaveURL('/calendar');
});
