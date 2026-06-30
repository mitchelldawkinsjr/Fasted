import type { ReactNode } from 'react';
import { JournalTypeBadge } from './JournalTypePicker';
import { MoodBadge } from './MoodPicker';
import { VerseOfTheDayLabel } from './VerseOfTheDayLabel';
import { formatDisplayDate } from '../lib/dateUtils';
import {
  DAILY_REFLECTION_FIELDS,
  FOOD_JOURNAL_FIELDS,
  getSimpleContentLabel,
  isDailyReflectionEntry,
  isSingleContentJournalEntry,
} from '../lib/journalTags';
import { getMealImages } from '../lib/storage';
import type { FoodMealKey, JournalEntry, JournalEntryType } from '../types';

type Props = {
  entry: JournalEntry;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTypeClick: (type: JournalEntryType) => void;
};

type FieldDef<T extends string> = { key: T; label: string };

function FieldListBody<T extends string>({
  fields,
  getValue,
  renderHeading,
  renderExtra,
}: {
  fields: ReadonlyArray<FieldDef<T>>;
  getValue: (key: T) => string;
  renderHeading?: (field: FieldDef<T>) => ReactNode;
  renderExtra?: (field: FieldDef<T>) => ReactNode;
}) {
  const filledFields = fields.filter(
    (field) => getValue(field.key).trim() || renderExtra?.(field),
  );
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
          {getValue(field.key).trim() ? (
            <p className="text-wrap-anywhere whitespace-pre-wrap text-body-md leading-relaxed text-on-surface-variant">
              {getValue(field.key)}
            </p>
          ) : null}
          {renderExtra?.(field)}
        </section>
      ))}
    </div>
  );
}

export function JournalViewer({ entry, onBack, onEdit, onDelete, onTypeClick }: Props) {
  const simpleContentLabel = getSimpleContentLabel(entry.type);
  const mealImages = entry.type === 'food' ? getMealImages(entry.id) : {};

  const renderMealImages = (key: FoodMealKey, sectionName: string) => {
    const images = mealImages[key];
    if (!images || images.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((src, index) => (
          <img
            key={`${key}-${index}`}
            src={src}
            alt={`${sectionName} photo ${index + 1}`}
            className="h-24 w-24 rounded-lg border border-outline-variant object-cover"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-stack-md">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="label-caps text-on-surface-variant">{formatDisplayDate(entry.date)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <JournalTypeBadge type={entry.type} onClick={onTypeClick} />
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
        <FieldListBody
          fields={FOOD_JOURNAL_FIELDS}
          getValue={(key) => entry[key]}
          renderExtra={(field) => {
            const section = FOOD_JOURNAL_FIELDS.find((item) => item.key === field.key);
            return renderMealImages(field.key, section?.sectionName ?? field.label);
          }}
        />
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
