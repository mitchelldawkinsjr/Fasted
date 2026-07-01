import { expect, type Locator, type Page } from '@playwright/test';

const TOLERANCE_PX = 2;

type DateInputBounds = {
  leftGap: number;
  rightGap: number;
  overflowRight: number;
  overflowLeft: number;
};

export async function getDateInputBounds(input: Locator): Promise<DateInputBounds> {
  return input.evaluate((el) => {
    const wrapper =
      el.closest('.overflow-hidden.rounded-xl') ??
      el.closest('label') ??
      el.parentElement;
    const container =
      wrapper?.closest('section.stitch-card, [role="dialog"]') ?? wrapper ?? el;
    const inputRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const style = window.getComputedStyle(container);
    const padLeft = Number.parseFloat(style.paddingLeft) || 0;
    const padRight = Number.parseFloat(style.paddingRight) || 0;
    const innerLeft = containerRect.left + padLeft;
    const innerRight = containerRect.right - padRight;

    const leftGap = inputRect.left - innerLeft;
    const rightGap = innerRight - inputRect.right;

    return {
      leftGap,
      rightGap,
      overflowRight: inputRect.right - innerRight,
      overflowLeft: innerLeft - inputRect.left,
    };
  });
}

export async function expectDateInputContained(
  page: Page,
  options: { label?: string; viewport?: { width: number; height: number } } = {},
) {
  if (options.viewport) {
    await page.setViewportSize(options.viewport);
  }

  const input = options.label
    ? page.getByLabel(options.label, { exact: true })
    : page.locator('input[type="date"]').first();
  await expect(input).toBeVisible();

  const bounds = await getDateInputBounds(input);
  expect(
    bounds.overflowRight,
    `Date input overflows right by ${bounds.overflowRight}px`,
  ).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(
    bounds.overflowLeft,
    `Date input overflows left by ${bounds.overflowLeft}px`,
  ).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(
    Math.abs(bounds.leftGap - bounds.rightGap),
    `Date input padding is asymmetric (left ${bounds.leftGap}px, right ${bounds.rightGap}px)`,
  ).toBeLessThanOrEqual(TOLERANCE_PX);
}
