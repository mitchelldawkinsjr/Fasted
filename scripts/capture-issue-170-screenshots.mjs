import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'issue-170');
const PREVIEW_URL = 'http://127.0.0.1:4175';

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4175'], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: 'pipe',
  });

  try {
    await waitForServer(PREVIEW_URL);

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${PREVIEW_URL}/?preview=error-boundary`);
    await page.getByRole('heading', { name: 'Something went wrong' }).waitFor();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'error-boundary-fallback-mobile.png'),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'error-boundary-fallback-desktop.png'),
      fullPage: true,
    });

    await browser.close();
    console.log(`Saved screenshots to ${ARTIFACT_DIR}`);
  } finally {
    preview.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
