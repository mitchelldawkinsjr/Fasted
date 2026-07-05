/**
 * Diagnostic spec for bottom-nav tour steps.
 * Run: npx playwright test e2e/tour-nav-debug.spec.ts --project=desktop
 */

import { expect, test } from '@playwright/test';
import { FIXED_DATE, INSTALL_TOAST_KEY, STORAGE_KEY } from './fixtures/constants';

const NAV_STEPS = [
  { name: 'journal', dialog: /journal your journey/i, tourId: 'nav-journal' },
  { name: 'progress', dialog: /track your progress/i, tourId: 'nav-progress' },
  { name: 'groups', dialog: /fast together/i, tourId: 'nav-groups' },
];

test.describe('Tour nav diagnostics', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const navStep of NAV_STEPS) {
    test(`${navStep.name} nav step shows icons and nav bar`, async ({ page }) => {
      await page.addInitScript(
        ({ storageKey, installKey }) => {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              checkIns: [],
              journalEntries: [],
              badges: [],
              settings: { reminderTime: '07:00', theme: 'light', scriptureNote: '' },
              activeJourneyId: 'fasted-journey',
              hasSeenTour: false,
            }),
          );
          localStorage.setItem(installKey, '1');
        },
        { storageKey: STORAGE_KEY, installKey: INSTALL_TOAST_KEY },
      );

      await page.goto(`/?date=${FIXED_DATE}`);
      await page.waitForTimeout(1200);

      // Advance to target nav step
      while (true) {
        const dialog = page.getByRole('dialog');
        if (!(await dialog.isVisible().catch(() => false))) break;

        const title = await dialog.getAttribute('aria-label');
        if (title && navStep.dialog.test(title)) break;

        const next = page.getByRole('button', { name: /next|get started|begin the journey/i }).last();
        if (!(await next.isVisible().catch(() => false))) break;
        await next.click();
        await page.waitForTimeout(400);
      }

      await expect(page.getByRole('dialog', { name: navStep.dialog })).toBeVisible();

      const diagnostics = await page.evaluate((tourId) => {
        const nav = document.querySelector('nav[aria-label="Main navigation"]');
        const link = document.querySelector(`[data-tour="${tourId}"]`);
        const icon = link?.querySelector('.material-symbols-outlined');
        const label = link?.querySelector('span');
        const navStyle = nav ? getComputedStyle(nav) : null;
        const linkStyle = link ? getComputedStyle(link) : null;

        return {
          scrollY: window.scrollY,
          innerHeight: window.innerHeight,
          nav: nav
            ? {
                rect: nav.getBoundingClientRect().toJSON(),
                zIndex: navStyle?.zIndex,
                visibility: navStyle?.visibility,
                opacity: navStyle?.opacity,
                display: navStyle?.display,
              }
            : null,
          link: link
            ? {
                rect: link.getBoundingClientRect().toJSON(),
                iconRect: icon?.getBoundingClientRect().toJSON(),
                labelText: label?.textContent,
                iconText: icon?.textContent,
              }
            : null,
        };
      }, navStep.tourId);

      console.log(JSON.stringify(diagnostics, null, 2));

      expect(diagnostics.nav).not.toBeNull();
      expect(diagnostics.link).not.toBeNull();
      expect(diagnostics.nav!.visibility).toBe('visible');

      const navBottom = diagnostics.nav!.rect.bottom;
      expect(navBottom).toBeGreaterThan(diagnostics.innerHeight - 20);

      const iconHeight = diagnostics.link?.iconRect?.height ?? 0;
      expect(iconHeight).toBeGreaterThan(10);

      await page.screenshot({
        path: `e2e/tour-screenshots/debug-${navStep.name}-nav.png`,
        fullPage: false,
      });
    });
  }
});
