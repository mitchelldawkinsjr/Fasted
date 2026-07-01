import type { AuthError } from '@supabase/supabase-js';

const NETWORK_FAILED =
  'Could not reach the server. Check your connection and try again.';
const INVALID_CREDENTIALS = 'Incorrect email or password. Please try again.';
const AUTH_FAILED = 'Sign in failed. Check your email and password.';
const GROUP_SCHEMA_UNAVAILABLE =
  'Group features are temporarily unavailable. The server database needs an update — please try again later or contact support.';
const GROUP_CREATE_FAILED = 'Could not create group. Please try again.';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message.trim();
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message).trim();
  }
  return '';
}

function getErrorCode(err: unknown): string | null {
  if (typeof err !== 'object' || err === null || !('code' in err)) return null;
  const code = (err as { code: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function isMissingSchemaError(err: unknown): boolean {
  const code = getErrorCode(err);
  if (code === 'PGRST205' || code === '42P01') return true;

  const message = getErrorMessage(err).toLowerCase();
  return (
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const message = getErrorMessage(err).toLowerCase();
  if (!message) return false;
  return (
    message.includes('load failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('network request failed') ||
    message.includes('fetch failed') ||
    message.includes('offline')
  );
}

function isInvalidCredentialsError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const authErr = err as AuthError;
  const message = getErrorMessage(err).toLowerCase();

  if (authErr.code === 'invalid_credentials') return true;

  return (
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password')
  );
}

export function formatGroupError(err: unknown, fallback = GROUP_CREATE_FAILED): string {
  if (isMissingSchemaError(err)) {
    return GROUP_SCHEMA_UNAVAILABLE;
  }

  const message = getErrorMessage(err);
  if (message) return message;

  return fallback;
}

export function formatAuthError(err: unknown, fallback = AUTH_FAILED): string {
  if (isNetworkError(err)) {
    return NETWORK_FAILED;
  }

  if (isInvalidCredentialsError(err)) {
    return INVALID_CREDENTIALS;
  }

  const message = getErrorMessage(err);
  if (message && !isNetworkError({ message })) {
    return message;
  }

  return fallback;
}

export async function withNetworkRetry<T>(fn: () => Promise<T>): Promise<T> {
  const attempts = 3;
  const delayMs = 800;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isNetworkError(err) || attempt === attempts - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }

  throw lastError;
}
