import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_KEY = 'fasted-calendar-progress:guest';
const VIEWPORTS = [
  { name: '360x640', width: 360, height: 640 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '360x800-landscape', width: 800, height: 360 },
];

const ROUTES = [
  { path: '/', label: 'Today' },
  { path: '/calendar', label: 'Calendar' },
  { path: '/journal', label: 'Journal' },
  { path: '/progress', label: 'Progress' },
  { path: '/progress/mood', label: 'MoodVisualizer' },
  { path: '/phases', label: 'Phases' },
  { path: '/settings', label: 'Settings' },
];

const LONG =
  'Supercalifragilisticexpialidocious pneumonoultramicroscopicsilicovolcanoconiosis extraordinarilylongunbrokenstringwithoutspaces1234567890';

type OverflowIssue = {
  selector: string;
  tag: string;
  className: string;
  text: string;
  childSelector: string;
  childTag: string;
  overflowX: number;
  overflowY: number;
  direction: 'horizontal' | 'vertical' | 'both';
};

type ContainerOverflow = {
  selector: string;
  tag: string;
  className: string;
  text: string;
  scrollOverflowX: number;
  scrollOverflowY: number;
};

const CONTAINER_HINTS =
  /stitch-card|rounded-xl|rounded-lg|rounded-t-xl|grace-shadow|border-l-4|bg-surface|modal|dialog|toast|banner|EmptyState|InfoBanner/i;

const SKIP_TAGS = new Set(['HTML', 'BODY', 'MAIN', 'SCRIPT', 'STYLE', 'SVG', 'PATH', 'CIRCLE', 'DEFS']);

async function injectWorstCaseData(page: Page) {
  await page.evaluate(
    ({ key, long }) => {
      const progress = {
        checkIns: [
          {
            date: '2026-06-22',
            followedPlan: true,
            prayedFocus: true,
            readScripture: true,
            journaled: true,
            win: long,
            completedAt: '2026-06-22T20:00:00.000Z',
          },
        ],
        journalEntries: [
          {
            id: 'overflow-test-1',
            type: 'daily-reflection',
            date: '2026-06-22',
            updatedAt: '2026-06-22T18:30:00.000Z',
            dayMood: 'amazing',
            prayerFocus: long,
            prayedAbout: long,
            godTeaching: long,
            hungerNotes: long,
            victory: long,
            tomorrowIntention: long,
          },
          {
            id: 'overflow-test-2',
            type: 'prayer',
            date: '2026-06-21',
            updatedAt: '2026-06-21T18:30:00.000Z',
            content: long,
          },
        ],
        badges: [],
        settings: {
          reminderTime: '07:00',
          theme: 'light',
          scriptureNote: long,
        },
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(progress));
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    },
    { key: STORAGE_KEY, long: LONG },
  );
}

async function detectOverflow(page: Page) {
  return page.evaluate(
    ({ containerHintsSource, skipTagsList }) => {
      const containerHints = new RegExp(containerHintsSource, 'i');
      const skipTags = new Set(skipTagsList);
      const TOLERANCE = 2;

      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function isContainer(el: Element): boolean {
        if (skipTags.has(el.tagName)) return false;
        if (!isVisible(el)) return false;
        const cls = el.className?.toString?.() ?? '';
        const role = el.getAttribute('role') ?? '';
        if (containerHints.test(cls) || role === 'dialog' || role === 'alert') return true;
        if (el.tagName === 'ARTICLE' || el.tagName === 'SECTION') return true;
        if (el.tagName === 'NAV' && cls.includes('fixed')) return true;
        const style = window.getComputedStyle(el);
        const hasBox =
          style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
          style.borderWidth !== '0px' ||
          style.boxShadow !== 'none';
        const hasRadius = parseFloat(style.borderRadius) > 0;
        return hasBox && hasRadius && el.children.length > 0;
      }

      function describe(el: Element): string {
        const id = el.id ? `#${el.id}` : '';
        const cls =
          el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
            : '';
        return `${el.tagName.toLowerCase()}${id}${cls}`;
      }

      function textSnippet(el: Element): string {
        return (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
      }

      const childEscapes: OverflowIssue[] = [];
      const scrollOverflows: ContainerOverflow[] = [];
      const seen = new Set<string>();

      document.querySelectorAll('*').forEach((el) => {
        if (!isContainer(el)) return;
        const parentRect = el.getBoundingClientRect();
        const key = describe(el);
        if (seen.has(key)) return;
        seen.add(key);

        const style = window.getComputedStyle(el);
        const overflowHidden =
          style.overflow === 'hidden' ||
          style.overflowX === 'hidden' ||
          style.overflowY === 'hidden' ||
          style.overflow === 'clip';

        if (el.scrollWidth > el.clientWidth + TOLERANCE || el.scrollHeight > el.clientHeight + TOLERANCE) {
          if (overflowHidden || el.className.toString().includes('stitch-card')) {
            scrollOverflows.push({
              selector: key,
              tag: el.tagName,
              className: el.className?.toString?.() ?? '',
              text: textSnippet(el),
              scrollOverflowX: el.scrollWidth - el.clientWidth,
              scrollOverflowY: el.scrollHeight - el.clientHeight,
            });
          }
        }

        el.querySelectorAll('*').forEach((child) => {
          if (!isVisible(child)) return;
          if (skipTags.has(child.tagName)) return;
          const childRect = child.getBoundingClientRect();
          const overflowRight = childRect.right - parentRect.right;
          const overflowLeft = parentRect.left - childRect.left;
          const overflowBottom = childRect.bottom - parentRect.bottom;
          const overflowTop = parentRect.top - childRect.top;

          const xOverflow = Math.max(overflowRight, overflowLeft);
          const yOverflow = Math.max(overflowBottom, overflowTop);

          if (xOverflow > TOLERANCE || yOverflow > TOLERANCE) {
            childEscapes.push({
              selector: key,
              tag: el.tagName,
              className: el.className?.toString?.() ?? '',
              text: textSnippet(el),
              childSelector: describe(child),
              childTag: child.tagName,
              overflowX: xOverflow,
              overflowY: yOverflow,
              direction:
                xOverflow > TOLERANCE && yOverflow > TOLERANCE
                  ? 'both'
                  : xOverflow > TOLERANCE
                    ? 'horizontal'
                    : 'vertical',
            });
          }
        });
      });

      const viewportOverflow =
        document.documentElement.scrollWidth > window.innerWidth + TOLERANCE;

      return { childEscapes, scrollOverflows, viewportOverflow };
    },
    {
      containerHintsSource: CONTAINER_HINTS.source,
      skipTagsList: [...SKIP_TAGS],
    },
  );
}

const screenshotDir = path.join(process.cwd(), 'e2e', 'overflow-screenshots');

test.describe('Visual overflow audit', () => {
  test.beforeAll(() => {
    fs.mkdirSync(screenshotDir, { recursive: true });
  });

  test('audit all pages across viewports', async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto('/');
    await injectWorstCaseData(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const allIssues: Array<{
      route: string;
      viewport: string;
      issues: Awaited<ReturnType<typeof detectOverflow>>;
      screenshot: string;
    }> = [];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of ROUTES) {
        await page.goto(route.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);

        const issues = await detectOverflow(page);
        const shotName = `${route.label}-${viewport.name}.png`;
        await page.screenshot({
          path: path.join(screenshotDir, shotName),
          fullPage: true,
        });

        if (
          issues.childEscapes.length > 0 ||
          issues.scrollOverflows.length > 0 ||
          issues.viewportOverflow
        ) {
          allIssues.push({ route: route.label, viewport: viewport.name, issues, screenshot: shotName });
        }
      }
    }

    // Modal states on Today page
    for (const viewport of VIEWPORTS.slice(0, 2)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const checkInBtn = page.getByRole('button', { name: /check.?in|complete check/i });
      if (await checkInBtn.count()) {
        await checkInBtn.first().click();
        await page.waitForTimeout(400);
        const issues = await detectOverflow(page);
        const shotName = `CheckInModal-${viewport.name}.png`;
        await page.screenshot({ path: path.join(screenshotDir, shotName), fullPage: true });
        if (issues.childEscapes.length || issues.scrollOverflows.length) {
          allIssues.push({
            route: 'CheckInModal',
            viewport: viewport.name,
            issues,
            screenshot: shotName,
          });
        }
        await page.keyboard.press('Escape');
      }
    }

    // Journal editor + viewer with long content
    for (const viewport of VIEWPORTS.slice(0, 2)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/journal');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: '+ New' }).click();
      await page.waitForTimeout(300);
      let issues = await detectOverflow(page);
      let shotName = `JournalEditor-${viewport.name}.png`;
      await page.screenshot({ path: path.join(screenshotDir, shotName), fullPage: true });
      if (issues.childEscapes.length || issues.scrollOverflows.length) {
        allIssues.push({ route: 'JournalEditor', viewport: viewport.name, issues, screenshot: shotName });
      }

      await page.goto('/journal');
      await page.getByRole('button', { name: /View reflection from/i }).first().click();
      await page.waitForTimeout(300);
      issues = await detectOverflow(page);
      shotName = `JournalViewer-${viewport.name}.png`;
      await page.screenshot({ path: path.join(screenshotDir, shotName), fullPage: true });
      if (issues.childEscapes.length || issues.scrollOverflows.length) {
        allIssues.push({ route: 'JournalViewer', viewport: viewport.name, issues, screenshot: shotName });
      }
    }

    const reportPath = path.join(screenshotDir, 'overflow-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(allIssues, null, 2));

    // Log for CI visibility
    console.log('\n=== OVERFLOW AUDIT REPORT ===');
    if (allIssues.length === 0) {
      console.log('No overflow issues detected.');
    } else {
      for (const entry of allIssues) {
        console.log(`\n[${entry.route} @ ${entry.viewport}] screenshot: ${entry.screenshot}`);
        for (const s of entry.issues.scrollOverflows) {
          console.log(`  SCROLL: ${s.selector} (+${s.scrollOverflowX}px x, +${s.scrollOverflowY}px y) "${s.text}"`);
        }
        for (const c of entry.issues.childEscapes) {
          console.log(
            `  ESCAPE: ${c.selector} <- ${c.childSelector} (${c.direction}, +${Math.round(c.overflowX)}px x, +${Math.round(c.overflowY)}px y)`,
          );
        }
        if (entry.issues.viewportOverflow) {
          console.log('  VIEWPORT horizontal scroll detected');
        }
      }
    }

    expect(allIssues, `Overflow issues found — see ${reportPath}`).toEqual([]);
  });
});
