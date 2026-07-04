import {
  getSupabase,
  isSyncConfigured,
  TELEMETRY_EVENTS_TABLE,
} from './supabase';

type TelemetryLevel = 'error' | 'warning' | 'info';

type TelemetryEvent = {
  message: string;
  level: TelemetryLevel;
  context?: Record<string, unknown>;
  at: string;
};

type TelemetryInsert = {
  level: TelemetryLevel;
  message: string;
  context: Record<string, unknown>;
  reported_at: string;
  path?: string;
  user_agent?: string;
};

/**
 * Lightweight client telemetry. Events are delivered best-effort to the
 * optional webhook endpoint and, when explicitly enabled, the Supabase
 * telemetry table. Telemetry must never block or fail the app flow.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  emit({ message, level: 'error', context, at: new Date().toISOString() });
}

export function reportWarning(message: string, context?: Record<string, unknown>): void {
  emit({ message, level: 'warning', context, at: new Date().toISOString() });
}

function emit(event: TelemetryEvent): void {
  if (import.meta.env.DEV) {
    const log = event.level === 'error' ? console.error : console.warn;
    log('[telemetry]', event.message, event.context ?? '');
  }

  void persistToSupabase(event).catch(() => {
    /* never block the app on telemetry */
  });

  const endpoint = import.meta.env.VITE_TELEMETRY_URL;
  if (!endpoint || typeof fetch !== 'function') return;

  try {
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {
      /* never block the app on telemetry */
    });
  } catch {
    /* ignore */
  }
}

async function persistToSupabase(event: TelemetryEvent): Promise<void> {
  if (import.meta.env.VITE_TELEMETRY_SUPABASE !== 'true' || !isSyncConfigured()) return;

  const payload: TelemetryInsert = {
    level: event.level,
    message: event.message,
    context: event.context ?? {},
    reported_at: event.at,
    ...browserContext(),
  };

  const { error } = await getSupabase()
    .from(TELEMETRY_EVENTS_TABLE)
    .insert(payload);

  if (error) throw error;
}

function browserContext(): Pick<TelemetryInsert, 'path' | 'user_agent'> {
  if (typeof window === 'undefined') return {};

  return {
    path: `${window.location.pathname}${window.location.search}`,
    user_agent: window.navigator.userAgent,
  };
}
