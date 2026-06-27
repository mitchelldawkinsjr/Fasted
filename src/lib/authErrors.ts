import type { AuthError } from '@supabase/supabase-js';
import { messages } from './messages';

const NETWORK_ERROR_PATTERNS = [
  /^load failed$/i,
  /^failed to fetch$/i,
  /^networkerror/i,
  /^network request failed$/i,
  /^fetch failed$/i,
  /^the internet connection appears to be offline/i,
];

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message.trim();
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message).trim();
  }
  return '';
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const message = getErrorMessage(err);
  if (!message) return false;
  return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function isInvalidCredentialsError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const authErr = err as AuthError;
  if (authErr.status === 400) return true;
  const message = getErrorMessage(err).toLowerCase();
  return (
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password') ||
    message.includes('email not confirmed')
  );
}

export function formatAuthError(err: unknown, fallback?: string): string {
  const defaultFallback = fallback ?? messages.sync.authFailed;

  if (isNetworkError(err)) {
    return messages.sync.networkFailed;
  }

  if (isInvalidCredentialsError(err)) {
    return messages.sync.invalidCredentials;
  }

  const message = getErrorMessage(err);
  if (message && !NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return message;
  }

  return defaultFallback;
}

export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const attempts = options?.attempts ?? 3;
  const delayMs = options?.delayMs ?? 800;
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
