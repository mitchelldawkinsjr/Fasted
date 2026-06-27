const STORAGE_KEY = 'fasted_auth_return_path';

export function setAuthReturnPath(path: string): void {
  if (!path || path === '/settings') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    /* storage unavailable */
  }
}

export function peekAuthReturnPath(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function consumeAuthReturnPath(): string | null {
  const path = peekAuthReturnPath();
  if (!path) return null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  return path;
}
