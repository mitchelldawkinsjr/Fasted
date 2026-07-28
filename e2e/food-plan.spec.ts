import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'fasted-calendar-progress:guest';

test.beforeEach(async ({ page }) => {
  await page.goto('/journal');
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
  }, STORAGE_KEY);
  await page.reload();
});

test('Plan My Food tab shows phase rules and goal selection', async ({ page }) => {
  await page.getByRole('tab', { name: 'Plan My Food' }).click();
  await expect(page.getByRole('heading', { name: 'Plan My Food' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Current Phase Rules' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your Goal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lose body fat' })).toBeVisible();
});

test('saves food profile and kitchen inventory', async ({ page }) => {
  await page.getByRole('tab', { name: 'Plan My Food' }).click();

  await page.getByLabel('Age').fill('35');
  await page.getByLabel('Weight (lbs)').fill('170');
  await page.getByLabel('Height (in)').fill('68');
  await page.getByRole('button', { name: 'Save Profile' }).click();
  await expect(page.getByText('Food profile saved.')).toBeVisible();

  await page.getByRole('button', { name: /My Kitchen/ }).click();
  await page.getByLabel('Food item name').fill('Chicken breast');
  await page.getByRole('button', { name: 'Add to Kitchen' }).click();
  await expect(page.getByText('Chicken breast added to My Kitchen.')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored?.foodProfile?.age).toBe(35);
  expect(stored?.foodProfile?.weightLbs).toBe(170);
  expect(stored?.kitchenInventory).toHaveLength(1);
  expect(stored.kitchenInventory[0].name).toBe('Chicken breast');
});

test('generates meal plan from kitchen inventory', async ({ page }) => {
  await page.getByRole('tab', { name: 'Plan My Food' }).click();
  await page.getByRole('button', { name: /My Kitchen/ }).click();

  await page.getByRole('button', { name: '+ Chicken breast' }).click();
  await page.getByLabel('Food item name').fill('Broccoli');
  await page.getByLabel('Food category').selectOption('Vegetables');
  await page.getByRole('button', { name: 'Add to Kitchen' }).click();

  await expect(page.getByRole('heading', { name: "Today's Plan" })).toBeVisible();
  await expect(page.getByText('Suggested plate')).toBeVisible();
  await expect(page.getByText('Breakfast').first()).toBeVisible();
});

test('requests LLM meal ideas and can save a favorite', async ({ page }) => {
  await page.route('**/api/meal-ideas', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        meals: [
          {
            name: 'Garlic chicken bowl',
            label: 'Lunch',
            ingredients: ['Chicken breast', 'Broccoli', 'Brown rice'],
            portions: ['Chicken breast: 5–7 oz', 'Broccoli: 1½–2 cups', 'Brown rice: ½–1 cup'],
            prepSteps: ['Sear chicken', 'Roast broccoli', 'Serve over rice'],
            prepMinutes: 20,
            phaseNotes: 'Fits a regular eating day.',
          },
        ],
        remainingToday: 11,
      }),
    });
  });

  await page.getByRole('tab', { name: 'Plan My Food' }).click();
  await page.getByRole('button', { name: /My Kitchen/ }).click();
  await page.getByRole('button', { name: '+ Chicken breast' }).click();

  await page.getByRole('button', { name: 'Generate meal ideas' }).click();
  await expect(page.getByText('Garlic chicken bowl')).toBeVisible();
  await expect(page.getByText('~20 min')).toBeVisible();

  await page.getByRole('button', { name: 'Save favorite' }).click();
  await expect(page.getByRole('heading', { name: 'Saved meal ideas' })).toBeVisible();
  await expect(page.getByText('Garlic chicken bowl')).toHaveCount(2);
});

test('falls back to checklist when meal ideas API fails', async ({ page }) => {
  await page.route('**/api/meal-ideas', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Meal ideas unavailable. Showing your checklist instead.',
        fallback: true,
      }),
    });
  });

  await page.getByRole('tab', { name: 'Plan My Food' }).click();
  await page.getByRole('button', { name: 'Generate meal ideas' }).click();
  await expect(page.getByText(/Showing your checklist instead/i).first()).toBeVisible();
  await expect(page.getByText('Suggested plate')).toBeVisible();
});

test('saves food plan check-in', async ({ page }) => {
  await page.getByRole('tab', { name: 'Plan My Food' }).click();

  await page.getByText('Did you follow your planned meals?').locator('..').getByRole('button', { name: 'Yes' }).click();
  await page.getByText('How was your hunger?').locator('..').getByRole('button', { name: 'Manageable' }).click();
  await page.getByRole('button', { name: 'Save Check-in' }).click();
  await expect(page.getByText('Food check-in saved.')).toBeVisible();

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  expect(stored?.foodPlanCheckIns).toHaveLength(1);
  expect(stored.foodPlanCheckIns[0].followedPlan).toBe(true);
  expect(stored.foodPlanCheckIns[0].hunger).toBe('manageable');
});

test('reflections tab remains unchanged', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'My Reflections' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText('0 reflections')).toBeVisible();
  await page.getByRole('button', { name: '+ New' }).click();
  await expect(page.getByRole('heading', { name: 'New Reflection' })).toBeVisible();
});
