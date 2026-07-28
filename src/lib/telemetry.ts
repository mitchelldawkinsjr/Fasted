import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN?.trim();
const JOIN_CODE_PATTERN = /\/join\/[^/\s?#]+/g;

export type LogAttributes = Record<string, string | number | boolean>;

type SentryLog = Parameters<NonNullable<Sentry.BrowserOptions['beforeSendLog']>>[0];

let telemetryReady = false;

/** Redact group invite codes from telemetry text (mirrors analytics path scrubbing). */
export function scrubJoinCodes(text: string): string {
  return text.replace(JOIN_CODE_PATTERN, '/join/:code');
}

/** Keep only primitive attributes Sentry Logs accepts. */
export function toLogAttributes(context?: Record<string, unknown>): LogAttributes {
  if (!context) return {};
  const attrs: LogAttributes = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string') {
      attrs[key] = scrubJoinCodes(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      attrs[key] = value;
    }
  }
  return attrs;
}

/** Filter and scrub logs before they reach Sentry Explore. */
export function beforeSendLog(log: SentryLog): SentryLog | null {
  if (log.level === 'debug' || log.level === 'trace') {
    return null;
  }

  const message =
    typeof log.message === 'string' ? scrubJoinCodes(log.message) : log.message;

  const attributes = log.attributes ? { ...log.attributes } : undefined;
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === 'string') {
        attributes[key] = scrubJoinCodes(value);
      }
    }
  }

  return { ...log, message, attributes };
}

function shouldInitSentry(): boolean {
  return Boolean(SENTRY_DSN) && !import.meta.env.DEV && import.meta.env.VITE_E2E !== 'true';
}

/**
 * Initialize Sentry error monitoring and structured logs for production.
 * Uses `VITE_SENTRY_DSN`; no-ops in dev, e2e, or when the DSN is unset.
 */
export function initTelemetry(): void {
  if (telemetryReady || !shouldInitSentry()) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    enableLogs: true,
    tracesSampleRate: 0,
    integrations: [Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] })],
    beforeSendLog,
  });

  telemetryReady = true;
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const attrs = toLogAttributes(context);

  if (import.meta.env.DEV) {
    console.error('[telemetry]', message, context ?? '');
  }

  if (!telemetryReady) return;

  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(attrs)) {
      scope.setExtra(key, value);
    }
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(scrubJoinCodes(message), 'error');
    }
  });

  Sentry.logger.error(scrubJoinCodes(message), attrs);
}

/** Emit a warning log only — does not create a Sentry Issue. */
export function reportWarning(message: string, context?: Record<string, unknown>): void {
  const attrs = toLogAttributes(context);

  if (import.meta.env.DEV) {
    console.warn('[telemetry]', message, context ?? '');
  }

  if (!telemetryReady) return;

  Sentry.logger.warn(scrubJoinCodes(message), attrs);
}
