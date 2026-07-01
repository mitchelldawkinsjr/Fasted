import { expect, test } from '@playwright/test';
import {
  AUTH_STORAGE_KEY,
  GROUP,
  GROUP_ID,
  mockGroupsApi,
  seedAuthSession,
} from './fixtures/groups-mock';

test.describe('Groups', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthSession(page);
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
