import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'fasted-calendar-progress:guest';

test.describe('custom journey builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.evaluate((key) => {
      localStorage.removeItem(key);
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    }, STORAGE_KEY);
    await page.reload();
  });

  test('creates a custom journey and persists Today instructions after reload', async ({ page }) => {
    await page.getByRole('button', { name: /Create custom journey/i }).click();

    await page.getByLabel('Journey name').fill('Neighborhood Fast');
    await page.getByRole('textbox', { name: 'Start date', exact: true }).fill('2026-07-06');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByLabel('Phase title').fill('Neighborhood Intercession');
    await page.getByLabel('Duration (days)').fill('5');
    await page.getByLabel('Prayer focus (required)').fill('Neighbors\nCourage');
    await page.getByLabel('Allowed foods').fill('Vegetables\nLean protein');
    await page.getByLabel('Avoid foods').fill('Candy\nSoda');
    await page.getByLabel('Beverages').fill('Water');
    await page.getByLabel('Daily readings').fill('Nehemiah 1');
    await page.getByLabel('Scripture reference').fill('Nehemiah 1:4');
    await page.getByText('Optional instruction overrides').click();
    await page.getByLabel('Instructions every day').fill('Invite one neighbor into prayer.');
    await page.getByLabel('Fast day instructions').fill('Pray for three families by name.');

    await page.getByRole('button', { name: 'Review' }).click();
    await expect(page.getByText('Neighborhood Intercession')).toBeVisible();
    await expect(page.getByText(/Monday, July 6, 2026.*Friday, July 10, 2026/)).toBeVisible();
    await page.getByRole('button', { name: 'Start Journey' }).click();

    await expect(page.getByText('Custom journey saved.')).toBeVisible();

    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, STORAGE_KEY);
    const customJourney = stored.journeys.find((journey: { name: string }) => journey.name === 'Neighborhood Fast');
    expect(stored.activeJourneyId).toBe(customJourney.id);
    expect(customJourney.phases).toHaveLength(1);
    expect(customJourney.phases[0].templateId).toBeUndefined();
    expect(customJourney.phases[0].startDate).toBe('2026-07-06');
    expect(customJourney.phases[0].endDate).toBe('2026-07-10');
    expect(customJourney.phases[0].content.scheduleSummary).toContain('Wednesday');

    await page.goto('/?date=2026-07-08');
    const instructions = page.getByTestId('today-instructions-list');
    await expect(page.getByText('Phase 1: Neighborhood Intercession')).toBeVisible();
    await expect(instructions).toContainText('Sunrise-to-sunset fast today—water only.');
    await expect(instructions).toContainText('Beverages: water.');
    await expect(instructions).toContainText('Invite one neighbor into prayer.');
    await expect(instructions).toContainText('Pray for three families by name.');
    await expect(page.getByText('Neighbors')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Phase 1: Neighborhood Intercession')).toBeVisible();
    await expect(page.getByTestId('today-instructions-list')).toContainText(
      'Pray for three families by name.',
    );
  });
});
