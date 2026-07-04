import type { ReactNode } from 'react';
import { JournalTypeBadge } from './JournalTypePicker';
import { MoodBadge } from './MoodPicker';
import { VerseOfTheDayLabel } from './VerseOfTheDayLabel';
import { useMealImageUrls } from '../hooks/useMealImageUrls';
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

type FieldDef<T extends string> = { key: T; label: string; sectionName?: string };

type JournalEntryBodyClasses = {
  fields: string;
  section: string;
  label: string;
  value: string;
  empty: string;
  mealImages: string;
  mealImage: string;
};

function MealImageGallery({
  imageIds,
  sectionName,
  classes,
}: {
  imageIds: string[];
  sectionName: string;
  classes: Pick<JournalEntryBodyClasses, 'mealImages' | 'mealImage'>;
}) {
  const urls = useMealImageUrls(imageIds);

  return (
    <div className={classes.mealImages}>
      {imageIds.map((imageId, index) =>
        urls[index] ? (
          <img
            key={imageId}
            src={urls[index]}
            alt={`${sectionName} photo ${index + 1}`}
            className={classes.mealImage}
          />
        ) : null,
      )}
    </div>
  );
}

const DEFAULT_ENTRY_BODY_CLASSES: JournalEntryBodyClasses = {
  fields: 'space-y-stack-md',
  section: '',
  label: 'mb-1 text-body-md font-medium text-on-surface',
  value: 'text-wrap-anywhere whitespace-pre-wrap text-body-md leading-relaxed text-on-surface-variant',
  empty: 'text-body-md text-on-surface-variant',
  mealImages: 'mt-2 flex flex-wrap gap-2',
  mealImage: 'h-24 w-24 rounded-lg border border-outline-variant object-cover',
};

function FieldListBody<T extends string>({
  fields,
  getValue,
  renderHeading,
  renderExtra,
  classes,
  emptyMessage,
}: {
  fields: ReadonlyArray<FieldDef<T>>;
  getValue: (key: T) => string;
  renderHeading?: (field: FieldDef<T>) => ReactNode;
  renderExtra?: (field: FieldDef<T>) => ReactNode;
  classes: JournalEntryBodyClasses;
  emptyMessage: ReactNode;
}) {
  const filledFields = fields.filter(
    (field) => getValue(field.key).trim() || renderExtra?.(field),
  );
  if (filledFields.length === 0) {
    return emptyMessage ? <p className={classes.empty}>{emptyMessage}</p> : null;
  }

  return (
    <div className={classes.fields}>
      {filledFields.map((field) => (
        <section key={field.key} className={classes.section}>
          {renderHeading ? (
            renderHeading(field)
          ) : (
            <h3 className={classes.label}>{field.label}</h3>
          )}
          {getValue(field.key).trim() ? (
            <p className={classes.value}>{getValue(field.key)}</p>
          ) : null}
          {renderExtra?.(field)}
        </section>
      ))}
    </div>
  );
}

type JournalEntryBodyProps = {
  entry: JournalEntry;
  classes?: JournalEntryBodyClasses;
  emptyMessage?: ReactNode;
  renderVerseHeading?: (entry: JournalEntry) => ReactNode;
};

export function JournalEntryBody({
  entry,
  classes = DEFAULT_ENTRY_BODY_CLASSES,
  emptyMessage = 'No reflection notes recorded.',
  renderVerseHeading = (item) => <VerseOfTheDayLabel date={item.date} as="heading" />,
}: JournalEntryBodyProps) {
  const simpleContentLabel = getSimpleContentLabel(entry.type);
  const mealImages = entry.type === 'food' ? getMealImages(entry.id) : {};

  const renderMealImages = (key: FoodMealKey, sectionName: string) => {
    const images = mealImages[key];
    if (!images || images.length === 0) return null;

    return (
      <MealImageGallery imageIds={images} sectionName={sectionName} classes={classes} />
    );
  };

  if (isDailyReflectionEntry(entry)) {
    return (
      <FieldListBody
        fields={DAILY_REFLECTION_FIELDS}
        getValue={(key) => entry[key]}
        classes={classes}
        emptyMessage={emptyMessage}
        renderHeading={(field) =>
          field.key === 'prayerFocus' ? (
            renderVerseHeading(entry)
          ) : (
            <h3 className={classes.label}>{field.label}</h3>
          )
        }
      />
    );
  }

  if (entry.type === 'food') {
    return (
      <FieldListBody
        fields={FOOD_JOURNAL_FIELDS}
        getValue={(key) => entry[key]}
        classes={classes}
        emptyMessage={emptyMessage}
        renderExtra={(field) =>
          renderMealImages(field.key as FoodMealKey, field.sectionName ?? field.label)
        }
      />
    );
  }

  if (isSingleContentJournalEntry(entry) && entry.content.trim()) {
    return (
      <section className={classes.section}>
        <h3 className={classes.label}>{simpleContentLabel}</h3>
        <p className={classes.value}>{entry.content}</p>
      </section>
    );
  }

  return emptyMessage ? <p className={classes.empty}>{emptyMessage}</p> : null;
}

export function JournalViewer({ entry, onBack, onEdit, onDelete, onTypeClick }: Props) {
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

      <JournalEntryBody entry={entry} />

      <button type="button" onClick={onBack} className="btn-stitch-secondary w-full">
        Back to Journal
      </button>
    </div>
  );
}
