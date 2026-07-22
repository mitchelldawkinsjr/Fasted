import { describe, expect, it } from 'vitest';
import { sanitizeAnalyticsPath, scrubJoinInviteInText } from './analytics';
import { scrubSentryEvent } from './telemetry';
import type { ErrorEvent } from '@sentry/react';

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

describe('scrubJoinInviteInText', () => {
  it('redacts invite codes in full URLs', () => {
    expect(scrubJoinInviteInText('https://app.example.com/join/secret-code-123')).toBe(
      'https://app.example.com/join/:code',
    );
    expect(scrubJoinInviteInText('https://app.example.com/join/abc?ref=1')).toBe(
      'https://app.example.com/join/:code?ref=1',
    );
  });
});

describe('scrubSentryEvent', () => {
  it('redacts join codes from request URL, transaction, and breadcrumbs', () => {
    const event = {
      request: { url: 'https://app.example.com/join/secret-xyz' },
      transaction: '/join/secret-xyz',
      breadcrumbs: [
        { message: 'Navigated to /join/secret-xyz', data: { url: 'https://app.example.com/join/secret-xyz' } },
      ],
    } as unknown as ErrorEvent;

    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed?.request?.url).toBe('https://app.example.com/join/:code');
    expect(scrubbed?.transaction).toBe('/join/:code');
    expect(scrubbed?.breadcrumbs?.[0]?.message).toBe('Navigated to /join/:code');
    expect(scrubbed?.breadcrumbs?.[0]?.data?.url).toBe('https://app.example.com/join/:code');
  });
});
