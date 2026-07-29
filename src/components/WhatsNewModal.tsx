import { useEffect, useState } from 'react';
import {
  closeWhatsNewModal,
  fetchWhatsNew,
  isWhatsNewModalOpen,
  subscribeWhatsNewModal,
  type WhatsNewPayload,
} from '../lib/whatsNew';
import { Icon } from './Icon';

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function WhatsNewModal() {
  const [open, setOpen] = useState(isWhatsNewModalOpen);
  const [payload, setPayload] = useState<WhatsNewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeWhatsNewModal(() => setOpen(isWhatsNewModalOpen())), []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchWhatsNew()
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load what’s new right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWhatsNewModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const dateLabel = formatDate(payload?.publishedAt);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeWhatsNewModal();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-md animate-fade-in-up overflow-y-auto rounded-xl bg-surface-container-lowest p-stack-lg shadow-grace">
        <div className="mb-stack-md flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <Icon name="new_releases" filled />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="whats-new-title" className="font-display text-headline-md text-primary">
              {payload?.title ?? "What's new"}
            </h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              {[payload?.version, dateLabel].filter(Boolean).join(' · ') || 'Latest update'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeWhatsNewModal}
            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        {loading && (
          <p className="text-body-md text-on-surface-variant">Loading highlights…</p>
        )}
        {error && <p className="text-body-md text-error">{error}</p>}
        {!loading && !error && payload && (
          <ul className="mb-stack-md list-disc space-y-2 pl-5 text-body-md text-on-surface">
            {payload.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {payload?.url && (
            <a
              href={payload.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-stitch-secondary flex flex-1 items-center justify-center gap-2"
            >
              Full release notes
              <Icon name="open_in_new" size={18} />
            </a>
          )}
          <button
            type="button"
            onClick={closeWhatsNewModal}
            className="btn-stitch-primary flex-1"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
