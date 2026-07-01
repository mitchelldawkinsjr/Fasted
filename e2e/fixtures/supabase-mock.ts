import type { Page } from '@playwright/test';

/** Stub Supabase network calls so visual and audit runs stay deterministic offline. */
export async function mockSupabaseOffline(page: Page) {
  await page.route('**/*supabase*/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}
