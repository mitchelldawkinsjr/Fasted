import { JournalEntryBody } from './JournalViewer';
import { JournalTypeBadge } from './JournalTypePicker';
import { MoodBadge } from './MoodPicker';
import { formatDisplayDate, getLocalDateString } from '../lib/dateUtils';
import { getActiveJourney } from '../lib/journey';
import { VERSE_OF_THE_DAY_LABEL, isDailyReflectionEntry } from '../lib/journalTags';
import type { JournalEntry, UserProgress } from '../types';

export type JournalExportModel = {
  journeyName: string | null;
  dateRange: { start: string; end: string } | null;
  exportDate: string;
  entries: JournalEntry[];
};

export function buildJournalExportModel(progress: UserProgress): JournalExportModel {
  const journey = getActiveJourney(progress);
  const entries = [...progress.journalEntries].sort((a, b) => a.date.localeCompare(b.date));
  const dates = entries.map((entry) => entry.date);

  return {
    journeyName: journey.isDefault ? null : journey.name,
    dateRange:
      dates.length > 0
        ? { start: dates[0], end: dates[dates.length - 1] }
        : null,
    exportDate: formatDisplayDate(getLocalDateString()),
    entries,
  };
}

const printFieldValue = 'print-field-value';
const PRINT_ENTRY_BODY_CLASSES = {
  fields: 'print-entry-fields',
  section: 'print-field',
  label: 'print-field-label',
  value: printFieldValue,
  empty: printFieldValue,
  mealImages: 'print-meal-images',
  mealImage: 'print-meal-image',
};

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
            <span className="print-cover-stat-value">{model.entries.length}</span>
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
          <JournalTypeBadge type={entry.type} className="print-meta-chip" />
          {isDailyReflectionEntry(entry) && entry.dayMood && (
            <MoodBadge mood={entry.dayMood} className="print-meta-chip" />
          )}
        </div>
      </header>
      <JournalEntryBody
        entry={entry}
        classes={PRINT_ENTRY_BODY_CLASSES}
        emptyMessage={null}
        renderVerseHeading={() => (
          <h3 className="print-field-label">{VERSE_OF_THE_DAY_LABEL}</h3>
        )}
      />
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

        .print-meal-images {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .print-meal-image {
          width: 120px;
          height: 120px;
          border-radius: 8px;
          border: 1px solid #e1e3d9;
          object-fit: cover;
          break-inside: avoid;
          page-break-inside: avoid;
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
      </footer>
    </div>
  );
}
