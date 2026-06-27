import type { ReactNode } from 'react';
import { JournalTypeBadge } from './JournalTypePicker';
import { MoodBadge } from './MoodPicker';
import { VerseOfTheDayLabel } from './VerseOfTheDayLabel';
import { formatDisplayDate } from '../lib/dateUtils';
import {
  DAILY_REFLECTION_FIELDS,
  FITNESS_JOURNAL_LABEL,
  FOOD_JOURNAL_FIELDS,
  JOURNAL_ENTRY_TYPE_LABELS,
  isDailyReflectionEntry,
  isSingleContentJournalEntry,
} from '../lib/journalTags';
import type { JournalEntry } from '../types';

type Props = {
  entry: JournalEntry;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

type FieldDef<T extends string> = { key: T; label: string };

function FieldListBody<T extends string>({
  fields,
  getValue,
  renderHeading,
}: {
  fields: ReadonlyArray<FieldDef<T>>;
  getValue: (key: T) => string;
  renderHeading?: (field: FieldDef<T>) => ReactNode;
}) {
  const filledFields = fields.filter((field) => getValue(field.key).trim());
  if (filledFields.length === 0) {
    return <p className="text-body-md text-on-surface-variant">No reflection notes recorded.</p>;
  }

  return (
    <div className="space-y-stack-md">
      {filledFields.map((field) => (
        <section key={field.key}>
          {renderHeading ? (
            renderHeading(field)
          ) : (
            <h3 className="mb-1 text-body-md font-medium text-on-surface">{field.label}</h3>
          )}
          <p className="text-wrap-anywhere whitespace-pre-wrap text-body-md leading-relaxed text-on-surface-variant">
            {getValue(field.key)}
          </p>
        </section>
      ))}
    </div>
  );
}

export function JournalViewer({ entry, onBack, onEdit, onDelete }: Props) {
  const simpleContentLabel =
    entry.type === 'fitness' ? FITNESS_JOURNAL_LABEL : JOURNAL_ENTRY_TYPE_LABELS[entry.type];

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
        <FieldListBody
          fields={DAILY_REFLECTION_FIELDS}
          getValue={(key) => entry[key]}
          renderHeading={(field) =>
            field.key === 'prayerFocus' ? (
              <VerseOfTheDayLabel date={entry.date} as="heading" />
            ) : (
              <h3 className="mb-1 text-body-md font-medium text-on-surface">{field.label}</h3>
            )
          }
        />
      ) : entry.type === 'food' ? (
        <FieldListBody fields={FOOD_JOURNAL_FIELDS} getValue={(key) => entry[key]} />
      ) : isSingleContentJournalEntry(entry) && entry.content.trim() ? (
        <section>
          <h3 className="mb-1 text-body-md font-medium text-on-surface">{simpleContentLabel}</h3>
          <p className="text-wrap-anywhere whitespace-pre-wrap text-body-md leading-relaxed text-on-surface-variant">
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
