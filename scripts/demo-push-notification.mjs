#!/usr/bin/env node
/**
 * Headed Playwright demo: open Fasted Settings and show sample reminder notifications.
 *
 * Usage: node scripts/demo-push-notification.mjs
 */
import { chromium } from '@playwright/test';

const BASE = process.env.DEMO_BASE_URL || 'http://localhost:5173';

const browser = await chromium.launch({
  headless: false,
  slowMo: 80,
});

const context = await browser.newContext({
  viewport: { width: 420, height: 860 },
  permissions: ['notifications'],
});

await context.addInitScript(() => {
  localStorage.setItem(
    'fasted-calendar-progress:guest',
    JSON.stringify({
      checkIns: [],
      checkInStreak: 0,
      journalEntries: [],
      mealImages: {},
      badges: [],
      settings: {
        reminderTime: '07:00',
        pushEnabled: true,
        theme: 'light',
        scriptureNote: '',
      },
      activeJourneyId: 'fasted-journey',
      journeys: [],
      hasSeenTour: true,
      pageToursSeen: { settings: true, calendar: true, progress: true, groups: true },
    }),
  );
});

const page = await context.newPage();
await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });

const permission = await page.evaluate(() => Notification.permission);
console.log('Notification.permission =', permission);

// Morning sample (same copy as the real Web Push payload)
await page.evaluate(() => {
  const n = new Notification('Fasted', {
    body: 'Good morning — don’t forget to check your fast for today.',
    icon: '/icon-192.png',
    tag: 'fasted-demo-morning',
  });
  n.onclick = () => {
    window.focus();
    window.location.href = '/';
  };
});
console.log('Shown morning sample…');
await page.waitForTimeout(4500);

// Evening sample
await page.evaluate(() => {
  const n = new Notification('Fasted', {
    body: 'Still time to check in and reflect on today’s fast.',
    icon: '/icon-192.png',
    tag: 'fasted-demo-evening',
  });
  n.onclick = () => {
    window.focus();
    window.location.href = '/';
  };
});
console.log('Shown evening sample. Leaving browser open for 45s — check the macOS banner / Notification Center.');
await page.waitForTimeout(45000);

await browser.close();
