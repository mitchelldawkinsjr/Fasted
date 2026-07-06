import { expect, test } from '@playwright/test';
import {
  GROUP,
  GROUP_ID,
  mockGroupsApi,
  seedAuthSession,
} from './fixtures/groups-mock';
import { MAIN_NAV } from './fixtures/nav-overlap';
import { MOBILE_SMOKE_VIEWPORTS } from './fixtures/viewports';

const NAV_VIEWPORTS = [{ name: 'desktop', width: 1280, height: 720 }, ...MOBILE_SMOKE_VIEWPORTS];

test.describe('Groups', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page);
  });

  test('shows Groups in main nav by default without group memberships', async ({ page }) => {
    await mockGroupsApi(page, { myMemberships: [] });

    for (const viewport of NAV_VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      const nav = page.locator(MAIN_NAV);
      await expect(nav.getByRole('link', { name: 'Groups' })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Settings' })).toHaveCount(0);
    }
  });

  test('navigates to groups from the main nav', async ({ page }) => {
    await mockGroupsApi(page, { myMemberships: [{ group_id: GROUP_ID }] });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    const groupsLink = page.locator(MAIN_NAV).getByRole('link', { name: 'Groups' });
    await expect(groupsLink).toBeVisible();
    await groupsLink.click();
    await expect(page).toHaveURL('/groups');
    await expect(page.getByRole('heading', { level: 2, name: 'Your Groups' })).toBeVisible();
  });

  test('updates Groups nav after creating a group', async ({ page }) => {
    await mockGroupsApi(page, { myMemberships: [] });

    await page.goto('/');
    await expect(page.locator(MAIN_NAV).getByRole('link', { name: 'Groups' })).toBeVisible();

    await page.goto('/groups');
    await page.getByRole('button', { name: 'Create Group' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create Group' });
    await dialog.getByPlaceholder('Summer Fast Cohort').fill('Summer Fast Cohort');
    await dialog.getByRole('button', { name: 'Create Group' }).click();

    await expect(page).toHaveURL(new RegExp(`/groups/${GROUP_ID}$`));
    await expect(page.locator(MAIN_NAV).getByRole('link', { name: 'Groups' })).toBeVisible();
  });

  test('creates a group and navigates to group detail', async ({ page }) => {
    await mockGroupsApi(page);

    await page.goto('/groups');
    await page.getByRole('button', { name: 'Create Group' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create Group' });
    await dialog.getByPlaceholder('Summer Fast Cohort').fill('Summer Fast Cohort');
    await dialog.getByRole('button', { name: 'Create Group' }).click();

    await expect(page).toHaveURL(new RegExp(`/groups/${GROUP_ID}$`));
    await expect(page.getByRole('heading', { name: GROUP.name })).toBeVisible();
  });

  test('lists created groups on the hub page', async ({ page }) => {
    await mockGroupsApi(page, { myMemberships: [{ group_id: GROUP_ID }] });

    await page.goto('/groups');
    await expect(page.getByRole('link', { name: new RegExp(GROUP.name) })).toBeVisible();
  });

  test('shows a friendly message when group_commitments table is missing', async ({ page }) => {
    await mockGroupsApi(page, { missingGroupCommitments: true });

    await page.goto('/groups');
    await page.getByRole('button', { name: 'Create Group' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create Group' });
    await dialog.getByPlaceholder('Summer Fast Cohort').fill('Test Group');
    await dialog.getByRole('button', { name: 'Create Group' }).click();

    await expect(
      page.getByText(
        'Group features are temporarily unavailable. The server database needs an update — please try again later or contact support.',
      ),
    ).toBeVisible();
    await expect(page.getByText("Could not find the table 'public.group_commitments'")).toHaveCount(0);
  });

  test('allows editing custom journey phase duration when creating a group', async ({ page }) => {
    let savedJourney: { phases?: Array<{ startDate: string; endDate: string }> } = {};
    await mockGroupsApi(page, {
      myMemberships: [],
      onJourneyCreated: (journey) => {
        savedJourney = journey as typeof savedJourney;
      },
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/groups');
    await page.getByRole('button', { name: 'Create Group' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create Group' });
    await dialog.getByPlaceholder('Summer Fast Cohort').fill('Custom Duration Group');
    await dialog.getByRole('radio', { name: 'Custom journey' }).check();
    await dialog.getByRole('button', { name: 'Configure Custom Journey' }).click();

    const builder = page.getByRole('dialog', { name: 'Group Journey' });
    await builder.getByLabel('Journey name').fill('Summer Cohort Journey');
    await builder.getByRole('textbox', { name: 'Start date', exact: true }).fill('2026-08-01');
    await builder.getByRole('button', { name: 'Next' }).click();

    const duration = builder.getByRole('textbox', { name: 'Duration (days)' });
    await duration.click();
    await duration.fill('');
    await duration.fill('14');
    await duration.blur();
    await expect(duration).toHaveValue('14');

    await builder.getByRole('button', { name: 'Review' }).click();
    await builder.getByRole('button', { name: 'Create Group' }).click();

    await expect(page).toHaveURL(new RegExp(`/groups/${GROUP_ID}$`));
    const phase = savedJourney.phases?.[0];
    expect(phase?.startDate).toBe('2026-08-01');
    expect(phase?.endDate).toBe('2026-08-14');
  });

  test('shows validation feedback for invalid custom journey phase duration', async ({ page }) => {
    await mockGroupsApi(page, { myMemberships: [] });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/groups');
    await page.getByRole('button', { name: 'Create Group' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create Group' });
    await dialog.getByPlaceholder('Summer Fast Cohort').fill('Invalid Duration Group');
    await dialog.getByRole('radio', { name: 'Custom journey' }).check();
    await dialog.getByRole('button', { name: 'Configure Custom Journey' }).click();

    const builder = page.getByRole('dialog', { name: 'Group Journey' });
    await builder.getByLabel('Journey name').fill('Invalid Journey');
    await builder.getByRole('textbox', { name: 'Start date', exact: true }).fill('2026-08-01');
    await builder.getByRole('button', { name: 'Next' }).click();

    const duration = builder.getByRole('textbox', { name: 'Duration (days)' });
    await duration.fill('');
    await duration.blur();

    await expect(builder.getByText('Enter a positive number of days.')).toBeVisible();
    await expect(builder.getByRole('button', { name: 'Review' })).toBeDisabled();
  });
});
