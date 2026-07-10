#!/usr/bin/env node
/**
 * Capture UI screenshots for issue #153 / PR #154 (Web Push daily reminders).
 *
 * Usage (dev server already running):
 *   DEMO_BASE_URL=http://127.0.0.1:5180 node scripts/capture-issue-153-screenshots.mjs
 */
import { chromium } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const BASE = process.env.DEMO_BASE_URL || 'http://127.0.0.1:5180';
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'issue-153');
const STORAGE_KEY = 'fasted-calendar-progress:guest';

const seededProgress = {
  checkIns: [],
  checkInStreak: 0,
  journalEntries: [],
  mealImages: {},
  badges: [],
  settings: {
    reminderTime: '07:00',
    pushEnabled: false,
    theme: 'light',
    scriptureNote: '',
  },
  activeJourneyId: 'fasted-journey',
  journeys: [],
  hasSeenTour: true,
  pageToursSeen: { settings: true, calendar: true, progress: true, groups: true },
  updatedAt: '2026-07-10T12:00:00.000Z',
};

async function screenshot(page, filename) {
  const dest = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: dest, fullPage: false });
  console.log('saved', dest);
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
  });

  await context.addInitScript(
    ({ key, progress }) => {
      localStorage.setItem(key, JSON.stringify(progress));
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
      localStorage.setItem('fasted-calendar-reminder-prompt-dismissed', '1');
    },
    { key: STORAGE_KEY, progress: seededProgress },
  );

  const page = await context.newPage();
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });

  // Dismiss any leftover install / tour UI
  const skipTour = page.getByRole('button', { name: 'Skip tour' });
  if (await skipTour.isVisible().catch(() => false)) {
    await skipTour.click();
  }
  const dismissToast = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismissToast.isVisible().catch(() => false)) {
    await dismissToast.click();
  }

  await page.locator('#daily-reminders').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await screenshot(page, 'settings-daily-reminders.png');

  await page.getByRole('button', { name: 'Preview morning' }).click();
  await page.getByText('DEV preview · Morning reminder').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await screenshot(page, 'settings-preview-morning.png');

  await page.getByRole('button', { name: 'Preview evening' }).click();
  await page.getByText('DEV preview · Evening reminder').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await screenshot(page, 'settings-preview-evening.png');

  // Discovery toast on Today (same copy as ReminderPromptToast)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const { toast, dismissToast, getToasts } = await import('/src/lib/toast.ts');
    for (const t of getToasts()) dismissToast(t.id);
    toast.persistent({
      title: 'Daily reminders',
      message: 'Get a morning nudge to check your fast — turn it on in Settings.',
      type: 'info',
      position: 'bottom',
      actions: [
        { label: 'Open Settings', variant: 'primary', onClick: () => undefined },
        { label: 'Not now', variant: 'secondary', onClick: () => undefined },
      ],
    });
  });
  await page.getByText('Get a morning nudge to check your fast').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await screenshot(page, 'discovery-toast-today.png');

  await browser.close();
  console.log(`Saved screenshots to ${ARTIFACT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
