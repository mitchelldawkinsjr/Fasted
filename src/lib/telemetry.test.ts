import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getSupabase: vi.fn(),
  insert: vi.fn(),
  isSyncConfigured: vi.fn(),
}));

vi.mock('./supabase', () => ({
  getSupabase: mocks.getSupabase,
  isSyncConfigured: mocks.isSyncConfigured,
  TELEMETRY_EVENTS_TABLE: 'telemetry_events',
}));

import { reportError, reportWarning } from './telemetry';

async function flushTelemetry(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('telemetry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();

    mocks.from.mockReset();
    mocks.getSupabase.mockReset();
    mocks.insert.mockReset();
    mocks.isSyncConfigured.mockReset();

    mocks.insert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.getSupabase.mockReturnValue({ from: mocks.from });
    mocks.isSyncConfigured.mockReturnValue(true);

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('records opted-in telemetry in Supabase', async () => {
    vi.stubEnv('VITE_TELEMETRY_SUPABASE', 'true');

    reportWarning('Cloud sync failed', { source: 'pushProgressToCloud' });
    await flushTelemetry();

    expect(mocks.from).toHaveBeenCalledWith('telemetry_events');
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warning',
        message: 'Cloud sync failed',
        context: { source: 'pushProgressToCloud' },
        reported_at: expect.any(String),
      }),
    );
  });

  it('does not write Supabase telemetry unless enabled', async () => {
    vi.stubEnv('VITE_TELEMETRY_SUPABASE', 'false');

    reportWarning('Cloud sync failed');
    await flushTelemetry();

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('keeps posting to the configured telemetry endpoint', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_TELEMETRY_URL', 'https://collector.example/telemetry');
    mocks.isSyncConfigured.mockReturnValue(false);

    reportError(new Error('Auth failed'), { source: 'signIn' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://collector.example/telemetry',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        keepalive: true,
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      level: 'error',
      message: 'Auth failed',
      context: { source: 'signIn' },
    });
  });

  it('swallows Supabase telemetry write failures', async () => {
    vi.stubEnv('VITE_TELEMETRY_SUPABASE', 'true');
    mocks.insert.mockRejectedValueOnce(new Error('database unavailable'));

    expect(() => reportError(new Error('Sync failed'))).not.toThrow();
    await flushTelemetry();

    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });
});
