export type WhatsNewPayload = {
  version: string;
  title: string;
  publishedAt?: string;
  highlights: string[];
  url: string;
};

const LOCAL_URL = '/whats-new.json';
const GH_LATEST_API = 'https://api.github.com/repos/mitchelldawkinsjr/Fasted/releases/latest';
const RELEASES_PAGE = 'https://github.com/mitchelldawkinsjr/Fasted/releases';

let cached: WhatsNewPayload | null = null;
let inflight: Promise<WhatsNewPayload> | null = null;

let modalOpen = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeWhatsNewModal(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isWhatsNewModalOpen(): boolean {
  return modalOpen;
}

export function openWhatsNewModal(): void {
  modalOpen = true;
  notify();
}

export function closeWhatsNewModal(): void {
  modalOpen = false;
  notify();
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function highlightsFromMarkdown(body: string): string[] {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) =>
    /^##\s*(What'?s new|Added)\b/i.test(line.trim()),
  );
  if (start < 0) {
    return lines
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .slice(0, 8)
      .map((line) => stripMarkdown(line.replace(/^[-*]\s+/, '')));
  }

  const bullets: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^##\s/.test(line)) break;
    if (!line.startsWith('- ')) continue;
    bullets.push(stripMarkdown(line.replace(/^[-*]\s+/, '')));
    if (bullets.length >= 8) break;
  }
  return bullets;
}

async function loadLocal(): Promise<WhatsNewPayload | null> {
  try {
    const res = await fetch(LOCAL_URL, { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<WhatsNewPayload>;
    if (!data.version || !Array.isArray(data.highlights) || data.highlights.length === 0) {
      return null;
    }
    return {
      version: data.version,
      title: data.title ?? `What's new in Fasted`,
      publishedAt: data.publishedAt,
      highlights: data.highlights.map(stripMarkdown).filter(Boolean),
      url: data.url ?? RELEASES_PAGE,
    };
  } catch {
    return null;
  }
}

async function loadGitHubLatest(): Promise<WhatsNewPayload | null> {
  try {
    const res = await fetch(GH_LATEST_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      tag_name?: string;
      name?: string;
      body?: string;
      html_url?: string;
      published_at?: string;
      draft?: boolean;
    };
    if (data.draft || !data.tag_name) return null;
    const highlights = highlightsFromMarkdown(data.body ?? '');
    if (highlights.length === 0) return null;
    return {
      version: data.tag_name,
      title: data.name?.trim() || `What's new in Fasted`,
      publishedAt: data.published_at?.slice(0, 10),
      highlights,
      url: data.html_url ?? `${RELEASES_PAGE}/tag/${data.tag_name}`,
    };
  } catch {
    return null;
  }
}

/** Prefer shipped `/whats-new.json` (works offline after deploy); fall back to GitHub latest. */
export async function fetchWhatsNew(): Promise<WhatsNewPayload> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const local = await loadLocal();
    if (local) {
      cached = local;
      return local;
    }
    const remote = await loadGitHubLatest();
    if (remote) {
      cached = remote;
      return remote;
    }
    return {
      version: '',
      title: "What's new",
      highlights: ['Release notes will appear here after the next published update.'],
      url: RELEASES_PAGE,
    };
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Test helper */
export function __resetWhatsNewCacheForTests(): void {
  cached = null;
  inflight = null;
  modalOpen = false;
}
