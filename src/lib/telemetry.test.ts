import { describe, expect, it } from 'vitest';
import { sanitizeSentryPath } from './telemetry';

describe('sanitizeSentryPath', () => {
  it('redacts join invite codes from the path', () => {
    expect(sanitizeSentryPath('/join/secret-code-123')).toBe('/join/:code');
    expect(sanitizeSentryPath('/join/abc?ref=1')).toBe('/join/:code?ref=1');
  });

  it('leaves other routes unchanged', () => {
    expect(sanitizeSentryPath('/journal?type=food')).toBe('/journal?type=food');
    expect(sanitizeSentryPath('/groups/uuid-here')).toBe('/groups/uuid-here');
  });
});
