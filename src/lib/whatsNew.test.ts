import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __resetWhatsNewCacheForTests,
  fetchWhatsNew,
} from './whatsNew';

describe('fetchWhatsNew', () => {
  afterEach(() => {
    __resetWhatsNewCacheForTests();
    vi.unstubAllGlobals();
  });

  it('loads highlights from /whats-new.json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/whats-new.json')) {
          return {
            ok: true,
            json: async () => ({
              version: 'v1.1.0',
              title: "What's new in Fasted",
              publishedAt: '2026-07-28',
              highlights: ['**Plan My Food** — meal planning ([#168](https://example.com))'],
              url: 'https://github.com/mitchelldawkinsjr/Fasted/releases/tag/v1.1.0',
            }),
          };
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    const payload = await fetchWhatsNew();
    expect(payload.version).toBe('v1.1.0');
    expect(payload.highlights[0]).toBe('Plan My Food — meal planning (#168)');
    expect(payload.url).toContain('/releases/tag/v1.1.0');
  });

  it('falls back to GitHub latest when local file is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/whats-new.json')) {
          return { ok: false, json: async () => ({}) };
        }
        if (String(url).includes('api.github.com')) {
          return {
            ok: true,
            json: async () => ({
              tag_name: 'v9.9.9',
              name: 'v9.9.9',
              draft: false,
              published_at: '2026-07-28T12:00:00Z',
              html_url: 'https://github.com/mitchelldawkinsjr/Fasted/releases/tag/v9.9.9',
              body: '## Added\n\n- Cool feature from GitHub\n',
            }),
          };
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    const payload = await fetchWhatsNew();
    expect(payload.version).toBe('v9.9.9');
    expect(payload.highlights).toContain('Cool feature from GitHub');
  });
});
