import { JournalTypeBadge } from './JournalTypePicker';
import { formatDisplayDate } from '../lib/dateUtils';
import {
  JOURNAL_ENTRY_TYPE_LABELS,
  isDailyReflectionEntry,
} from '../lib/journalTags';
import type { DailyReflectionEntry, JournalEntry } from '../types';

const DAILY_FIELDS: { key: keyof Pick<
  DailyReflectionEntry,
  'prayerFocus' | 'prayedAbout' | 'godTeaching' | 'hungerNotes' | 'victory' | 'tomorrowIntention'
>; label: string }[] = [
  { key: 'prayerFocus', label: 'Prayer point I focused on' },
  { key: 'prayedAbout', label: 'What I prayed about' },
  { key: 'godTeaching', label: 'What God is teaching me' },
  { key: 'hungerNotes', label: 'Hunger / discipline notes' },
  { key: 'victory', label: 'Victory today' },
  { key: 'tomorrowIntention', label: "Tomorrow's intention" },
];

type Props = {
  entry: JournalEntry;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function JournalViewer({ entry, onBack, onEdit, onDelete }: Props) {
  return (
    <div className="space-y-stack-md">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="label-caps text-on-surface-variant">{formatDisplayDate(entry.date)}</p>
          <JournalTypeBadge type={entry.type} className="mb-0 mt-2" />
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="text-label-caps text-secondary underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-label-caps text-error underline"
          >
            Delete
          </button>
        </div>
      </header>

      {isDailyReflectionEntry(entry) ? (
        (() => {
          const filledFields = DAILY_FIELDS.filter((field) => entry[field.key].trim());
          if (filledFields.length === 0) {
            return (
              <p className="text-body-md text-on-surface-variant">No reflection notes recorded.</p>
            );
          }
          return (
            <div className="space-y-stack-md">
              {filledFields.map((field) => (
                <section key={field.key}>
                  <h3 className="mb-1 text-body-md font-medium text-on-surface">{field.label}</h3>
                  <p className="whitespace-pre-wrap text-body-md leading-relaxed text-on-surface-variant">
                    {entry[field.key]}
                  </p>
                </section>
              ))}
            </div>
          );
        })()
      ) : entry.content.trim() ? (
        <section>
          <h3 className="mb-1 text-body-md font-medium text-on-surface">
            {JOURNAL_ENTRY_TYPE_LABELS[entry.type]}
          </h3>
          <p className="whitespace-pre-wrap text-body-md leading-relaxed text-on-surface-variant">
            {entry.content}
          </p>
        </section>
      ) : (
        <p className="text-body-md text-on-surface-variant">No reflection notes recorded.</p>
      )}

      <button type="button" onClick={onBack} className="btn-stitch-secondary w-full">
        Back to Journal
      </button>
    </div>
  );
}
