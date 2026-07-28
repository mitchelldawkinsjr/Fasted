import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const PREVIEW_URL = 'http://127.0.0.1:4174';
const RELEASE_NOTES_PATH = 'public/releaseNotes.json';
const INDEX_HTML_PATH = 'index.html';
const BUILD_STAMP_PATTERN = /<!-- e2e-pwa-build-stamp-\d+ -->/;

let previewProcess: ChildProcess | null = null;

function bumpBuildStamp(html: string): string {
  const stamp = `<!-- e2e-pwa-build-stamp-${Date.now()} -->`;
  if (BUILD_STAMP_PATTERN.test(html)) {
    return html.replace(BUILD_STAMP_PATTERN, stamp);
  }
  return html.replace('</head>', `    ${stamp}\n  </head>`);
}

async function waitForPreview() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(PREVIEW_URL);
      if (response.ok) return;
    } catch {
      // Preview still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Preview server did not start at ${PREVIEW_URL}`);
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  execSync('npm run build', { stdio: 'inherit' });
  previewProcess = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4174'], {
    stdio: 'ignore',
    detached: false,
  });
  await waitForPreview();
});

test.afterAll(async () => {
  previewProcess?.kill('SIGTERM');
  previewProcess = null;
});

test.describe('PWA update prompt', () => {
  test.use({ baseURL: PREVIEW_URL });

  test('registers service worker and shows update prompt after redeploy', async ({ page }) => {
    const originalReleaseNotes = readFileSync(RELEASE_NOTES_PATH, 'utf8');
    const originalIndexHtml = readFileSync(INDEX_HTML_PATH, 'utf8');

    try {
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('fasted-calendar-install-toast-dismissed', '1'));

      await page.waitForFunction(
        async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return Boolean(registration?.active?.scriptURL?.includes('/sw.js'));
        },
        undefined,
        { timeout: 15_000 },
      );

      writeFileSync(
        RELEASE_NOTES_PATH,
        JSON.stringify(
          {
            blurb: `E2E update blurb (${Date.now()})`,
          },
          null,
          2,
        ) + '\n',
      );
      writeFileSync(INDEX_HTML_PATH, bumpBuildStamp(originalIndexHtml));
      execSync('npm run build', { stdio: 'inherit' });

      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
      });

      await page.waitForFunction(
        async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration?.waiting != null;
        },
        undefined,
        { timeout: 15_000 },
      );

      await expect(page.getByText('Update available')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
      await expect(page.getByText(/E2E update blurb/)).toBeVisible();
    } finally {
      writeFileSync(RELEASE_NOTES_PATH, originalReleaseNotes);
      writeFileSync(INDEX_HTML_PATH, originalIndexHtml);
      execSync('npm run build', { stdio: 'inherit' });
    }
  });
});
