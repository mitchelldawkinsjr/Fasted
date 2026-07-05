import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.A11Y_BASE_URL || "http://127.0.0.1:4173";
const STORAGE_KEY = "fasted-calendar-progress:guest";

const TOUR_DISMISSED = {
  hasSeenTour: true,
  pageToursSeen: {
    settings: true,
    calendar: true,
    progress: true,
    groups: true,
  },
};

const PAGES = [
  { name: "today", path: "/" },
  { name: "calendar", path: "/calendar" },
  { name: "journal", path: "/journal" },
  { name: "progress", path: "/progress" },
  { name: "mood", path: "/progress/mood" },
  { name: "phases", path: "/phases" },
  { name: "settings", path: "/settings" },
];

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function seedPage(page, routePath) {
  await page.goto(`${BASE}${routePath}`, { waitUntil: "networkidle" });
  await page.evaluate(
    ({ key, tourFlags }) => {
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, checkIns: [], journal: [], ...tourFlags }),
      );
      localStorage.setItem("fasted-calendar-install-toast-dismissed", "1");
    },
    { key: STORAGE_KEY, tourFlags: TOUR_DISMISSED },
  );
  await page.reload({ waitUntil: "networkidle" });
}

function formatViolations(violations) {
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`
    )
    .join("\n");
}

for (const pageDef of PAGES) {
  test(`${pageDef.name} has no WCAG violations`, async ({ page }) => {
    await seedPage(page, pageDef.path);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
}
