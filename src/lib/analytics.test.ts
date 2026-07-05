import { describe, expect, it } from 'vitest';
import { sanitizeAnalyticsPath } from './analytics';

describe('sanitizeAnalyticsPath', () => {
  it('redacts join invite codes from the path', () => {
    expect(sanitizeAnalyticsPath('/join/secret-code-123')).toBe('/join/:code');
    expect(sanitizeAnalyticsPath('/join/abc?ref=1')).toBe('/join/:code?ref=1');
  });

  it('leaves other routes unchanged', () => {
    expect(sanitizeAnalyticsPath('/journal?type=food')).toBe('/journal?type=food');
    expect(sanitizeAnalyticsPath('/groups/uuid-here')).toBe('/groups/uuid-here');
  });
});
