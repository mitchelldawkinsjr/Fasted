/**
 * First-visit page mini-tours (settings, calendar, progress, groups).
 */

import { expect, test } from '@playwright/test';
import { FIXED_DATE, INSTALL_TOAST_KEY, STORAGE_KEY } from './fixtures/constants';
import { mockGroupsApi, seedAuthSession, USER_ID } from './fixtures/groups-mock';

function seedProgress(overrides: Record<string, unknown> = {}) {
  return {
    checkIns: [],
    journalEntries: [],
    badges: [],
    settings: { reminderTime: '07:00', theme: 'light', scriptureNote: '' },
    activeJourneyId: 'fasted-journey',
    hasSeenTour: true,
    pageToursSeen: {},
    ...overrides,
  };
}

test.describe('Page mini-tours', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('calendar page tour on first visit', async ({ page }) => {
    await page.addInitScript(
      ({ storageKey, installKey, seed }) => {
        localStorage.setItem(storageKey, JSON.stringify(seed));
        localStorage.setItem(installKey, '1');
      },
      { storageKey: STORAGE_KEY, installKey: INSTALL_TOAST_KEY, seed: seedProgress() },
    );

    await page.goto(`/calendar?date=${FIXED_DATE}`);
    const started = Date.now();
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"][data-target-ready="true"]');
      return Boolean(dialog);
    });
    expect(Date.now() - started).toBeLessThan(1500);
    await expect(page.getByRole('dialog', { name: /reading the calendar/i })).toBeVisible();
    await page.getByRole('button', { name: /^next$/i }).click();
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      return dialog?.getAttribute('data-target-ready') === 'true';
    });
    await expect(page.getByRole('dialog', { name: /tap any day/i })).toBeVisible();

    const layout = await page.evaluate(() => {
      const target = document.querySelector('[data-tour=calendar-grid]');
      const dialog = document.querySelector('[role=dialog][data-tour-dialog]');
      const nav = document.querySelector('nav[aria-label="Main navigation"]');
      if (!target || !dialog || !nav) return null;
      const tr = target.getBoundingClientRect();
      const dr = dialog.getBoundingClientRect();
      const nr = nav.getBoundingClientRect();
      return {
        targetHeight: tr.height,
        dialogBottom: dr.bottom,
        navTop: nr.top,
      };
    });
    expect(layout).not.toBeNull();
    expect(layout!.targetHeight).toBeLessThan(600);
    expect(layout!.dialogBottom).toBeLessThanOrEqual(layout!.navTop);

    await page.getByRole('button', { name: /^done$/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { pageToursSeen?: { calendar?: boolean } }).pageToursSeen : {};
    }, STORAGE_KEY);
    expect(stored?.calendar).toBe(true);
  });

  test('settings page tour on first visit', async ({ page }) => {
    await page.addInitScript(
      ({ storageKey, installKey, seed }) => {
        localStorage.setItem(storageKey, JSON.stringify(seed));
        localStorage.setItem(installKey, '1');
      },
      { storageKey: STORAGE_KEY, installKey: INSTALL_TOAST_KEY, seed: seedProgress() },
    );

    await page.goto('/settings');
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (!dialog) return false;
      return dialog.getAttribute('data-target-ready') !== 'false';
    });
    await expect(page.getByRole('dialog', { name: /sign in & sync/i })).toBeVisible();
    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByRole('dialog', { name: /your journeys/i })).toBeVisible();
    await page.getByRole('button', { name: /^done$/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { pageToursSeen?: { settings?: boolean } }).pageToursSeen : {};
    }, STORAGE_KEY);
    expect(stored?.settings).toBe(true);
  });

  test('groups page tour on first visit when signed in', async ({ page }) => {
    await seedAuthSession(page);
    await mockGroupsApi(page, { myMemberships: [] });

    const userProgressKey = `fasted-calendar-progress:${USER_ID}`;
    await page.addInitScript(
      ({ userKey, guestKey, installKey, seed }) => {
        localStorage.setItem(userKey, JSON.stringify(seed));
        localStorage.setItem(guestKey, JSON.stringify(seed));
        localStorage.setItem(installKey, '1');
      },
      {
        userKey: userProgressKey,
        guestKey: STORAGE_KEY,
        installKey: INSTALL_TOAST_KEY,
        seed: seedProgress(),
      },
    );

    await page.goto('/groups');

    const started = Date.now();
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"][data-target-ready="true"]');
      return Boolean(dialog);
    });
    expect(Date.now() - started).toBeLessThan(1500);

    await expect(page.getByRole('dialog', { name: /create a group/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Your Groups' })).toBeVisible();

    const step1Layout = await page.evaluate(() => {
      const target = document.querySelector('[data-tour=groups-create]');
      const dialog = document.querySelector('[role=dialog][data-tour-dialog]');
      const nav = document.querySelector('nav[aria-label="Main navigation"]');
      if (!target || !dialog || !nav) return null;
      const tr = target.getBoundingClientRect();
      const dr = dialog.getBoundingClientRect();
      const nr = nav.getBoundingClientRect();
      return { targetHeight: tr.height, dialogBottom: dr.bottom, navTop: nr.top };
    });
    expect(step1Layout).not.toBeNull();
    expect(step1Layout!.targetHeight).toBeGreaterThan(32);
    expect(step1Layout!.dialogBottom).toBeLessThanOrEqual(step1Layout!.navTop);

    await page.getByRole('button', { name: /^next$/i }).click();
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"][data-target-ready="true"]');
      return dialog?.getAttribute('aria-label') === 'Join with a Code';
    });
    await expect(page.getByRole('dialog', { name: /join with a code/i })).toBeVisible();

    const step2Layout = await page.evaluate(() => {
      const target = document.querySelector('[data-tour=groups-join]');
      const dialog = document.querySelector('[role=dialog][data-tour-dialog]');
      const nav = document.querySelector('nav[aria-label="Main navigation"]');
      if (!target || !dialog || !nav) return null;
      const dr = dialog.getBoundingClientRect();
      const nr = nav.getBoundingClientRect();
      return { dialogBottom: dr.bottom, navTop: nr.top };
    });
    expect(step2Layout).not.toBeNull();
    expect(step2Layout!.dialogBottom).toBeLessThanOrEqual(step2Layout!.navTop);

    await page.getByRole('button', { name: /^done$/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const stored = await page.evaluate(
      ({ userKey, guestKey }) => {
        const raw = localStorage.getItem(userKey) ?? localStorage.getItem(guestKey);
        return raw ? (JSON.parse(raw) as { pageToursSeen?: { groups?: boolean } }).pageToursSeen : {};
      },
      { userKey: userProgressKey, guestKey: STORAGE_KEY },
    );
    expect(stored?.groups).toBe(true);
  });

  test('groups page tour does not run when redirected to sign in', async ({ page }) => {
    await mockGroupsApi(page, { myMemberships: [] });
    await page.addInitScript(
      ({ storageKey, installKey, seed }) => {
        localStorage.setItem(storageKey, JSON.stringify(seed));
        localStorage.setItem(installKey, '1');
      },
      { storageKey: STORAGE_KEY, installKey: INSTALL_TOAST_KEY, seed: seedProgress() },
    );

    await page.goto('/groups');
    await expect(page.getByRole('dialog', { name: /create a group/i })).toHaveCount(0, {
      timeout: 6000,
    });

    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { pageToursSeen?: { groups?: boolean } }).pageToursSeen : {};
    }, STORAGE_KEY);
    expect(stored?.groups).toBeUndefined();
  });

  test('progress page tour on first visit', async ({ page }) => {
    await page.addInitScript(
      ({ storageKey, installKey, seed }) => {
        localStorage.setItem(storageKey, JSON.stringify(seed));
        localStorage.setItem(installKey, '1');
      },
      { storageKey: STORAGE_KEY, installKey: INSTALL_TOAST_KEY, seed: seedProgress() },
    );

    await page.goto(`/progress?date=${FIXED_DATE}`);
    await expect(page.getByRole('dialog', { name: /your streaks/i })).toBeVisible({
      timeout: 6000,
    });
    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByRole('dialog', { name: /mood trends/i })).toBeVisible();
    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByRole('dialog', { name: /sacred milestones/i })).toBeVisible();
    await page.getByRole('button', { name: /^done$/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('does not replay page tour after seen', async ({ page }) => {
    await page.addInitScript(
      ({ storageKey, installKey, seed }) => {
        localStorage.setItem(storageKey, JSON.stringify(seed));
        localStorage.setItem(installKey, '1');
      },
      {
        storageKey: STORAGE_KEY,
        installKey: INSTALL_TOAST_KEY,
        seed: seedProgress({ pageToursSeen: { calendar: true } }),
      },
    );

    await page.goto(`/calendar?date=${FIXED_DATE}`);
    await page.waitForTimeout(1500);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
