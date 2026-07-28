import * as Sentry from '@sentry/react';
import type { ErrorEvent, EventHint, Log } from '@sentry/react';
import { scrubJoinInviteInText } from './analytics';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

type LogAttributes = Record<string, string | number | boolean>;

function isSentryEnabled(): boolean {
  return Boolean(SENTRY_DSN) && !import.meta.env.DEV;
}

/** Convert context into Sentry log attributes (string | number | boolean only). */
export function toLogAttributes(context?: Record<string, unknown>): LogAttributes | undefined {
  if (!context) return undefined;

  const attrs: LogAttributes = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string') {
      attrs[key] = scrubJoinInviteInText(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      attrs[key] = value;
    } else if (value != null) {
      attrs[key] = scrubJoinInviteInText(String(value));
    }
  }
  return Object.keys(attrs).length ? attrs : undefined;
}

/** Scrub invite codes from URLs before events leave the browser. */
export function scrubSentryEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  if (event.request?.url) {
    event.request.url = scrubJoinInviteInText(event.request.url);
  }
  if (event.transaction) {
    event.transaction = scrubJoinInviteInText(event.transaction);
  }
  if (event.breadcrumbs) {
    for (const crumb of event.breadcrumbs) {
      if (crumb.data) {
        for (const [key, value] of Object.entries(crumb.data)) {
          if (typeof value === 'string') {
            crumb.data[key] = scrubJoinInviteInText(value);
          }
        }
      }
      if (typeof crumb.message === 'string') {
        crumb.message = scrubJoinInviteInText(crumb.message);
      }
    }
  }
  return event;
}

/** Scrub invite codes from structured logs before they leave the browser. */
export function scrubSentryLog(log: Log): Log | null {
  if (log.level === 'debug' || log.level === 'trace') {
    return null;
  }

  if (typeof log.message === 'string') {
    log.message = scrubJoinInviteInText(log.message);
  }

  if (log.attributes) {
    for (const [key, value] of Object.entries(log.attributes)) {
      if (typeof value === 'string') {
        log.attributes[key] = scrubJoinInviteInText(value);
      }
    }
  }

  return log;
}

/**
 * Init Sentry for production error monitoring + structured logs.
 * No-op when DSN is unset or in DEV.
 */
export function initSentry(): void {
  if (!isSentryEnabled()) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableLogs: true,
    integrations: [Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] })],
    beforeSend: scrubSentryEvent,
    beforeSendLog: scrubSentryLog,
  });
}

/**
 * Report a client error to Sentry Issues + Logs (when enabled). Always logs in development.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);

  if (import.meta.env.DEV) {
    console.error('[telemetry]', message, context ?? '');
  }

  if (!isSentryEnabled()) return;

  const attrs = toLogAttributes(context);
  Sentry.logger.error(message, attrs);

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('details', context);
    }
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error), 'error');
    }
  });
}

/**
 * Report a warning as a structured Sentry log (when enabled). Always logs in development.
 */
export function reportWarning(message: string, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.warn('[telemetry]', message, context ?? '');
  }

  if (!isSentryEnabled()) return;

  Sentry.logger.warn(message, toLogAttributes(context));
}
