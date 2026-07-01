import type { Page } from '@playwright/test';

export type OverflowIssue = {
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

export type ContainerOverflow = {
  selector: string;
  tag: string;
  className: string;
  text: string;
  scrollOverflowX: number;
  scrollOverflowY: number;
};

export type OverflowReport = {
  childEscapes: OverflowIssue[];
  scrollOverflows: ContainerOverflow[];
  viewportOverflow: boolean;
};

const CONTAINER_HINTS =
  /stitch-card|rounded-xl|rounded-lg|rounded-t-xl|grace-shadow|border-l-4|bg-surface|modal|dialog|toast|banner|EmptyState|InfoBanner/i;

const SKIP_TAGS = new Set(['HTML', 'BODY', 'MAIN', 'SCRIPT', 'STYLE', 'SVG', 'PATH', 'CIRCLE', 'DEFS']);

export async function detectOverflow(page: Page): Promise<OverflowReport> {
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

          if (xOverflow > TOLERANCE) {
            childEscapes.push({
              selector: key,
              tag: el.tagName,
              className: el.className?.toString?.() ?? '',
              text: textSnippet(el),
              childSelector: describe(child),
              childTag: child.tagName,
              overflowX: xOverflow,
              overflowY: yOverflow,
              direction: yOverflow > TOLERANCE ? 'both' : 'horizontal',
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

export function formatOverflowReport(
  entries: Array<{ route: string; viewport: string; issues: OverflowReport; screenshot?: string }>,
): string {
  if (entries.length === 0) return 'No overflow issues detected.';

  const lines: string[] = ['=== OVERFLOW AUDIT REPORT ==='];
  for (const entry of entries) {
    lines.push(`\n[${entry.route} @ ${entry.viewport}]${entry.screenshot ? ` screenshot: ${entry.screenshot}` : ''}`);
    for (const s of entry.issues.scrollOverflows) {
      lines.push(
        `  SCROLL: ${s.selector} (+${s.scrollOverflowX}px x, +${s.scrollOverflowY}px y) "${s.text}"`,
      );
    }
    for (const c of entry.issues.childEscapes) {
      lines.push(
        `  ESCAPE: ${c.selector} <- ${c.childSelector} (${c.direction}, +${Math.round(c.overflowX)}px x, +${Math.round(c.overflowY)}px y)`,
      );
    }
    if (entry.issues.viewportOverflow) {
      lines.push('  VIEWPORT horizontal scroll detected');
    }
  }
  return lines.join('\n');
}

export function hasOverflowIssues(issues: OverflowReport): boolean {
  return (
    issues.childEscapes.length > 0 ||
    issues.scrollOverflows.length > 0 ||
    issues.viewportOverflow
  );
}
