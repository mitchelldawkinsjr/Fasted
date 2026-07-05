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

  test('allows editing commitment duration minutes in create group modal', async ({ page }) => {
    let savedCommitments: Array<{ label: string; shape: string; target?: number }> = [];
    await mockGroupsApi(page, {
      myMemberships: [],
      onCommitmentsCreated: (commitments) => {
        savedCommitments = commitments as Array<{ label: string; shape: string; target?: number }>;
      },
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/groups');
    await page.getByRole('button', { name: 'Create Group' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create Group' });
    await dialog.getByPlaceholder('Summer Fast Cohort').fill('Duration Test Group');

    const moveDuration = dialog.getByRole('textbox', { name: 'Duration in minutes' }).first();
    await moveDuration.click();
    await moveDuration.fill('');
    await moveDuration.fill('45');
    await moveDuration.blur();
    await expect(moveDuration).toHaveValue('45');

    await dialog.getByRole('button', { name: 'Add commitment' }).click();
    const customRow = dialog.locator('li').last();
    await customRow.locator('select').selectOption('duration');
    const customDuration = customRow.getByRole('textbox', { name: 'Duration in minutes' });
    await expect(customDuration).toHaveValue('1');
    await customDuration.fill('20');
    await customDuration.blur();
    await expect(customDuration).toHaveValue('20');

    await dialog.getByRole('button', { name: 'Create Group' }).click();
    await expect(page).toHaveURL(new RegExp(`/groups/${GROUP_ID}$`));

    const moveCommitment = savedCommitments.find((item) => item.label === 'Move body daily');
    expect(moveCommitment?.target).toBe(45);
    const customCommitment = savedCommitments.find((item) => item.label === '');
    expect(customCommitment?.target).toBe(20);
  });

  test('shows validation feedback for invalid commitment duration', async ({ page }) => {
    await mockGroupsApi(page, { myMemberships: [] });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/groups');
    await page.getByRole('button', { name: 'Create Group' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create Group' });
    await dialog.getByPlaceholder('Summer Fast Cohort').fill('Invalid Duration Group');

    const moveDuration = dialog.getByRole('textbox', { name: 'Duration in minutes' }).first();
    await moveDuration.fill('');
    await moveDuration.blur();

    await expect(dialog.getByText('Enter a positive number of minutes.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Create Group' })).toBeDisabled();
  });
});
