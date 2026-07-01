import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const PREVIEW_URL = 'http://127.0.0.1:4175';
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'issue-100');

const USER_ID = '11111111-1111-1111-1111-111111111111';
const GROUP_ID = '22222222-2222-2222-2222-222222222222';
const JOURNEY_ID = '33333333-3333-3333-3333-333333333333';
const AUTH_STORAGE_KEY = 'sb-127-auth-token';

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

const GROUP = {
  id: GROUP_ID,
  org_id: null,
  journey_id: JOURNEY_ID,
  name: 'Summer Fast Cohort',
  invite_code: 'FAST2026',
  privacy: 'anonymous',
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

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function createMockHandler({ missingGroupCommitments = false } = {}) {
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

    if (url.includes('/auth/v1/user')) return json(route, MOCK_USER);
    if (url.includes('/auth/v1/token')) return json(route, MOCK_SESSION);

    if (url.includes('/journeys') && method === 'POST') return json(route, GROUP.journey);
    if (url.includes('/groups') && method === 'POST') return json(route, GROUP);
    if (url.includes('/group_memberships') && method === 'POST') {
      return json(route, {
        id: 'membership-leader',
        group_id: GROUP_ID,
        user_id: USER_ID,
        role: 'leader',
        display_name: null,
        joined_at: '2026-06-01T12:00:00.000Z',
      });
    }

    if (url.includes('/group_commitments') && method === 'POST') {
      if (missingGroupCommitments) {
        return json(
          route,
          {
            code: 'PGRST205',
            details: null,
            hint: null,
            message: "Could not find the table 'public.group_commitments' in the schema cache",
          },
          404,
        );
      }
      return json(route, { group_id: GROUP_ID, commitments: [] });
    }

    if (url.includes('/member_covenants') && method === 'POST') {
      return json(route, {
        id: 'covenant-1',
        group_id: GROUP_ID,
        user_id: USER_ID,
        commitments_snapshot: [],
        signature: 'Group Leader',
        signed_at: '2026-06-01T12:00:00.000Z',
      });
    }

    if (url.includes('/group_memberships') && url.includes(`user_id=eq.${USER_ID}`)) {
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
    ({ authKey, session }) => {
      localStorage.setItem(authKey, JSON.stringify(session));
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    },
    { authKey: AUTH_STORAGE_KEY, session: MOCK_SESSION },
  );

  return context;
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await buildApp();

  const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4175'], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  try {
    await waitForServer(PREVIEW_URL);
    const browser = await chromium.launch();

    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await page.route(`${SUPABASE_URL}/**`, createMockHandler());
      await page.goto(`${PREVIEW_URL}/groups`);
      await page.getByRole('button', { name: 'Create Group' }).click();
      await page.getByRole('dialog', { name: 'Create Group' }).waitFor();
      await page.getByPlaceholder('Summer Fast Cohort').fill('Summer Fast Cohort');
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'create-group-modal.png'),
        fullPage: true,
      });
      await context.close();
    }

    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await page.route(`${SUPABASE_URL}/**`, createMockHandler({ missingGroupCommitments: true }));
      await page.goto(`${PREVIEW_URL}/groups`);
      await page.getByRole('button', { name: 'Create Group' }).click();
      const dialog = page.getByRole('dialog', { name: 'Create Group' });
      await dialog.getByPlaceholder('Summer Fast Cohort').fill('Test Group');
      await dialog.getByRole('button', { name: 'Create Group' }).click();
      await page.getByText('Group features are temporarily unavailable').waitFor();
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'create-group-schema-error.png'),
        fullPage: true,
      });
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
