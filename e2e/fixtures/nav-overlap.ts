import { expect, type Locator, type Page } from '@playwright/test';

export const MAIN_NAV = 'nav[aria-label="Main navigation"]';

/** Bottom edge of an element vs top of the bottom nav (positive = overlaps nav band). */
export async function overlapWithNavPx(page: Page, locator: Locator): Promise<number> {
  return locator.evaluate((el) => {
    const nav = document.querySelector('nav[aria-label="Main navigation"]');
    if (!nav) return 0;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return Math.max(0, elRect.bottom - navRect.top);
  });
}

/** Whether the nav intercepts pointer events at the bottom-center of the target element. */
export async function navCoversElementBottom(page: Page, locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const nav = document.querySelector('nav[aria-label="Main navigation"]');
    if (!nav) return false;
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 2);
    return !!(hit && (hit === nav || nav.contains(hit)));
  });
}

/** Element fully within the viewport without calling scrollIntoView. */
export async function isFullyInViewport(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  });
}

export async function expectAboveMainNav(page: Page, locator: Locator, label: string) {
  const nav = page.locator(MAIN_NAV);
  const navBox = await nav.boundingBox();
  const elBox = await locator.boundingBox();
  expect(navBox, `${label}: main nav should exist`).not.toBeNull();
  expect(elBox, `${label}: target should exist`).not.toBeNull();
  expect(
    elBox!.y + elBox!.height,
    `${label} should sit above the bottom nav`,
  ).toBeLessThanOrEqual(navBox!.y + 2);
}

export async function expectNotCoveredByNav(page: Page, locator: Locator, label: string) {
  const covered = await navCoversElementBottom(page, locator);
  expect(covered, `${label} should not be covered by the bottom nav`).toBe(false);
}
