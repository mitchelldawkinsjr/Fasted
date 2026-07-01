import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { expectDateInputContained } from './fixtures/overflow';
import { AUDIT_VIEWPORTS } from './fixtures/viewports';

const STORAGE_KEY = 'fasted-calendar-progress:guest';
const INSTALL_TOAST_KEY = 'fasted-calendar-install-toast-dismissed';
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'issue-98');

function formatDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function todayString(): string {
  return formatDate(new Date());
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return formatDate(new Date(year, month - 1, day + days));
}

function dayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

async function seedProgress(page: Page, progress: Record<string, unknown>) {
  await page.evaluate(
    ({ key, installToastKey, seededProgress }) => {
      localStorage.setItem(key, JSON.stringify(seededProgress));
      localStorage.setItem(installToastKey, '1');
    },
    { key: STORAGE_KEY, installToastKey: INSTALL_TOAST_KEY, seededProgress: progress },
  );
}

test.describe('custom journey builder', () => {
  test.beforeAll(() => {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.evaluate((key) => {
      localStorage.removeItem(key);
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    }, STORAGE_KEY);
    await page.reload();
  });

  test('creates a custom journey and persists Today instructions after reload', async ({ page }) => {
    await page.getByRole('button', { name: /Create custom journey/i }).click();

    await page.getByLabel('Journey name').fill('Neighborhood Fast');
    await page.getByRole('textbox', { name: 'Start date', exact: true }).fill('2026-07-06');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByLabel('Phase title').fill('Neighborhood Intercession');
    await page.getByLabel('Duration (days)').fill('5');
    await page.getByLabel('Prayer focus (required)').fill('Neighbors\nCourage');
    await page.getByLabel('Allowed foods').fill('Vegetables\nLean protein');
    await page.getByLabel('Avoid foods').fill('Candy\nSoda');
    await page.getByLabel('Beverages').fill('Water');
    await page.getByLabel('Daily readings').fill('Nehemiah 1');
    await page.getByLabel('Scripture reference').fill('Nehemiah 1:4');
    await page.getByText('Optional instruction overrides').click();
    await page.getByRole('textbox', { name: 'Instructions every day', exact: true }).fill(
      'Invite one neighbor into prayer.',
    );
    await page.getByRole('textbox', { name: 'Fast day instructions', exact: true }).fill(
      'Pray for three families by name.',
    );

    await page.getByRole('button', { name: 'Review' }).click();
    await expect(page.getByText('Neighborhood Intercession')).toBeVisible();
    await expect(page.getByText(/Monday, July 6, 2026.*Friday, July 10, 2026/)).toBeVisible();
    await page.getByRole('button', { name: 'Start Journey' }).click();

    await expect(page.getByText('Custom journey saved.')).toBeVisible();

    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, STORAGE_KEY);
    const customJourney = stored.journeys.find((journey: { name: string }) => journey.name === 'Neighborhood Fast');
    expect(stored.activeJourneyId).toBe(customJourney.id);
    expect(customJourney.phases).toHaveLength(1);
    expect(customJourney.phases[0].templateId).toBeUndefined();
    expect(customJourney.phases[0].startDate).toBe('2026-07-06');
    expect(customJourney.phases[0].endDate).toBe('2026-07-10');
    expect(customJourney.phases[0].content.scheduleSummary).toContain('Wednesday');

    await page.goto('/?date=2026-07-08');
    const instructions = page.getByTestId('today-instructions-list');
    await expect(page.getByText('Phase 1: Neighborhood Intercession')).toBeVisible();
    await expect(instructions).toContainText('Sunrise-to-sunset fast today—water only.');
    await expect(instructions).toContainText('Beverages: water.');
    await expect(instructions).toContainText('Invite one neighbor into prayer.');
    await expect(instructions).toContainText('Pray for three families by name.');
    await expect(page.getByText('Neighbors')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Phase 1: Neighborhood Intercession')).toBeVisible();
    await expect(page.getByTestId('today-instructions-list')).toContainText(
      'Pray for three families by name.',
    );
  });

  test('journey builder date input fits within modal on mobile and desktop', async ({ page }) => {
    const journey = {
      id: 'custom-journey-date-fit',
      name: 'Date Fit Journey',
      startDate: '2026-06-13',
      phases: [
        {
          order: 0,
          startDate: '2026-06-13',
          endDate: '2026-12-19',
          content: {
            title: 'Phase 1',
            schedulePattern: { kind: 'normal-eating' },
            allowed: ['Water'],
            avoid: [],
            beverages: ['Water'],
            dailyReadings: ['Psalm 1'],
            prayerFocus: ['Test'],
          },
        },
      ],
    };

    for (const viewport of AUDIT_VIEWPORTS.filter(
      (v) => v.name === 'iphone-13' || v.name === 'laptop',
    )) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/settings');
      await page.getByRole('button', { name: /Create custom journey/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectDateInputContained(page, { label: 'Start date' });
      await page.goto('/settings');

      await seedProgress(page, {
        activeJourneyId: journey.id,
        journeys: [journey],
        checkIns: [],
        journalEntries: [],
        badges: [],
        settings: { reminderTime: '07:00', theme: 'light', scriptureNote: '' },
      });
      await page.reload();
      await page.getByRole('button', { name: /Edit active journey/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectDateInputContained(page, { label: 'Edit from date' });
      await page.goto('/settings');
    }
  });

  test('edits an in-progress template-based journey without duplicating the current phase', async ({ page }) => {
    const today = todayString();
    const journeyStart = addDays(today, -5);
    const dayBeforeEdit = addDays(today, -1);
    const firstPhaseEnd = addDays(journeyStart, 28);
    const secondPhaseStart = addDays(firstPhaseEnd, 1);
    const journey = {
      id: 'legacy-template-custom',
      name: 'Legacy Template Journey',
      startDate: journeyStart,
      phases: [
        { order: 0, templateId: 'daniel-1' },
        { order: 1, templateId: 'davids-fast' },
      ],
    };

    await seedProgress(page, {
      activeJourneyId: journey.id,
      journeys: [journey],
      checkIns: [],
      journalEntries: [],
      mealImages: {},
      badges: [],
      settings: { reminderTime: '07:00', theme: 'light', scriptureNote: '' },
    });
    await page.reload();

    await page.getByRole('button', { name: /Edit active journey/i }).click();
    await expect(page.getByLabel('Edit from date')).toBeDisabled();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('Phase title').fill('Edited From Today');
    await page.getByRole('button', { name: 'Review' }).click();
    await page.getByRole('button', { name: 'Save Journey' }).click();

    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, STORAGE_KEY);
    const savedJourney = stored.journeys.find(
      (candidate: { id: string }) => candidate.id === journey.id,
    );

    expect(savedJourney.phases).toHaveLength(3);
    expect(savedJourney.phases[0]).toMatchObject({
      order: 0,
      startDate: journeyStart,
      endDate: dayBeforeEdit,
    });
    expect(savedJourney.phases[0].templateId).toBeUndefined();
    expect(savedJourney.phases[1]).toMatchObject({
      order: 1,
      startDate: today,
      endDate: firstPhaseEnd,
    });
    expect(savedJourney.phases[1].content.title).toBe('Edited From Today');
    expect(savedJourney.phases[2]).toMatchObject({
      order: 2,
      startDate: secondPhaseStart,
    });
  });

  test('uses the selected custom fast type in Today instructions', async ({ page }) => {
    const today = todayString();
    const journey = {
      id: 'coffee-tea-custom',
      name: 'Coffee Tea Fast',
      startDate: today,
      phases: [
        {
          order: 0,
          startDate: today,
          endDate: addDays(today, 2),
          content: {
            title: 'Coffee Tea Phase',
            themeColor: '#5f6f52',
            schedulePattern: {
              kind: 'weekday-fast',
              fastDays: [dayOfWeek(today)],
              fastType: 'sunrise-to-sunset-with-coffee-tea',
            },
            beverages: ['Water', 'Black coffee', 'Unsweetened tea'],
            prayerFocus: ['Discernment'],
            scriptureReference: 'Psalm 63:1',
            scheduleSummary: 'Custom coffee and tea fast.',
          },
        },
      ],
    };

    await seedProgress(page, {
      activeJourneyId: journey.id,
      journeys: [journey],
      checkIns: [],
      journalEntries: [],
      mealImages: {},
      badges: [],
      settings: { reminderTime: '07:00', theme: 'light', scriptureNote: '' },
    });

    await page.goto(`/?date=${today}`);
    const instructions = page.getByTestId('today-instructions-list');
    await expect(instructions).toContainText(
      'Sunrise-to-sunset fast today—water, coffee, and unsweetened tea allowed.',
    );
    await expect(instructions).toContainText('Beverages: water, black coffee, unsweetened tea.');
    await expect(instructions).not.toContainText('Sunrise-to-sunset fast today—water only.');
  });

  test('check-in modal shows journey-relative phase label for template-based custom journeys', async ({
    page,
  }) => {
    const today = todayString();
    const journey = {
      id: 'template-custom-phase-one',
      name: 'Seek God Fast',
      startDate: today,
      phases: [{ order: 0, templateId: 'davids-fast' }],
    };

    await seedProgress(page, {
      activeJourneyId: journey.id,
      journeys: [journey],
      checkIns: [],
      journalEntries: [],
      mealImages: {},
      badges: [],
      settings: { reminderTime: '07:00', theme: 'light', scriptureNote: '' },
    });

    await page.goto(`/?date=${today}`);
    await expect(page.getByText("Phase 1: David's Fast for Seeking God")).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'today-custom-journey-phase-1.png'),
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Check-in for Today' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByText("Phase 1: David's Fast for Seeking God")).toBeVisible();
    await expect(modal.getByText('Phase 2:')).not.toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'checkin-modal-custom-journey-phase-1.png'),
      fullPage: true,
    });
  });

  test('switching active journey updates check-in phase label without reload', async ({ page }) => {
    const today = todayString();
    const customJourney = {
      id: 'switch-custom-journey',
      name: 'Neighborhood Fast',
      startDate: today,
      phases: [
        {
          order: 0,
          startDate: today,
          endDate: addDays(today, 4),
          content: {
            title: 'Neighborhood Intercession',
            schedulePattern: { kind: 'normal-eating' },
            allowed: ['Vegetables'],
            avoid: [],
            beverages: ['Water'],
            dailyReadings: ['Nehemiah 1'],
            prayerFocus: ['Neighbors'],
            scriptureReference: 'Nehemiah 1:4',
          },
        },
      ],
    };
    const fastedJourney = {
      id: 'fasted-journey',
      name: 'Fasted Journey',
      startDate: '2026-06-13',
      locked: true,
      isDefault: true,
      phases: [
        { order: 0, templateId: 'daniel-1' },
        { order: 1, templateId: 'davids-fast' },
      ],
    };

    await seedProgress(page, {
      activeJourneyId: customJourney.id,
      journeys: [fastedJourney, customJourney],
      checkIns: [],
      journalEntries: [],
      mealImages: {},
      badges: [],
      settings: { reminderTime: '07:00', theme: 'light', scriptureNote: '' },
    });

    await page.goto(`/?date=${today}`);
    await expect(page.getByText('Phase 1: Neighborhood Intercession')).toBeVisible();

    await page.goto('/settings');
    await page.getByLabel('Switch journey').selectOption('fasted-journey');
    await page.goto(`/?date=2026-07-12`);

    await expect(page.getByText("Phase 2: David's Fast for Seeking God")).toBeVisible();
    await page.getByRole('button', { name: 'Check-in for Today' }).click();
    await expect(page.getByRole('dialog').getByText("Phase 2: David's Fast for Seeking God")).toBeVisible();
  });
});
