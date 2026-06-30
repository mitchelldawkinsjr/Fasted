import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(process.cwd(), 'artifacts', 'issue-77');

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const GROUP_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const JOURNEY_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const commitments = [
  {
    id: 'move-body',
    label: 'Move body daily',
    shape: 'duration',
    target: 30,
    description: 'At least 30 minutes of movement',
  },
  { id: 'eating-plan', label: 'Follow eating structure', shape: 'yes_no' },
  { id: 'fasting', label: "Complete today's fast", shape: 'yes_no' },
  { id: 'prayer', label: 'Intentional time with God', shape: 'yes_no' },
  { id: 'honesty', label: 'Be honest in check-ins', shape: 'yes_no' },
];

function json(body, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not ready at ${url}`);
}

async function setupMocks(page) {
  await page.addInitScript(
    ({ userId }) => {
      const session = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'mock-refresh',
        user: {
          id: userId,
          email: 'leader@example.com',
          created_at: '2026-01-01T00:00:00Z',
          user_metadata: { full_name: 'Test Leader' },
        },
      };
      localStorage.setItem('sb-mock-auth-token', JSON.stringify(session));
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    },
    { userId: USER_ID },
  );

  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('token') || url.includes('session') || url.includes('user')) {
      await route.fulfill(
        json({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: {
            id: USER_ID,
            email: 'leader@example.com',
            created_at: '2026-01-01T00:00:00Z',
            user_metadata: { full_name: 'Test Leader' },
          },
        }),
      );
      return;
    }
    await route.fulfill(json({}));
  });

  await page.route('**/rest/v1/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;

    if (pathname.includes('rpc/get_leader_member_progress')) {
      await route.fulfill(
        json([
          {
            user_id: USER_ID,
            group_check_ins: {
              [GROUP_ID]: [
                {
                  date: '2026-06-30',
                  results: commitments.map((c) => ({
                    commitmentId: c.id,
                    honored: true,
                    value: c.shape === 'duration' ? 45 : undefined,
                  })),
                  completedAt: '2026-06-30T20:00:00Z',
                },
              ],
            },
            check_in_streak: 5,
          },
        ]),
      );
      return;
    }

    if (pathname.includes('rpc/preview_group_by_code')) {
      await route.fulfill(json([{ id: GROUP_ID, name: 'Summer Fasted Journey', privacy: 'named' }]));
      return;
    }

    const table = pathname.split('/').pop()?.split('?')[0];

    if (table === 'group_memberships') {
      const method = req.method();
      if (method === 'GET') {
        await route.fulfill(
          json([
            {
              id: 'mem-1',
              group_id: GROUP_ID,
              user_id: USER_ID,
              role: 'leader',
              display_name: 'Test Leader',
              joined_at: '2026-06-01T00:00:00Z',
            },
          ]),
        );
        return;
      }
    }

    if (table === 'groups') {
      await route.fulfill(
        json([
          {
            id: GROUP_ID,
            name: 'Summer Fasted Journey',
            invite_code: 'FAST2026',
            privacy: 'named',
            journey_id: JOURNEY_ID,
            created_at: '2026-06-01T00:00:00Z',
            journey: {
              id: JOURNEY_ID,
              type: 'built-in',
              name: 'Fasted Journey',
              start_date: '2026-06-01',
              phases: [],
              created_at: '2026-06-01T00:00:00Z',
            },
          },
        ]),
      );
      return;
    }

    if (table === 'group_commitments') {
      await route.fulfill(json({ commitments }));
      return;
    }

    if (table === 'member_covenants') {
      await route.fulfill(
        json([
          {
            id: 'covenant-1',
            group_id: GROUP_ID,
            user_id: USER_ID,
            commitments_snapshot: commitments,
            signature: 'Test Leader',
            signed_at: '2026-06-01T10:00:00Z',
          },
        ]),
      );
      return;
    }

    if (table === 'prayer_requests' || table === 'shared_journal_entries') {
      await route.fulfill(json([]));
      return;
    }

    if (table === 'group_checkin_stats') {
      await route.fulfill(
        json({
          group_id: GROUP_ID,
          member_count: 3,
          total_checkins: 12,
          avg_checkins_per_member: 4,
        }),
      );
      return;
    }

    await route.fulfill(json([]));
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: process.cwd(),
    stdio: 'ignore',
    env: {
      ...process.env,
      VITE_SUPABASE_URL: 'https://mock.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'mock-anon-key',
    },
  });

  try {
    await waitForServer(BASE);

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await setupMocks(page);

    await page.goto(`${BASE}/groups`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Your Groups', { timeout: 15000 });
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, 'create-group-commitments.png') });

    await page.getByRole('button', { name: 'Close' }).click().catch(() => page.keyboard.press('Escape'));
    await page.goto(`${BASE}/join/FAST2026`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(OUT_DIR, 'join-group-preview.png') });

    await page.goto(`${BASE}/groups/${GROUP_ID}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'View signed covenant' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, 'signed-covenant-view.png') });
    await page.keyboard.press('Escape');

    await page.goto(`${BASE}/groups/${GROUP_ID}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(OUT_DIR, 'leader-dashboard-commitments.png'), fullPage: true });

    await browser.close();
    console.log(`Screenshots saved to ${OUT_DIR}`);
  } finally {
    preview.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
