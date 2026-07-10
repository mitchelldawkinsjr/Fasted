import type { ReminderKind } from '../lib/pushReminders';
import { REMINDER_COPY } from '../lib/pushReminders';
import { Icon } from './Icon';

type ReminderPreviewBannerProps = {
  kind: ReminderKind;
  onDismiss: () => void;
};

/** In-app mock of a system reminder — used for DEV previews (not a real OS notification). */
export function ReminderPreviewBanner({ kind, onDismiss }: ReminderPreviewBannerProps) {
  const copy = REMINDER_COPY[kind];
  const label = kind === 'morning' ? 'Morning reminder' : 'Evening reminder';

  return (
    <div
      className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-grace-up animate-fade-in-up"
      role="status"
      aria-live="polite"
      aria-label={`${label} preview`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-container">
          <img src="/icon-192.png" alt="" className="h-10 w-10 object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-headline-md text-primary">{copy.title}</p>
            <span className="shrink-0 text-label-sm uppercase tracking-wide text-outline">now</span>
          </div>
          <p className="mt-0.5 text-body-md text-on-surface-variant">{copy.body}</p>
          <p className="mt-2 text-body-sm text-outline">DEV preview · {label}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-outline transition hover:text-primary"
          aria-label="Dismiss preview"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}
