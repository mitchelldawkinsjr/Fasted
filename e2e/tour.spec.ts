/**
 * Tour flow screenshots and behavior checks.
 *
 * Seeds guest progress, clears the tour flag, advances through every step,
 * and saves screenshots to e2e/tour-screenshots/.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FIXED_DATE, INSTALL_TOAST_KEY, STORAGE_KEY } from './fixtures/constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, 'tour-screenshots');

function buildSeedProgress() {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const start = new Date('2026-06-13');
  const end = new Date(FIXED_DATE);
  end.setDate(end.getDate() - 1);

  const checkIns: object[] = [];
  const journalEntries: object[] = [];
  const moods = ['good', 'amazing', 'okay', 'good', 'bad', 'okay', 'amazing'];

  let cursor = new Date(start);
  let i = 0;
  while (cursor <= end) {
    const date = fmt(cursor);
    checkIns.push({
      date,
      followedPlan: true,
      prayedFocus: true,
      readScripture: true,
      journaled: true,
      win: 'Showed up with honesty.',
      completedAt: `${date}T20:00:00.000Z`,
    });
    journalEntries.push({
      id: `seed-${date}`,
      type: 'daily-reflection',
      date,
      updatedAt: `${date}T18:30:00.000Z`,
      dayMood: moods[i % moods.length],
      prayerFocus: 'Steadfastness through the fast',
      prayedAbout: `Prayed for grace on day ${i + 1}.`,
      godTeaching: 'God is meeting me in small obediences.',
      hungerNotes: i % 3 === 0 ? 'Felt hunger during the midday window.' : 'Energy held steady.',
      victory: i % 2 === 0 ? 'Stayed present in prayer.' : 'Chose water over distraction.',
      tomorrowIntention: 'Return to scripture before breakfast.',
    });
    cursor.setDate(cursor.getDate() + 1);
    i++;
  }

  return {
    checkIns,
    journalEntries,
    badges: [],
    settings: {
      reminderTime: '07:00',
      theme: 'light',
      scriptureNote:
        'Scripture text uses NLT (New Living Translation) wording where available.',
    },
    activeJourneyId: 'fasted-journey',
    hasSeenTour: false,
    updatedAt: new Date().toISOString(),
  };
}

async function seedAndOpenTour(page: Page) {
  await page.addInitScript(
    ({ storageKey, installKey, seed }) => {
      localStorage.setItem(storageKey, JSON.stringify(seed));
      localStorage.setItem(installKey, '1');
    },
    {
      storageKey: STORAGE_KEY,
      installKey: INSTALL_TOAST_KEY,
      seed: buildSeedProgress(),
    },
  );

  await page.goto(`/?date=${FIXED_DATE}`);
  await page.waitForTimeout(1500);
}

async function waitForTourTarget(page: Page) {
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (!dialog) return false;
    return dialog.getAttribute('data-target-ready') !== 'false';
  });
}

async function assertNavVisible(page: Page) {
  const visibility = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Main navigation"]');
    return nav ? getComputedStyle(nav).visibility : null;
  });
  expect(visibility).toBe('visible');
}

async function screenshot(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  ✓ saved: ${name}.png`);
  return filePath;
}

const STEP_NAMES = [
  'step-1-welcome',
  'step-2-today-card',
  'step-3-checkin',
  'step-4-scripture',
  'step-5-prayer-focus',
  'step-6-journal',
  'step-7-progress',
  'step-8-groups',
  'step-9-done',
];

test.describe('Tour flow', () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test('captures each tour step', async ({ page }) => {
    await seedAndOpenTour(page);

    await expect(page.getByRole('dialog', { name: /welcome to fasted/i })).toBeVisible({
      timeout: 6000,
    });

    for (let i = 0; i < STEP_NAMES.length; i++) {
      await waitForTourTarget(page);
      if (STEP_NAMES[i].includes('journal') || STEP_NAMES[i].includes('progress') || STEP_NAMES[i].includes('groups')) {
        await assertNavVisible(page);
      }
      await screenshot(page, STEP_NAMES[i]);

      if (i < STEP_NAMES.length - 1) {
        const nextBtn = page.getByRole('button', { name: /next|get started/i }).last();
        await nextBtn.click();
      }
    }

    const beginBtn = page.getByRole('button', { name: /begin the journey/i });
    if (await beginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await beginBtn.click();
    }

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 4000 });

    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { hasSeenTour?: boolean }).hasSeenTour : false;
    }, STORAGE_KEY);
    expect(stored).toBe(true);
  });

  test('replay tour from settings', async ({ page }) => {
    await seedAndOpenTour(page);

    await expect(page.getByRole('dialog', { name: /welcome to fasted/i })).toBeVisible({
      timeout: 6000,
    });
    await page.getByRole('button', { name: /skip tour/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 4000 });

    await page.goto('/settings');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: /replay app tour/i }).click();

    await expect(page.getByRole('dialog', { name: /welcome to fasted/i })).toBeVisible({
      timeout: 6000,
    });
    await waitForTourTarget(page);

    await screenshot(page, 'settings-replay-tour');
  });
});
