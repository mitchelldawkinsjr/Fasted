/**
 * Tour screenshot spec.
 *
 * Seeds the guest account with realistic progress data, clears the tour-seen
 * flag so the overlay auto-opens, then advances through every step and saves
 * a screenshot of each one.
 *
 * Screenshots land in e2e/tour-screenshots/.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_KEY = 'fasted-calendar-progress:guest';
const TOUR_KEY = 'fasted-tour-v1';
const INSTALL_DISMISS_KEY = 'fasted-calendar-install-toast-dismissed';
const SCREENSHOT_DIR = path.join(__dirname, 'tour-screenshots');

/**
 * Build realistic guest progress. We use activeJourneyId 'fasted-journey'
 * (the app default that starts 2026-06-13) and omit the journeys array so the
 * app falls back to its built-in template.
 */
function buildSeedProgress() {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Journey starts 2026-06-13 — seed check-ins from day 1 through yesterday
  const start = new Date('2026-06-13');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const checkIns: object[] = [];
  const journalEntries: object[] = [];
  const moods = ['good', 'amazing', 'okay', 'good', 'bad', 'okay', 'amazing'];

  let cursor = new Date(start);
  let i = 0;
  while (cursor <= yesterday) {
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
    // Use the app-built-in journey (omit journeys array so loadRaw uses default)
    activeJourneyId: 'fasted-journey',
    updatedAt: new Date().toISOString(),
  };
}

async function seedAndOpenTour(page: Page) {
  await page.goto('/');

  await page.evaluate(
    ({ storageKey, tourKey, installKey, seed }) => {
      localStorage.setItem(storageKey, JSON.stringify(seed));
      localStorage.removeItem(tourKey);
      localStorage.setItem(installKey, '1');
    },
    {
      storageKey: STORAGE_KEY,
      tourKey: TOUR_KEY,
      installKey: INSTALL_DISMISS_KEY,
      seed: buildSeedProgress(),
    },
  );

  await page.reload();
  // Tour fires 800ms after mount; give it comfortable headroom
  await page.waitForTimeout(1500);
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
  'step-4-journal',
  'step-5-progress',
  'step-6-done',
];

test.describe('Tour flow screenshots', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
  });

  test('captures each tour step', async ({ page }) => {
    await seedAndOpenTour(page);

    // Verify tour opened
    await expect(
      page.getByRole('dialog', { name: /welcome to fasted calendar/i }),
    ).toBeVisible({ timeout: 6000 });

    for (let i = 0; i < STEP_NAMES.length; i++) {
      await screenshot(page, STEP_NAMES[i]);

      if (i < STEP_NAMES.length - 1) {
        // Click Next / Get Started — whichever is present
        const nextBtn = page
          .getByRole('button', { name: /next|get started/i })
          .last();
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Click final CTA
    const beginBtn = page.getByRole('button', { name: /begin the journey/i });
    if (await beginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await beginBtn.click();
    }

    // Tour overlay should disappear
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 4000 });
    console.log('\n  ✓ Tour completed — overlay dismissed');
  });

  test('replay tour from settings', async ({ page }) => {
    await seedAndOpenTour(page);

    // Skip through the whole tour
    const skipBtn = page.getByRole('button', { name: /skip tour/i });
    await expect(skipBtn).toBeVisible({ timeout: 6000 });
    await skipBtn.click();

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 4000 });

    // Open settings and replay
    await page.goto('/settings');
    await page.getByRole('button', { name: /replay app tour/i }).click();

    await expect(
      page.getByRole('dialog', { name: /welcome to fasted calendar/i }),
    ).toBeVisible({ timeout: 4000 });

    await screenshot(page, 'settings-replay-tour');
  });
});
