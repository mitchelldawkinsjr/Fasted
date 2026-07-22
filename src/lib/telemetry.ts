import * as Sentry from '@sentry/react';
import type { ErrorEvent, EventHint } from '@sentry/react';
import { scrubJoinInviteInText } from './analytics';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

function isSentryEnabled(): boolean {
  return Boolean(SENTRY_DSN) && !import.meta.env.DEV;
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
      if (crumb.data && typeof crumb.data.url === 'string') {
        crumb.data.url = scrubJoinInviteInText(crumb.data.url);
      }
      if (typeof crumb.message === 'string') {
        crumb.message = scrubJoinInviteInText(crumb.message);
      }
    }
  }
  return event;
}

/**
 * Init Sentry for production error monitoring. No-op when DSN is unset or in DEV.
 */
export function initSentry(): void {
  if (!isSentryEnabled()) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubSentryEvent,
  });
}

/**
 * Report a client error to Sentry (when enabled). Always logs in development.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.error('[telemetry]', error instanceof Error ? error.message : String(error), context ?? '');
  }

  if (!isSentryEnabled()) return;

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

export function reportWarning(message: string, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.warn('[telemetry]', message, context ?? '');
  }

  if (!isSentryEnabled()) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('details', context);
    }
    Sentry.captureMessage(message, 'warning');
  });
}
