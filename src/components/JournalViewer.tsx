import { JournalTypeBadge } from './JournalTypePicker';
import { MoodBadge } from './MoodPicker';
import { formatDisplayDate } from '../lib/dateUtils';
import {
  DAILY_REFLECTION_FIELDS,
  JOURNAL_ENTRY_TYPE_LABELS,
  isDailyReflectionEntry,
} from '../lib/journalTags';
import type { JournalEntry } from '../types';

type Props = {
  entry: JournalEntry;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function DailyReflectionBody({ entry }: { entry: Extract<JournalEntry, { type: 'daily-reflection' }> }) {
  const filledFields = DAILY_REFLECTION_FIELDS.filter((field) => entry[field.key].trim());
  if (filledFields.length === 0) {
    return <p className="text-body-md text-on-surface-variant">No devotion notes recorded.</p>;
  }

  return (
    <div className="space-y-stack-md">
      {filledFields.map((field) => (
        <section key={field.key}>
          <h3 className="mb-1 text-body-md font-medium text-on-surface">{field.label}</h3>
          <p className="text-wrap-anywhere whitespace-pre-wrap text-body-md leading-relaxed text-on-surface-variant">
            {entry[field.key]}
          </p>
        </section>
      ))}
    </div>
  );
}

export function JournalViewer({ entry, onBack, onEdit, onDelete }: Props) {
  return (
    <div className="space-y-stack-md">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="label-caps text-on-surface-variant">{formatDisplayDate(entry.date)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <JournalTypeBadge type={entry.type} />
            {isDailyReflectionEntry(entry) && entry.dayMood && (
              <MoodBadge mood={entry.dayMood} />
            )}
          </div>
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
        <DailyReflectionBody entry={entry} />
      ) : entry.content.trim() ? (
        <section>
          <h3 className="mb-1 text-body-md font-medium text-on-surface">
            {JOURNAL_ENTRY_TYPE_LABELS[entry.type]}
          </h3>
          <p className="text-wrap-anywhere whitespace-pre-wrap text-body-md leading-relaxed text-on-surface-variant">
            {entry.content}
          </p>
        </section>
      ) : (
        <p className="text-body-md text-on-surface-variant">No devotion notes recorded.</p>
      )}

      <button type="button" onClick={onBack} className="btn-stitch-secondary w-full">
        Back to Journal
      </button>
    </div>
  );
}
