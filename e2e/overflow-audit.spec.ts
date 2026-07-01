import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { formatOverflowReport, detectOverflow, hasOverflowIssues } from './fixtures/overflow';
import { MAIN_ROUTES } from './fixtures/routes';
import { seedProgressOnPage } from './fixtures/seed-states';
import { mockSupabaseOffline } from './fixtures/supabase-mock';
import { AUDIT_VIEWPORTS } from './fixtures/viewports';
import { compressImagePaths } from '../scripts/lib/compress-images.mjs';

const screenshotDir = path.join(process.cwd(), 'e2e', 'overflow-screenshots');

async function auditRoute(page: Page, routePath: string, label: string, viewportName: string) {
  await page.goto(routePath === '/' ? `/?date=${FIXED_DATE}` : routePath);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);

  const issues = await detectOverflow(page);
  const shotName = `${label}-${viewportName}.jpg`;
  await page.screenshot({
    path: path.join(screenshotDir, shotName),
    fullPage: true,
    type: 'jpeg',
    quality: 72,
  });

  return { route: label, viewport: viewportName, issues, screenshot: shotName };
}

test.describe('Visual overflow audit', () => {
  test.beforeAll(() => {
    fs.mkdirSync(screenshotDir, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await mockSupabaseOffline(page);
    await page.goto('/');
    await seedProgressOnPage(page, 'worstCase');
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('audit all pages across viewports', async ({ page }) => {
    test.setTimeout(300_000);

    const allIssues: Awaited<ReturnType<typeof auditRoute>>[] = [];

    for (const viewport of AUDIT_VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of MAIN_ROUTES) {
        allIssues.push(await auditRoute(page, route.path, route.label, viewport.name));
      }
    }

    // Modal states on Today page (mobile viewports only)
    for (const viewport of AUDIT_VIEWPORTS.slice(0, 4)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/?date=${FIXED_DATE}`);
      await page.waitForLoadState('networkidle');

      const checkInBtn = page.getByRole('button', { name: /check.?in|complete check/i });
      if (await checkInBtn.count()) {
        await checkInBtn.first().click();
        await page.waitForTimeout(400);
        const issues = await detectOverflow(page);
        const shotName = `CheckInModal-${viewport.name}.jpg`;
        await page.screenshot({
          path: path.join(screenshotDir, shotName),
          fullPage: true,
          type: 'jpeg',
          quality: 72,
        });
        allIssues.push({
          route: 'CheckInModal',
          viewport: viewport.name,
          issues,
          screenshot: shotName,
        });
        await page.keyboard.press('Escape');
      }
    }

    // Journal editor + viewer with long content
    for (const viewport of AUDIT_VIEWPORTS.slice(0, 4)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/journal');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: '+ New' }).click();
      await page.waitForTimeout(300);
      let issues = await detectOverflow(page);
        let shotName = `JournalEditor-${viewport.name}.jpg`;
      await page.screenshot({
        path: path.join(screenshotDir, shotName),
        fullPage: true,
        type: 'jpeg',
        quality: 72,
      });
      allIssues.push({ route: 'JournalEditor', viewport: viewport.name, issues, screenshot: shotName });

      await page.goto('/journal');
      await page.getByRole('button', { name: /View reflection from/i }).first().click();
      await page.waitForTimeout(300);
      issues = await detectOverflow(page);
      shotName = `JournalViewer-${viewport.name}.jpg`;
      await page.screenshot({
        path: path.join(screenshotDir, shotName),
        fullPage: true,
        type: 'jpeg',
        quality: 72,
      });
      allIssues.push({ route: 'JournalViewer', viewport: viewport.name, issues, screenshot: shotName });
    }

    const failures = allIssues.filter((entry) => hasOverflowIssues(entry.issues));
    const reportPath = path.join(screenshotDir, 'overflow-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(failures, null, 2));

    console.log('\n' + formatOverflowReport(failures));

    const imagePaths = [
      ...allIssues.map((e) => path.join(screenshotDir, e.screenshot)),
      ...fs.readdirSync(screenshotDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).map((f) => path.join(screenshotDir, f)),
    ];
    const uniquePaths = [...new Set(imagePaths)].filter((p) => fs.existsSync(p));
    await compressImagePaths(uniquePaths);

    expect(failures, `Overflow issues found — see ${reportPath}`).toEqual([]);
  });
});
