import { expect, test } from '@playwright/test';

const phaseCases = [
  {
    date: '2026-06-14',
    image: '/assets/phases/custom/phase-01-daniel-1-fast-pattern.png',
    instructions: ['Allowed food items: lean protein, vegetables, fruit, water.', 'Avoid: soda, candy, fast food.'],
  },
  {
    date: '2026-07-12',
    image: '/assets/phases/custom/phase-02-davids-fast-seeking-god.png',
    instructions: [
      'Allowed food items: lean protein, vegetables, fruit, water.',
      'Beverages: water, black coffee, unsweetened tea.',
    ],
  },
  {
    date: '2026-08-09',
    image: '/assets/phases/custom/phase-03-first-daniel-fast.png',
    instructions: [
      'Allowed food items: vegetables, fruit, beans, rice, oats, water.',
      'Avoid: meat, dairy, sweets, fried foods.',
    ],
  },
  {
    date: '2026-09-01',
    image: '/assets/phases/custom/phase-04-joel-repentance-fast.png',
    instructions: [
      'Allowed food items: whole, unprocessed foods, plenty of vegetables & greens, fruit in moderation, lean protein (fish, chicken, beans, lentils), whole grains (rice, oats, quinoa), plenty of water.',
      'Avoid: rich, indulgent foods.',
    ],
  },
  {
    date: '2026-09-28',
    image: '/assets/phases/custom/phase-05-isaiah-58-fast.png',
    instructions: [
      'Allowed food items: whole, unprocessed foods, plenty of vegetables & greens, fruit in moderation, lean protein (fish, chicken, beans, lentils), whole grains (rice, oats, quinoa), plenty of water.',
      'Avoid: rich, indulgent foods.',
    ],
  },
  {
    date: '2026-10-18',
    image: '/assets/phases/custom/phase-06-second-daniel-fast.png',
    instructions: [
      'Allowed food items: vegetables, fruit, beans, rice, oats, water.',
      'Take a daily walk as part of this phase.',
    ],
  },
  {
    date: '2026-11-09',
    image: '/assets/phases/custom/phase-07-esther-preparation-fast.png',
    instructions: [
      'Allowed food items: whole, unprocessed foods, plenty of vegetables & greens, fruit in moderation, lean protein (fish, chicken, beans, lentils), whole grains (rice, oats, quinoa), plenty of water.',
      'Avoid: rich, indulgent foods.',
    ],
  },
  {
    date: '2026-12-01',
    image: '/assets/phases/custom/phase-08-year-end-consecration.png',
    instructions: [
      'Allowed food items: whole, unprocessed foods, plenty of vegetables & greens, fruit in moderation, lean protein (fish, chicken, beans, lentils), whole grains (rice, oats, quinoa), healthy fats (nuts, seeds, avocado, olive oil), plenty of water.',
      'Avoid: rich, indulgent choices.',
    ],
  },
];

test.describe('Fasted journey phase images and instructions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    });
  });

  for (const phaseCase of phaseCases) {
    test(`uses custom image and food instructions on ${phaseCase.date}`, async ({ page }) => {
      await page.goto(`/?date=${phaseCase.date}`);
      await page.waitForLoadState('networkidle');

      const phaseImage = page.getByRole('button', { name: /View .* image/ }).locator('img');
      await expect(phaseImage).toHaveAttribute('src', phaseCase.image);

      const instructionsList = page.getByTestId('today-instructions-list');
      for (const instruction of phaseCase.instructions) {
        await expect(instructionsList).toContainText(instruction);
      }
    });
  }
});
