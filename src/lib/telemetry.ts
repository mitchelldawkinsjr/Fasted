import * as Sentry from '@sentry/react';

/** Redact invite codes from paths and URLs before sending to Sentry. */
export function sanitizeSentryPath(value: string): string {
  const [pathname, search = ''] = value.split('?');
  const sanitizedPath = pathname.replace(/^\/join\/[^/]+/, '/join/:code');
  return search ? `${sanitizedPath}?${search}` : sanitizedPath;
}

function sanitizeSentryUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = sanitizeSentryPath(parsed.pathname);
    return parsed.toString();
  } catch {
    return sanitizeSentryPath(url);
  }
}

function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (event.request?.url) {
    event.request.url = sanitizeSentryUrl(event.request.url);
  }

  if (event.transaction) {
    event.transaction = sanitizeSentryPath(event.transaction);
  }

  if (event.breadcrumbs) {
    for (const crumb of event.breadcrumbs) {
      if (typeof crumb.data?.url === 'string') {
        crumb.data.url = sanitizeSentryUrl(crumb.data.url);
      }
      if (typeof crumb.data?.to === 'string') {
        crumb.data.to = sanitizeSentryUrl(crumb.data.to);
      }
    }
  }

  return event;
}

function isSentryEnabled(): boolean {
  return Boolean(import.meta.env.VITE_SENTRY_DSN) && !import.meta.env.DEV;
}

/** Initialize Sentry for production error monitoring when DSN is configured. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || import.meta.env.DEV) return;

  Sentry.init({
    dsn,
    environment: 'production',
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}

/**
 * Report an error to Sentry with optional caller context on scope `details`.
 * In development, logs to the console only.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.error('[telemetry]', error, context ?? '');
    return;
  }

  if (!isSentryEnabled()) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('details', context);
    }
    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }
    Sentry.captureMessage(String(error), 'error');
  });
}

/** Report a warning to Sentry with optional caller context on scope `details`. */
export function reportWarning(message: string, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.warn('[telemetry]', message, context ?? '');
    return;
  }

  if (!isSentryEnabled()) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('details', context);
    }
    Sentry.captureMessage(message, 'warning');
  });
}

export { Sentry };
