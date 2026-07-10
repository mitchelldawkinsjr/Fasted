#!/usr/bin/env node
import { chromium } from '@playwright/test';

const BASE = process.env.DEMO_BASE_URL || 'http://127.0.0.1:5180';

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const context = await browser.newContext({ viewport: { width: 420, height: 900 } });

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
        pushEnabled: false,
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

const morning = page.getByRole('button', { name: 'Preview morning' });
await morning.waitFor({ state: 'visible', timeout: 10000 });
await morning.click();
console.log('Clicked Preview morning — banner should be visible.');
await page.waitForTimeout(4000);

await page.getByRole('button', { name: 'Preview evening' }).click();
console.log('Clicked Preview evening — banner should update.');
await page.waitForTimeout(45000);

await browser.close();
