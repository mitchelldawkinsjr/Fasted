import { mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { compressImagePaths } from './compress-images.mjs';

export const DEFAULT_BASE_URL = 'http://127.0.0.1:5173';
export const GUEST_STORAGE_KEY = 'fasted-calendar-progress:guest';

export async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}. Start the app with npm run dev or npm run dev:seed.`);
}

export function artifactDirForIssue(issueNumber) {
  return join(process.cwd(), 'artifacts', `issue-${issueNumber}`);
}

export async function ensureArtifactDir(issueNumber) {
  const dir = artifactDirForIssue(issueNumber);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** @returns {{ paths: string[], shot: (page: import('@playwright/test').Page, filename: string, options?: object) => Promise<string> }} */
export function createScreenshotHelper(dir) {
  const paths = [];

  async function shot(page, filename, options = {}) {
    const filePath = join(dir, filename);
    await page.screenshot({ path: filePath, ...options });
    paths.push(filePath);
    return filePath;
  }

  return { paths, shot };
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export async function compressCapturedImages(paths) {
  if (paths.length === 0) return [];

  const results = (await compressImagePaths(paths, { checkOnly: false })).filter((r) => r.changed);
  for (const result of results.sort((a, b) => b.saved - a.saved)) {
    const name = relative(process.cwd(), result.filePath);
    console.log(
      `compressed ${name}: ${formatBytes(result.beforeBytes)} -> ${formatBytes(result.afterBytes)} (-${formatBytes(result.saved)})`,
    );
  }

  if (results.length === 0) {
    console.log('All captures already optimally compressed.');
  }

  return results;
}

export async function prepareGuestJournalPage(page, baseUrl) {
  await page.goto(`${baseUrl}/journal`);
  await page.evaluate(
    (key) => {
      localStorage.removeItem(key);
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    },
    GUEST_STORAGE_KEY,
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
}
