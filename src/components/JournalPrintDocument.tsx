import type { ReactNode } from 'react';
import { DAY_MOOD_OPTIONS } from '../lib/dayMood';
import { formatDisplayDate } from '../lib/dateUtils';
import {
  DAILY_REFLECTION_FIELDS,
  FOOD_JOURNAL_FIELDS,
  FITNESS_JOURNAL_LABEL,
  JOURNAL_ENTRY_TYPE_LABELS,
  VERSE_OF_THE_DAY_LABEL,
  getSimpleContentLabel,
  isDailyReflectionEntry,
  isSingleContentJournalEntry,
} from '../lib/journalTags';
import type { JournalExportModel } from '../lib/journalExport/types';
import type { DayMood, JournalEntry } from '../types';

type FieldDef<T extends string> = { key: T; label: string };

function PrintFieldList<T extends string>({
  fields,
  getValue,
  renderHeading,
}: {
  fields: ReadonlyArray<FieldDef<T>>;
  getValue: (key: T) => string;
  renderHeading?: (field: FieldDef<T>) => ReactNode;
}) {
  const filledFields = fields.filter((field) => getValue(field.key).trim());
  if (filledFields.length === 0) return null;

  return (
    <div className="print-entry-fields">
      {filledFields.map((field) => (
        <section key={field.key} className="print-field">
          {renderHeading ? (
            renderHeading(field)
          ) : (
            <h3 className="print-field-label">{field.label}</h3>
          )}
          <p className="print-field-value">{getValue(field.key)}</p>
        </section>
      ))}
    </div>
  );
}

function PrintMoodBadge({ mood }: { mood: DayMood }) {
  const option = DAY_MOOD_OPTIONS.find((item) => item.value === mood) ?? DAY_MOOD_OPTIONS[2];

  return (
    <span className="print-meta-chip">
      <span className="print-mood-dot" style={{ backgroundColor: option.color }} aria-hidden />
      {option.label}
    </span>
  );
}

function PrintTypeBadge({ type }: { type: JournalEntry['type'] }) {
  const label = `#${JOURNAL_ENTRY_TYPE_LABELS[type].toUpperCase().replace(/\s+/g, ' ')}`;
  return <span className="print-meta-chip">{label}</span>;
}

function PrintEntryBody({ entry }: { entry: JournalEntry }) {
  if (isDailyReflectionEntry(entry)) {
    return (
      <PrintFieldList
        fields={DAILY_REFLECTION_FIELDS}
        getValue={(key) => entry[key]}
        renderHeading={(field) =>
          field.key === 'prayerFocus' ? (
            <h3 className="print-field-label">{VERSE_OF_THE_DAY_LABEL}</h3>
          ) : (
            <h3 className="print-field-label">{field.label}</h3>
          )
        }
      />
    );
  }

  if (entry.type === 'food') {
    return <PrintFieldList fields={FOOD_JOURNAL_FIELDS} getValue={(key) => entry[key]} />;
  }

  if (isSingleContentJournalEntry(entry) && entry.content.trim()) {
    const label =
      entry.type === 'fitness' ? FITNESS_JOURNAL_LABEL : getSimpleContentLabel(entry.type);
    return (
      <section className="print-field">
        <h3 className="print-field-label">{label}</h3>
        <p className="print-field-value">{entry.content}</p>
      </section>
    );
  }

  return null;
}

function PrintCoverPage({ model }: { model: JournalExportModel }) {
  const dateRangeLabel =
    model.dateRange &&
    `${formatDisplayDate(model.dateRange.start)} — ${formatDisplayDate(model.dateRange.end)}`;

  return (
    <section className="print-cover">
      <div className="print-cover-inner">
        <p className="print-cover-brand">Fasted</p>
        <h1 className="print-cover-title">
          {model.journeyName ?? 'My Spiritual Journal'}
        </h1>
        {dateRangeLabel && <p className="print-cover-range">{dateRangeLabel}</p>}
        <div className="print-cover-stats">
          <p>
            <span className="print-cover-stat-label">Entries</span>
            <span className="print-cover-stat-value">{model.entryCount}</span>
          </p>
          <p>
            <span className="print-cover-stat-label">Exported</span>
            <span className="print-cover-stat-value">{model.exportDate}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function PrintEntryPage({ entry }: { entry: JournalEntry }) {
  return (
    <article className="print-entry">
      <header className="print-entry-header">
        <p className="print-entry-date">{formatDisplayDate(entry.date)}</p>
        <div className="print-entry-meta">
          <PrintTypeBadge type={entry.type} />
          {isDailyReflectionEntry(entry) && entry.dayMood && (
            <PrintMoodBadge mood={entry.dayMood} />
          )}
        </div>
      </header>
      <PrintEntryBody entry={entry} />
    </article>
  );
}

type Props = {
  model: JournalExportModel;
};

export function JournalPrintDocument({ model }: Props) {
  return (
    <div className="journal-print-document">
      <style>{`
        @page {
          size: letter;
          margin: 0.75in 0.85in 1in;
        }

        @media print {
          html, body {
            background: #ffffff !important;
            color: #191d16 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .journal-print-document {
            background: #ffffff;
          }

          .print-cover {
            break-after: page;
            page-break-after: always;
          }

          .print-entry {
            break-after: page;
            page-break-after: always;
          }

          .print-entry:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            padding: 0 0.85in;
            font-size: 10px;
            color: #73796b;
          }
        }

        .journal-print-document {
          font-family: Inter, system-ui, sans-serif;
          font-size: 16px;
          line-height: 1.5;
          color: #191d16;
          background: #ffffff;
        }

        .print-cover {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          box-sizing: border-box;
        }

        .print-cover-inner {
          text-align: center;
          max-width: 28rem;
        }

        .print-cover-brand {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 14px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #506442;
          margin: 0 0 1.5rem;
        }

        .print-cover-title {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 2rem;
          line-height: 1.25;
          font-weight: 700;
          color: #173d00;
          margin: 0 0 1rem;
        }

        .print-cover-range {
          font-size: 1rem;
          color: #42493c;
          margin: 0 0 2.5rem;
        }

        .print-cover-stats {
          display: flex;
          justify-content: center;
          gap: 3rem;
        }

        .print-cover-stats p {
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .print-cover-stat-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #73796b;
        }

        .print-cover-stat-value {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.125rem;
          color: #173d00;
        }

        .print-entry {
          padding: 0 0 2rem;
        }

        .print-entry-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e1e3d9;
        }

        .print-entry-date {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #42493c;
          margin: 0 0 0.75rem;
        }

        .print-entry-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .print-meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          border-radius: 0.25rem;
          background: #e7e9df;
          padding: 0.125rem 0.5rem;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #42493c;
        }

        .print-mood-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 9999px;
          flex-shrink: 0;
        }

        .print-entry-fields {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .print-field-label {
          font-size: 1rem;
          font-weight: 500;
          color: #191d16;
          margin: 0 0 0.25rem;
        }

        .print-field-value {
          font-size: 1rem;
          line-height: 1.625;
          color: #42493c;
          margin: 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .print-footer {
          display: none;
        }

        @media print {
          .print-footer {
            display: flex;
          }
        }
      `}</style>

      <PrintCoverPage model={model} />
      {model.entries.map((entry) => (
        <PrintEntryPage key={entry.id} entry={entry} />
      ))}
      <footer className="print-footer">
        <span>Exported from Fasted</span>
        <span />
      </footer>
    </div>
  );
}
