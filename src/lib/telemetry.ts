type TelemetryLevel = 'error' | 'warning' | 'info';

type TelemetryEvent = {
  message: string;
  level: TelemetryLevel;
  context?: Record<string, unknown>;
  at: string;
};

/**
 * Lightweight client telemetry. When `VITE_TELEMETRY_URL` is set, events are
 * POSTed as JSON. Otherwise errors only log in development.
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
