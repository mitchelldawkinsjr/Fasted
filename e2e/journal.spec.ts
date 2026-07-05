import { expect, test } from '@playwright/test';
import { expectDateInputContained } from './fixtures/overflow';
import { AUDIT_VIEWPORTS } from './fixtures/viewports';
import { messages } from '../src/lib/messages';

const STORAGE_KEY = 'fasted-calendar-progress:guest';

async function selectType(page: import('@playwright/test').Page, label: string) {
  const group = page.getByRole('group', { name: 'Reflection type' });
  const button = group.getByRole('button', { name: label, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

async function fillJournalField(
  page: import('@playwright/test').Page,
  label: string,
  text: string,
) {
  const field = page.getByLabel(label);
  if (await field.evaluate((element) => element.tagName === 'TEXTAREA')) {
    await field.fill(text);
    return;
  }

  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible()) {
    await page.getByRole('button', { name: 'Done' }).click();
  }
  await field.click();
  await dialog.getByLabel(label).fill(text);
  await page.getByRole('button', { name: 'Done' }).click();
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
  await fillJournalField(page, 'Verse of the Day', 'Morning prayer focus');
  await fillJournalField(page, 'Victory today', 'Stayed faithful with water only');
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

test('focus lightbox navigates between daily reflection fields', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Good' }).click();
  await page.getByLabel('Verse of the Day').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByLabel('Verse of the Day').fill('Focus verse entry');
  await page.getByRole('dialog').getByRole('button', { name: 'Next' }).click();
  await page.getByRole('dialog').getByLabel('What I prayed about').fill('Focus prayed entry');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save Entry' }).click();
  await expect(page.getByText('Reflection saved.')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  const saved = stored.journalEntries.find(
    (entry: { prayedAbout?: string }) => entry.prayedAbout === 'Focus prayed entry',
  );
  expect(saved?.prayerFocus).toBe('Focus verse entry');
});

test('dismisses focus lightbox when clicking the backdrop', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Good' }).click();
  await page.getByLabel('Verse of the Day').click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByRole('dialog').click({ position: { x: 8, y: 8 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('preserves journal editor scroll position after closing focus lightbox', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Good' }).click();

  await page.evaluate(() => {
    const scrollArea = document.querySelector('form .overflow-y-auto');
    if (scrollArea) scrollArea.scrollTop = 120;
  });

  const scrollBefore = await page.evaluate(
    () => document.querySelector('form .overflow-y-auto')?.scrollTop ?? 0,
  );

  await page.evaluate(() => {
    const button = document.querySelector('[aria-label="Verse of the Day"]');
    button?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    button?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const scrollAfter = await page.evaluate(
    () => document.querySelector('form .overflow-y-auto')?.scrollTop ?? 0,
  );
  expect(scrollAfter).toBe(scrollBefore);
});

test('focus mode toggle off uses inline textareas', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Good' }).click();
  await page.getByRole('switch', { name: 'Focus mode' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByLabel('Victory today').fill('Inline victory note');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await expect(page.getByRole('listitem').filter({ hasText: 'Inline victory note' })).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.settings.journalFocusMode).toBe(false);
  expect(
    stored.journalEntries.some(
      (entry: { victory?: string }) => entry.victory === 'Inline victory note',
    ),
  ).toBe(true);
});

test('saves a simple prayer entry in one text box', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Prayer');
  await expect(page.getByLabel('Verse of the Day')).toHaveCount(0);
  await fillJournalField(page, 'Prayer', 'Prayed for family healing');
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
  await selectType(page, 'Revelations');
  await fillJournalField(page, 'What is God saying?', 'Visible after save');
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
  await fillJournalField(page, 'Gratitude', 'Plan date save');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored.journalEntries[0].date >= '2026-06-13').toBe(true);
  expect(stored.journalEntries[0].date <= '2026-12-19').toBe(true);
  expect(stored.journalEntries[0].type).toBe('gratitude');
});

test('date input fits within card on mobile and desktop', async ({ page }) => {
  for (const viewport of AUDIT_VIEWPORTS.filter(
    (v) => v.name === 'iphone-13' || v.name === 'laptop',
  )) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/journal');
    await page.getByRole('button', { name: '+ New' }).click();
    await expectDateInputContained(page, { label: 'Date' });
  }
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
  const chapterLink = page.getByRole('link', { name: /read full chapter on Bible.com/i });
  await expect(chapterLink).toBeVisible();
  await expect(chapterLink).toHaveAttribute('href', /bible\.com\/bible\/116\/.+\.NLT$/);
});

test('opens a read-only view of a saved entry', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Great' }).click();
  await fillJournalField(page, 'Verse of the Day', 'Evening prayer focus');
  await fillJournalField(page, 'What I prayed about', 'Family healing and peace');
  await fillJournalField(page, 'Victory today', 'Completed the fast without complaint');
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
  await fillJournalField(page, 'Prayer', 'Prayer only entry');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Revelations');
  await fillJournalField(page, 'What is God saying?', 'Victory only entry');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.getByRole('button', { name: 'Prayer', exact: true }).click();
  await expect(page).toHaveURL('/journal?type=prayer');
  await expect(page.getByRole('listitem').filter({ hasText: 'Prayer only entry' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Victory only entry' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Revelations', exact: true }).click();
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
  await selectType(page, 'Revelations');
  await fillJournalField(page, 'What is God saying?', 'Victory viewer hashtag entry');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Prayer');
  await fillJournalField(page, 'Prayer', 'Prayer viewer hashtag entry');
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
  await fillJournalField(page, 'What did you eat for breakfast?', 'Oatmeal with berries');
  await fillJournalField(page, 'What did you eat for lunch?', 'Grilled chicken salad');
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

test('saves meal photos with a food entry', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Food');
  await fillJournalField(page, 'What did you eat for breakfast?', 'Eggs and toast');
  await fillJournalField(page, 'What did you eat as a snack?', 'Apple slices');

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('e2e/fixtures/meal-photo.png');

  await expect(page.getByRole('img', { name: /breakfast photo 1/i })).toBeVisible();

  await page.getByRole('button', { name: 'Save Entry' }).click();
  await expect(page.getByText('Reflection saved.')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  const entryId = stored.journalEntries[0].id;
  expect(stored.mealImages[entryId].breakfast).toHaveLength(1);
  const imageId = stored.mealImages[entryId].breakfast[0] as string;
  expect(imageId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  expect(imageId.startsWith('data:')).toBe(false);

  await page.getByRole('button', { name: /View reflection from/i }).click();
  await expect(page.getByRole('img', { name: /breakfast photo 1/i })).toBeVisible();
  await expect(page.getByText('Eggs and toast')).toBeVisible();
});

test('migrates legacy base64 meal images and saves without storage-full', async ({ page }) => {
  // Simulate pre-split storage: many base64 meal photos in localStorage (the old design).
  // After load, IDs must replace data URLs and a new photo save must not hit quota.
  const legacyPayload = await page.evaluate((key) => {
    const chunk = 'A'.repeat(80_000);
    const dataUrl = `data:image/png;base64,${chunk}`;
    const journalEntries: Array<Record<string, unknown>> = [];
    const mealImages: Record<string, { breakfast: string[] }> = {};

    for (let i = 0; i < 8; i += 1) {
      const id = `legacy-food-${i}`;
      journalEntries.push({
        id,
        type: 'food',
        date: `2026-06-${String(20 + i).padStart(2, '0')}`,
        breakfast: `Legacy breakfast ${i}`,
        lunch: '',
        dinner: '',
        snack: '',
        updatedAt: new Date().toISOString(),
      });
      mealImages[id] = { breakfast: [dataUrl, dataUrl, dataUrl, dataUrl] };
    }

    const progress = {
      checkIns: [],
      checkInStreak: 0,
      journalEntries,
      mealImages,
      badges: [],
      settings: {
        reminderTime: '07:00',
        theme: 'light',
        scriptureNote: '',
      },
      activeJourneyId: 'fasted-2026',
      journeys: [],
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(progress));
    return { entryCount: journalEntries.length, approxChars: JSON.stringify(progress).length };
  }, STORAGE_KEY);

  expect(legacyPayload.approxChars).toBeGreaterThan(2_000_000);

  await page.reload();
  await expect(page.getByText(/reflections/i).first()).toBeVisible();

  // Migration is async — wait until progress no longer embeds data URLs.
  await expect
    .poll(async () => {
      return page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return 'missing';
        if (raw.includes('data:image')) return 'legacy';
        const parsed = JSON.parse(raw) as {
          mealImages?: Record<string, { breakfast?: string[] }>;
        };
        const first = Object.values(parsed.mealImages ?? {})[0]?.breakfast?.[0];
        return first && !first.startsWith('data:') ? 'migrated' : 'pending';
      }, STORAGE_KEY);
    }, { timeout: 10_000 })
    .toBe('migrated');

  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Food');
  await fillJournalField(page, 'What did you eat for breakfast?', 'Post-migration meal');

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('e2e/fixtures/meal-photo.png');
  await expect(page.getByRole('img', { name: /breakfast photo 1/i })).toBeVisible();

  await page.getByRole('button', { name: 'Save Entry' }).click();
  await expect(page.getByText('Reflection saved.')).toBeVisible();
  await expect(page.getByText(/Storage is full/i)).toHaveCount(0);

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(JSON.stringify(stored.mealImages)).not.toContain('data:image');
  const newest = stored.journalEntries.find(
    (entry: { breakfast?: string }) => entry.breakfast === 'Post-migration meal',
  );
  expect(newest).toBeTruthy();
  expect(stored.mealImages[newest.id].breakfast[0]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
});

test('saves up to four meal photos per section', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Food');
  await fillJournalField(page, 'What did you eat for breakfast?', 'Photo breakfast log');

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles([
    'e2e/fixtures/meal-photo.png',
    'e2e/fixtures/meal-photo.png',
    'e2e/fixtures/meal-photo.png',
    'e2e/fixtures/meal-photo.png',
  ]);

  await expect(page.getByRole('img', { name: /breakfast photo 4/i })).toBeVisible();
  await expect(page.getByLabel('Add breakfast photo')).toHaveCount(0);

  await page.getByRole('button', { name: 'Save Entry' }).click();
  await expect(page.getByText('Reflection saved.')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  const entryId = stored.journalEntries[0].id;
  expect(stored.mealImages[entryId].breakfast).toHaveLength(4);
});

test('warns when selecting more meal photos than the section allows', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Food');
  await fillJournalField(page, 'What did you eat for lunch?', 'Lunch photo limit test');

  const fileInput = page.locator('input[type="file"]').nth(1);
  await fileInput.setInputFiles([
    'e2e/fixtures/meal-photo.png',
    'e2e/fixtures/meal-photo.png',
    'e2e/fixtures/meal-photo.png',
    'e2e/fixtures/meal-photo.png',
    'e2e/fixtures/meal-photo.png',
  ]);

  await expect(page.getByText(messages.errors.mealImageSomeSkipped(4, 4))).toBeVisible();
  await expect(page.getByRole('img', { name: /lunch photo 4/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /lunch photo 5/i })).toHaveCount(0);
});

test('saves a fitness entry', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Fitness');
  await fillJournalField(page, 'How did you move your body today?', '30-minute walk after dinner');
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
  await fillJournalField(page, 'Prayer', 'Prayer text preserved across switches');
  await selectType(page, 'Daily Reflection');
  await selectType(page, 'Prayer');
  await expect(page.getByLabel('Prayer')).toContainText('Prayer text preserved across switches');
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

test('disables PDF export when journal is empty', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Export journal as PDF' })).toBeDisabled();
});

test.describe('journal PDF export', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.print = () => undefined;
    });
  });

test('opens print document when exporting journal as PDF', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Good' }).click();
  await fillJournalField(page, 'Verse of the Day', 'Export cover verse');
  await fillJournalField(page, 'Victory today', 'Export victory note');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Export journal as PDF' }).click(),
  ]);

  await expect(page.getByText(messages.export.journalPdf)).toBeVisible();
  await popup.waitForLoadState('domcontentloaded');
  await expect(popup).toHaveURL(/\/journal\/print\?return=%2Fjournal/);
  await expect(popup.getByRole('button', { name: 'Go back' })).toBeVisible();
  await expect(popup.getByText('Fasted', { exact: true })).toBeVisible();
  await expect(popup.getByText('Export cover verse')).toBeVisible();
  await expect(popup.getByText('Export victory note')).toBeVisible();
  await Promise.all([
    popup.waitForEvent('close'),
    popup.evaluate(() => window.dispatchEvent(new Event('afterprint'))),
  ]);
});

test('includes meal photos in journal PDF export', async ({ page, context }) => {
  await context.addInitScript(() => {
    window.print = () => undefined;
  });

  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Food');
  await fillJournalField(page, 'What did you eat for breakfast?', 'PDF export breakfast photo');

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('e2e/fixtures/meal-photo.png');
  await expect(page.getByRole('img', { name: /breakfast photo 1/i })).toBeVisible();
  await page.getByRole('button', { name: 'Save Entry' }).click();

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Export journal as PDF' }).click(),
  ]);

  await popup.waitForLoadState('domcontentloaded');
  await expect(popup.getByText('PDF export breakfast photo')).toBeVisible();
  await expect(popup.getByRole('img', { name: /breakfast photo 1/i })).toBeVisible();
  await Promise.all([
    popup.waitForEvent('close'),
    popup.evaluate(() => window.dispatchEvent(new Event('afterprint'))),
  ]);
});

test('print page back button closes browser PDF export popup', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Good' }).click();
  await fillJournalField(page, 'Verse of the Day', 'Popup back verse');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Export journal as PDF' }).click(),
  ]);

  await popup.waitForLoadState('domcontentloaded');
  await expect(popup).toHaveURL(/\/journal\/print\?return=%2Fjournal/);
  await expect(popup.getByRole('button', { name: 'Go back' })).toBeVisible();
  await Promise.all([
    popup.waitForEvent('close'),
    popup.getByRole('button', { name: 'Go back' }).click(),
  ]);
});

test('shows a blocked popup message when PDF export cannot open', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Good' }).click();
  await fillJournalField(page, 'Verse of the Day', 'Blocked popup verse');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.evaluate(() => {
    window.open = () => null;
  });
  await page.getByRole('button', { name: 'Export journal as PDF' }).click();

  await expect(page.getByText(messages.export.journalPdfBlocked)).toBeVisible();
  await expect(page.getByText(messages.export.journalPdf)).toHaveCount(0);
});

test('waits for print fonts before opening the print dialog', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Prayer');
  await fillJournalField(page, 'Prayer', 'Fonts should load before printing');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.context().addInitScript(() => {
    const testWindow = window as Window & typeof globalThis & {
      __printCalls?: number;
      __resolvePrintFonts?: () => void;
    };
    let resolveFonts: () => void = () => undefined;
    const fontsReady = new Promise<void>((resolve) => {
      resolveFonts = resolve;
    });

    testWindow.__printCalls = 0;
    testWindow.__resolvePrintFonts = resolveFonts;
    // Patch the prototype so the mock survives popup navigation from about:blank.
    Object.defineProperty(Document.prototype, 'fonts', {
      configurable: true,
      get() {
        return { ready: fontsReady };
      },
    });
    window.print = () => {
      testWindow.__printCalls = (testWindow.__printCalls ?? 0) + 1;
    };
  });

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Export journal as PDF' }).click(),
  ]);

  await popup.waitForLoadState('domcontentloaded');
  await expect(popup).toHaveURL(/\/journal\/print\?return=%2Fjournal/);
  await expect(popup.getByRole('button', { name: 'Go back' })).toBeVisible();
  await expect(popup.getByText('Fonts should load before printing')).toBeVisible();
  await expect
    .poll(() =>
      popup.evaluate(() => {
        const testWindow = window as Window & typeof globalThis & { __printCalls?: number };
        return testWindow.__printCalls ?? 0;
      }),
    )
    .toBe(0);

  await popup.evaluate(() => {
    const testWindow = window as Window & typeof globalThis & {
      __resolvePrintFonts?: () => void;
    };
    testWindow.__resolvePrintFonts?.();
  });
  await expect
    .poll(() =>
      popup.evaluate(() => {
        const testWindow = window as Window & typeof globalThis & { __printCalls?: number };
        return testWindow.__printCalls ?? 0;
      }),
    )
    .toBe(1);
  await popup.close();
});

test('settings PDF export opens print document', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await selectType(page, 'Prayer');
  await fillJournalField(page, 'Prayer', 'Settings export prayer');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.goto('/settings');

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Export journal (PDF)' }).click(),
  ]);

  await expect(page.getByText(messages.export.journalPdf)).toBeVisible();
  await popup.waitForLoadState('domcontentloaded');
  await expect(popup).toHaveURL(/\/journal\/print\?return=%2Fsettings/);
  await expect(popup.getByRole('button', { name: 'Go back' })).toBeVisible();
  await expect(popup.getByText('Settings export prayer')).toBeVisible();
  await popup.close();
});

test('print page back button returns to journal in a same-tab browser view', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Good' }).click();
  await fillJournalField(page, 'Verse of the Day', 'Back link verse');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.addInitScript(() => {
    window.print = () => undefined;
  });
  await page.goto('/journal/print?return=%2Fjournal');

  await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL('/journal');
});

test('PDF export auto-returns in-app when installed PWA afterprint fires synchronously', async ({ page }) => {
  await page.getByRole('button', { name: '+ New' }).click();
  await page.getByRole('radio', { name: 'Good' }).click();
  await fillJournalField(page, 'Verse of the Day', 'PWA export verse');
  await page.getByRole('button', { name: 'Save Entry' }).click();

  await page.evaluate(() => {
    const testWindow = window as Window & typeof globalThis & { __printCalls?: number };
    testWindow.__printCalls = 0;
    window.print = () => {
      testWindow.__printCalls = (testWindow.__printCalls ?? 0) + 1;
      window.dispatchEvent(new Event('afterprint'));
    };
    window.matchMedia = (query: string) =>
      ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList;
  });

  await page.getByRole('button', { name: 'Export journal as PDF' }).click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as Window & typeof globalThis & { __printCalls?: number };
        return testWindow.__printCalls ?? 0;
      }),
    )
    .toBe(1);
  await expect(page).toHaveURL('/journal');
});

});
