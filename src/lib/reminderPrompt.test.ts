import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dismissReminderPrompt, wasReminderPromptDismissed } from './pwaInstall';

const KEY = 'fasted-calendar-reminder-prompt-dismissed';
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reminder prompt dismiss flag', () => {
  it('starts undismissed', () => {
    expect(wasReminderPromptDismissed()).toBe(false);
  });

  it('persists dismiss across reads', () => {
    dismissReminderPrompt();
    expect(wasReminderPromptDismissed()).toBe(true);
    expect(store.get(KEY)).toBe('1');
  });
});
