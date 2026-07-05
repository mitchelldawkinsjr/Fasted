import type { Page, Route } from '@playwright/test';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://auth.test.invalid';
export const AUTH_STORAGE_KEY = 'sb-auth-auth-token';

export const USER_ID = '11111111-1111-1111-1111-111111111111';
export const GROUP_ID = '22222222-2222-2222-2222-222222222222';
export const JOURNEY_ID = '33333333-3333-3333-3333-333333333333';

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

export const MOCK_SESSION = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: MOCK_USER,
};

export const GROUP = {
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

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

type GroupMockOptions = {
  myMemberships?: Array<{ group_id: string }>;
  missingGroupCommitments?: boolean;
  onCommitmentsCreated?: (commitments: unknown) => void;
};

export async function seedAuthSession(page: Page) {
  await page.addInitScript(
    ({ authKey, session }) => {
      localStorage.setItem(authKey, JSON.stringify(session));
      localStorage.setItem('fasted-calendar-install-toast-dismissed', '1');
    },
    { authKey: AUTH_STORAGE_KEY, session: MOCK_SESSION },
  );
}

export async function mockGroupsApi(page: Page, options: GroupMockOptions = {}) {
  const memberships = [...(options.myMemberships ?? [])];

  const addMembership = (groupId: string) => {
    if (!memberships.some((membership) => membership.group_id === groupId)) {
      memberships.push({ group_id: groupId });
    }
  };

  await page.route(`${SUPABASE_URL}/**`, async (route) => {
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

    if (url.includes('/journeys') && method === 'POST') {
      return json(route, GROUP.journey);
    }

    if (url.includes('/groups') && method === 'POST') {
      addMembership(GROUP_ID);
      return json(route, GROUP);
    }

    if (url.includes('/group_memberships') && method === 'POST') {
      addMembership(GROUP_ID);
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
      if (options.missingGroupCommitments) {
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
      const body = request.postDataJSON() as { commitments?: unknown } | null;
      options.onCommitmentsCreated?.(body?.commitments);
      return json(route, { group_id: GROUP_ID, commitments: body?.commitments ?? [] });
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
      return json(route, memberships);
    }

    if (url.includes('/groups') && (url.includes(`id=eq.${GROUP_ID}`) || url.includes('id=in.'))) {
      return json(route, [GROUP]);
    }

    if (url.includes('/group_commitments') && url.includes(`group_id=eq.${GROUP_ID}`)) {
      return json(route, [{ group_id: GROUP_ID, commitments: [] }]);
    }

    if (url.includes('/member_covenants')) {
      return json(route, []);
    }

    if (url.includes('/shared_journal_entries') || url.includes('/prayer_requests') || url.includes('/user_progress')) {
      return json(route, []);
    }

    return json(route, []);
  });
}
