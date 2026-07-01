import { expect, test } from '@playwright/test';
import {
  GROUP,
  GROUP_ID,
  mockGroupsApi,
  seedAuthSession,
} from './fixtures/groups-mock';
import { MAIN_NAV } from './fixtures/nav-overlap';

test.describe('Groups', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page);
  });

  test('hides Groups in main nav when user has no group memberships', async ({ page }) => {
    await mockGroupsApi(page, { myMemberships: [] });

    await page.goto('/');
    const nav = page.locator(MAIN_NAV);
    await expect(nav.getByRole('link', { name: 'Groups' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Settings' })).toHaveCount(0);
  });

  test('shows Groups in main nav when user has group memberships', async ({ page }) => {
    await mockGroupsApi(page, { myMemberships: [{ group_id: GROUP_ID }] });

    await page.goto('/');
    const groupsLink = page.locator(MAIN_NAV).getByRole('link', { name: 'Groups' });
    await expect(groupsLink).toBeVisible();
    await groupsLink.click();
    await expect(page).toHaveURL('/groups');
    await expect(page.getByRole('heading', { level: 2, name: 'Your Groups' })).toBeVisible();
  });

  test('shows Groups in main nav on mobile when user has group memberships', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockGroupsApi(page, { myMemberships: [{ group_id: GROUP_ID }] });

    await page.goto('/');
    const groupsLink = page.locator(MAIN_NAV).getByRole('link', { name: 'Groups' });
    await expect(groupsLink).toBeVisible();
  });

  test('hides Groups in main nav on mobile when user has no group memberships', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockGroupsApi(page, { myMemberships: [] });

    await page.goto('/');
    await expect(page.locator(MAIN_NAV).getByRole('link', { name: 'Groups' })).toHaveCount(0);
  });

  test('updates Groups nav after creating a group', async ({ page }) => {
    await mockGroupsApi(page, { myMemberships: [] });

    await page.goto('/');
    await expect(page.locator(MAIN_NAV).getByRole('link', { name: 'Groups' })).toHaveCount(0);

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
});
