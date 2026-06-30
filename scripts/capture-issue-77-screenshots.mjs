import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const PREVIEW_URL = 'http://127.0.0.1:4174';
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'issue-77');

const USER_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '44444444-4444-4444-4444-444444444444';
const GROUP_ID = '22222222-2222-2222-2222-222222222222';
const JOURNEY_ID = '33333333-3333-3333-3333-333333333333';
const AUTH_STORAGE_KEY = 'sb-127-auth-token';
const PROGRESS_KEY = `fasted-calendar-progress:${USER_ID}`;

const COMMITMENTS = [
  {
    id: 'move-daily',
    label: 'Move body daily',
    shape: 'duration',
    target: 30,
    description: 'At least 30 minutes of movement',
  },
  { id: 'food-plan', label: 'Follow eating structure', shape: 'yes_no' },
  { id: 'fast-today', label: "Complete today's fast", shape: 'yes_no' },
  { id: 'prayer-time', label: 'Intentional time with God', shape: 'yes_no' },
  { id: 'honest-checkin', label: 'Be honest in check-ins', shape: 'yes_no' },
];

const GROUP = {
  id: GROUP_ID,
  org_id: null,
  journey_id: JOURNEY_ID,
  name: 'Summer Fast Cohort',
  invite_code: 'FAST2026',
  privacy: 'named',
  created_by: USER_ID,
  created_at: '2026-06-01T12:00:00.000Z',
  journey: {
    id: JOURNEY_ID,
    type: 'built-in',
    name: 'Fasted Journey',
    start_date: '2026-06-13',
    phases: null,
    created_by: USER_ID,
    created_at: '2026-06-01T12:00:00.000Z',
  },
};

const SIGNED_COVENANT = {
  id: 'covenant-1',
  group_id: GROUP_ID,
  user_id: USER_ID,
  commitments_snapshot: COMMITMENTS,
  signature: 'Jordan Lee',
  signed_at: '2026-06-15T18:00:00.000Z',
};

const MOCK_USER = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'leader@example.com',
  email_confirmed_at: '2026-06-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Jordan Lee' },
  created_at: '2026-06-01T00:00:00.000Z',
};

const MOCK_SESSION = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: MOCK_USER,
};

const DEFAULT_PROGRESS = {
  checkIns: [],
  checkInStreak: 0,
  journalEntries: [],
  badges: [],
  groupCheckIns: {},
  settings: {
    reminderTime: '07:00',
    theme: 'light',
    scriptureNote: 'Screenshot seed data for Journey Together UI.',
  },
  activeJourneyId: 'fasted-journey',
  updatedAt: '2026-06-30T12:00:00.000Z',
};

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function createMockHandler(config) {
  return async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
        },
      });
    }

    if (url.includes('/auth/v1/user')) {
      return json(route, MOCK_USER);
    }

    if (url.includes('/auth/v1/token')) {
      return json(route, MOCK_SESSION);
    }

    if (url.includes('/rpc/preview_group_by_code')) {
      return json(route, [{ id: GROUP_ID, name: GROUP.name, privacy: GROUP.privacy }]);
    }

    if (url.includes('/rpc/get_leader_member_progress')) {
      return json(route, config.leaderProgress ?? []);
    }

    if (url.includes('/rpc/join_group_by_code')) {
      return json(route, GROUP_ID);
    }

    if (url.includes('/group_memberships') && url.includes(`user_id=eq.${USER_ID}`)) {
      if (url.includes(`group_id=eq.${GROUP_ID}`) && config.myMembership) {
        return json(route, [config.myMembership]);
      }
      const memberships = config.myMemberships ?? [];
      return json(route, memberships);
    }

    if (url.includes('/group_memberships') && url.includes(`group_id=eq.${GROUP_ID}`)) {
      return json(route, config.groupMemberships ?? []);
    }

    if (url.includes('/groups') && (url.includes(`id=eq.${GROUP_ID}`) || url.includes('id=in.'))) {
      return json(route, [GROUP]);
    }

    if (url.includes('/group_commitments') && url.includes(`group_id=eq.${GROUP_ID}`)) {
      return json(route, [{ group_id: GROUP_ID, commitments: COMMITMENTS }]);
    }

    if (url.includes('/member_covenants') && url.includes(`group_id=eq.${GROUP_ID}`)) {
      if (url.includes(`user_id=eq.${USER_ID}`)) {
        if (config.myCovenant === null) return json(route, []);
        if (config.myCovenant) return json(route, [config.myCovenant]);
        return json(route, []);
      }
      if (config.allCovenants) return json(route, config.allCovenants);
      if (config.myCovenant) return json(route, [config.myCovenant]);
      return json(route, []);
    }

    if (url.includes('/shared_journal_entries')) {
      return json(route, []);
    }

    if (url.includes('/prayer_requests')) {
      return json(route, config.prayers ?? []);
    }

    if (url.includes('/user_progress')) {
      return json(route, []);
    }

    return json(route, []);
  };
}

async function waitForServer(url, timeoutMs = 30_000) {
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
  throw new Error(`Timed out waiting for ${url}`);
}

async function buildApp() {
  await new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_SUPABASE_URL: SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: 'screenshot-anon-key',
      },
    });
    build.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build failed: ${code}`))));
  });
}

async function createContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
  });

  await context.addInitScript(
    ({ authKey, progressKey, session, progress }) => {
      localStorage.setItem(authKey, JSON.stringify(session));
      localStorage.setItem(progressKey, JSON.stringify(progress));
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    },
    {
      authKey: AUTH_STORAGE_KEY,
      progressKey: PROGRESS_KEY,
      session: MOCK_SESSION,
      progress: DEFAULT_PROGRESS,
    },
  );

  return context;
}

async function screenshot(page, filename, options = {}) {
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, filename),
    ...options,
  });
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await buildApp();

  const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4174'], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  try {
    await waitForServer(PREVIEW_URL);
    const browser = await chromium.launch();

    // 1. Create group modal with commitments editor
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await page.route(`${SUPABASE_URL}/**`, createMockHandler({ myMemberships: [] }));
      await page.goto(`${PREVIEW_URL}/groups`);
      await page.getByRole('button', { name: 'Create Group' }).click();
      await page.getByRole('dialog', { name: 'Create Group' }).waitFor();
      await page.getByPlaceholder('Summer Fast Cohort').fill('Summer Fast Cohort');
      await screenshot(page, 'create-group-commitments.png', { fullPage: true });
      await context.close();
    }

    // 2. Join group preview
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await page.route(`${SUPABASE_URL}/**`, createMockHandler({}));
      await page.goto(`${PREVIEW_URL}/join/FAST2026`);
      await page.getByRole('heading', { name: 'Join Group' }).waitFor();
      await page.getByRole('button', { name: 'Join Summer Fast Cohort' }).waitFor();
      await screenshot(page, 'join-group-preview.png', { fullPage: true });
      await context.close();
    }

    // 3. Covenant sign gate (member, unsigned)
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await page.route(
        `${SUPABASE_URL}/**`,
        createMockHandler({
          myMemberships: [{ group_id: GROUP_ID }],
          myMembership: {
            id: 'membership-member',
            group_id: GROUP_ID,
            user_id: USER_ID,
            role: 'member',
            display_name: 'Jordan Lee',
            joined_at: '2026-06-10T12:00:00.000Z',
          },
          groupMemberships: [
            {
              id: 'membership-member',
              group_id: GROUP_ID,
              user_id: USER_ID,
              role: 'member',
              display_name: 'Jordan Lee',
              joined_at: '2026-06-10T12:00:00.000Z',
            },
          ],
          myCovenant: null,
        }),
      );
      await page.goto(`${PREVIEW_URL}/groups/${GROUP_ID}`);
      await page.getByRole('dialog', { name: 'My Commitment' }).waitFor();
      await page.getByPlaceholder('Type your full name').fill('Jordan Lee');
      await page.getByRole('checkbox').check();
      await screenshot(page, 'covenant-sign.png', { fullPage: true });
      await context.close();
    }

    // 4. Signed covenant (read-only)
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await page.route(
        `${SUPABASE_URL}/**`,
        createMockHandler({
          myMemberships: [{ group_id: GROUP_ID }],
          myMembership: {
            id: 'membership-member',
            group_id: GROUP_ID,
            user_id: USER_ID,
            role: 'member',
            display_name: 'Jordan Lee',
            joined_at: '2026-06-10T12:00:00.000Z',
          },
          groupMemberships: [
            {
              id: 'membership-member',
              group_id: GROUP_ID,
              user_id: USER_ID,
              role: 'member',
              display_name: 'Jordan Lee',
              joined_at: '2026-06-10T12:00:00.000Z',
            },
          ],
          myCovenant: SIGNED_COVENANT,
        }),
      );
      await page.goto(`${PREVIEW_URL}/groups/${GROUP_ID}`);
      await page.getByRole('button', { name: 'View signed covenant' }).click();
      await page.getByRole('dialog', { name: 'Signed Covenant' }).waitFor();
      await screenshot(page, 'covenant-signed.png', { fullPage: true });
      await context.close();
    }

    // 5. Leader dashboard with member progress
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await page.route(
        `${SUPABASE_URL}/**`,
        createMockHandler({
          myMemberships: [{ group_id: GROUP_ID }],
          myMembership: {
            id: 'membership-leader',
            group_id: GROUP_ID,
            user_id: USER_ID,
            role: 'leader',
            display_name: 'Jordan Lee',
            joined_at: '2026-06-01T12:00:00.000Z',
          },
          groupMemberships: [
            {
              id: 'membership-member',
              group_id: GROUP_ID,
              user_id: MEMBER_ID,
              role: 'member',
              display_name: 'Alex Morgan',
              joined_at: '2026-06-05T12:00:00.000Z',
            },
          ],
          allCovenants: [SIGNED_COVENANT],
          leaderProgress: [
            {
              user_id: MEMBER_ID,
              group_check_ins: [
                {
                  date: '2026-06-30',
                  results: [
                    { commitmentId: 'move-daily', honored: true, value: 35 },
                    { commitmentId: 'food-plan', honored: true },
                    { commitmentId: 'fast-today', honored: true },
                    { commitmentId: 'prayer-time', honored: false },
                    { commitmentId: 'honest-checkin', honored: true },
                  ],
                  completedAt: '2026-06-30T20:00:00.000Z',
                },
              ],
            },
          ],
        }),
      );
      await page.goto(`${PREVIEW_URL}/groups/${GROUP_ID}/dashboard`);
      await page.getByRole('heading', { name: 'Member progress' }).waitFor();
      await page.getByText('Alex Morgan').waitFor();
      await screenshot(page, 'leader-dashboard-members.png', { fullPage: true });
      await context.close();
    }

    // 6. Check-in with group commitments
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await page.route(
        `${SUPABASE_URL}/**`,
        createMockHandler({
          myMemberships: [{ group_id: GROUP_ID }],
          myCovenant: SIGNED_COVENANT,
        }),
      );
      await page.goto(`${PREVIEW_URL}/`);
      await page.getByRole('button', { name: 'Check-in for Today' }).click();
      await page.getByText('Group commitments · Summer Fast Cohort').waitFor();
      await page.getByText('Move body daily').click();
      await screenshot(page, 'checkin-group-commitments.png', { fullPage: true });
      await context.close();
    }

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
