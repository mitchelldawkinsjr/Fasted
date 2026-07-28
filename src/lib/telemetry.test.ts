import { describe, expect, it } from 'vitest';
import { beforeSendLog, scrubJoinCodes, toLogAttributes } from './telemetry';

describe('scrubJoinCodes', () => {
  it('redacts join invite codes from text', () => {
    expect(scrubJoinCodes('Failed to join /join/secret-code-123')).toBe(
      'Failed to join /join/:code',
    );
    expect(scrubJoinCodes('/join/abc?ref=1')).toBe('/join/:code?ref=1');
  });

  it('leaves other paths unchanged', () => {
    expect(scrubJoinCodes('/groups/uuid-here')).toBe('/groups/uuid-here');
  });
});

describe('toLogAttributes', () => {
  it('keeps string, number, and boolean values only', () => {
    expect(
      toLogAttributes({
        source: 'pushProgressToCloud',
        count: 3,
        retry: true,
        nested: { ignored: true },
        items: ['a'],
        missing: undefined,
      }),
    ).toEqual({
      source: 'pushProgressToCloud',
      count: 3,
      retry: true,
    });
  });

  it('scrubs join codes from string attributes', () => {
    expect(toLogAttributes({ path: '/join/my-secret' })).toEqual({
      path: '/join/:code',
    });
  });
});

describe('beforeSendLog', () => {
  it('drops debug and trace logs', () => {
    expect(beforeSendLog({ level: 'debug', message: 'diag' })).toBeNull();
    expect(beforeSendLog({ level: 'trace', message: 'fine-grained' })).toBeNull();
  });

  it('scrubs join codes from message and string attributes', () => {
    const result = beforeSendLog({
      level: 'warn',
      message: 'Invite failed for /join/abc123',
      attributes: {
        route: '/join/abc123',
        count: 1,
      },
    });

    expect(result).toEqual({
      level: 'warn',
      message: 'Invite failed for /join/:code',
      attributes: {
        route: '/join/:code',
        count: 1,
      },
    });
  });

  it('passes through warn and error logs unchanged when no scrubbing needed', () => {
    const log = {
      level: 'error' as const,
      message: 'Sync failed',
      attributes: { source: 'reconcileWithCloud' },
    };
    expect(beforeSendLog(log)).toEqual(log);
  });
});
