/**
 * Legacy one-off capture for issue #81 (journal PDF export).
 * Prefer npm run capture:issue-screenshots with a registered scenario when possible.
 */
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const STORAGE_KEY = 'fasted-calendar-progress:guest';
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'issue-81');
const PREVIEW_URL = 'http://127.0.0.1:4174';

const seededProgress = {
  checkIns: [],
  checkInStreak: 0,
  journalEntries: [
    {
      id: 'entry-1',
      date: '2026-06-20',
      type: 'daily-reflection',
      updatedAt: '2026-06-20T20:00:00.000Z',
      dayMood: 'good',
      prayerFocus: 'Trust the Lord with all your heart.',
      prayedAbout: 'Wisdom for the fast and patience with family.',
      godTeaching: 'Proverbs 3:5-6 reminded me to lean on God.',
      hungerNotes: 'Felt clear-headed after morning prayer.',
      victory: 'Drank only water and stayed present in prayer.',
      tomorrowIntention: 'Wake early for quiet time before work.',
    },
    {
      id: 'entry-2',
      date: '2026-06-22',
      type: 'prayer',
      updatedAt: '2026-06-22T20:00:00.000Z',
      content: 'Thankful for strength on day three of the fast.',
    },
    {
      id: 'entry-3',
      date: '2026-06-24',
      type: 'gratitude',
      updatedAt: '2026-06-24T20:00:00.000Z',
      content: 'Grateful for community encouragement in our group chat.',
    },
  ],
  badges: [],
  settings: {
    reminderTime: '07:00',
    theme: 'light',
    scriptureNote: 'Seed data for journal PDF export screenshots.',
  },
  activeJourneyId: 'fasted-journey',
  updatedAt: '2026-06-24T12:00:00.000Z',
};

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function seedStorage(page) {
  await page.goto(`${PREVIEW_URL}/`);
  await page.evaluate(
    ({ key, progress }) => {
      localStorage.setItem(key, JSON.stringify(progress));
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    },
    { key: STORAGE_KEY, progress: seededProgress },
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4174'], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  try {
    await waitForServer(PREVIEW_URL);

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    await context.addInitScript(() => {
      window.print = () => undefined;
    });
    const page = await context.newPage();
    await seedStorage(page);

    await page.goto(`${PREVIEW_URL}/journal`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'journal-pdf-export-button.png'),
      fullPage: true,
    });

    await page.goto(`${PREVIEW_URL}/settings`);
    await page.waitForLoadState('networkidle');
    const backupSection = page.locator('section').filter({ hasText: 'JOURNAL BACKUP' });
    await backupSection.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'settings-journal-pdf-export.png'),
      fullPage: true,
    });

    await page.goto(`${PREVIEW_URL}/journal/print`);
    await page.waitForLoadState('networkidle');
    await page.getByText('My Spiritual Journal').waitFor({ state: 'visible', timeout: 15_000 });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'journal-print-cover.png'),
      fullPage: false,
    });

    await page.locator('.print-entry').first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'journal-print-entry.png'),
      fullPage: false,
    });

    await browser.close();
    console.log(`Saved screenshots to ${ARTIFACT_DIR}`);
  } finally {
    preview.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
