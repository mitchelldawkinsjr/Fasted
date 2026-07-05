import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { trackEvent } from '../lib/analytics';
import { EmptyState } from '../components/EmptyState';
import { JournalEditor } from '../components/JournalEditor';
import { JournalViewer } from '../components/JournalViewer';
import { JournalTypeBadge } from '../components/JournalTypePicker';
import { MoodBadge } from '../components/MoodPicker';
import { Icon } from '../components/Icon';
import { useProgress } from '../hooks/useProgress';
import { confirmAction } from '../lib/confirm';
import { formatDisplayDate, getDefaultJournalDate, getLocalDateString } from '../lib/dateUtils';
import {
  DEFAULT_JOURNAL_ENTRY_TYPE,
  JOURNAL_ENTRY_TYPE_LABELS,
  JOURNAL_ENTRY_TYPES,
  getJournalEntryPreview,
  getJournalEntryTitle,
  isJournalEntryType,
  isDailyReflectionEntry,
  journalEntryMatchesSearch,
  journalTypePillClass,
} from '../lib/journalTags';
import { openJournalPrintView } from '../lib/journalPrintExport';
import { messages } from '../lib/messages';
import { deleteJournalEntry } from '../lib/storage';
import { toast } from '../lib/toast';
import type { JournalEntry, JournalEntryType } from '../types';

type JournalFilter = 'all' | JournalEntryType;

const BACK_NAV_CLASS =
  'inline-flex items-center gap-1 text-body-md font-medium text-primary transition-opacity hover:opacity-80';

const FILTER_CHIPS: { id: JournalFilter; label: string }[] = [
  { id: 'all', label: 'All Reflections' },
  ...JOURNAL_ENTRY_TYPES.map((type) => ({
    id: type,
    label: JOURNAL_ENTRY_TYPE_LABELS[type],
  })),
];

function matchesFilter(entry: JournalEntry, filter: JournalFilter): boolean {
  if (filter === 'all') return true;
  return entry.type === filter;
}

function getInitialTypeFromParams(searchParams: URLSearchParams): JournalEntryType | undefined {
  const type = searchParams.get('type') ?? searchParams.get('tag');
  if (type && isJournalEntryType(type)) return type;
  return undefined;
}

function clearJournalSearchParams(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete('type');
  next.delete('tag');
  next.delete('date');
  next.delete('from');
  next.delete('moodView');
  return next;
}

export function JournalPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const progress = useProgress();
  const [search, setSearch] = useState('');
  const typeParam = searchParams.get('type') ?? searchParams.get('tag');
  const [filter, setFilter] = useState<JournalFilter>(() =>
    typeParam && isJournalEntryType(typeParam) ? typeParam : 'all',
  );
  const [viewing, setViewing] = useState<JournalEntry | null>(null);
  const [editing, setEditing] = useState<JournalEntry | 'new' | null>(null);
  const today = getLocalDateString();
  const defaultDate = getDefaultJournalDate(today);
  const initialType = useMemo(() => getInitialTypeFromParams(searchParams), [searchParams]);
  const dateParam = searchParams.get('date');
  const fromMood = searchParams.get('from') === 'mood';
  const moodView = searchParams.get('moodView');
  const moodChartReturnTo = useMemo(() => {
    if (!fromMood) return null;
    const params = new URLSearchParams();
    if (dateParam) params.set('month', dateParam.slice(0, 7));
    if (moodView === 'phase') params.set('view', 'phase');
    const query = params.toString();
    return query ? `/progress/mood?${query}` : '/progress/mood';
  }, [dateParam, fromMood, moodView]);
  const linkedEntry = useMemo(() => {
    if (!dateParam) return null;
    return progress.journalEntries.find((item) => item.date === dateParam) ?? null;
  }, [dateParam, progress.journalEntries]);
  const displayedEntry = viewing ?? linkedEntry;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return progress.journalEntries.filter((entry) => {
      if (!matchesFilter(entry, filter)) return false;
      return journalEntryMatchesSearch(entry, q);
    });
  }, [filter, progress.journalEntries, search]);

  const handleExportPdf = () => {
    if (progress.journalEntries.length === 0) {
      toast.info(messages.export.journalPdfEmpty);
      return;
    }
    if (!openJournalPrintView(navigate, '/journal')) {
      toast.warning(messages.export.journalPdfBlocked);
      return;
    }
    toast.info(messages.export.journalPdf);
  };

  const handleSaved = () => {
    setSearch('');
    setFilter('all');
    setEditing(null);
    if (searchParams.has('type') || searchParams.has('tag') || searchParams.has('date') || searchParams.has('from')) {
      setSearchParams(clearJournalSearchParams(searchParams));
    }
  };

  const openNewEntry = () => {
    const entryType =
      filter !== 'all' ? filter : initialType ?? DEFAULT_JOURNAL_ENTRY_TYPE;
    trackEvent('journal_compose_started', { entry_type: entryType, source: 'journal_page' });
    setEditing('new');
  };

  const editorInitialType =
    editing === 'new'
      ? filter !== 'all'
        ? filter
        : initialType ?? DEFAULT_JOURNAL_ENTRY_TYPE
      : undefined;

  const handleDelete = async (entry: JournalEntry) => {
    const confirmed = await confirmAction({
      ...messages.confirm.deleteJournal,
      confirmLabel: messages.confirm.deleteJournal.confirm,
      cancelLabel: messages.confirm.deleteJournal.cancel,
      variant: 'danger',
    });
    if (!confirmed) return;
    deleteJournalEntry(entry.id);
    setViewing(null);
    if (searchParams.has('date') || searchParams.has('from')) {
      setSearchParams(clearJournalSearchParams(searchParams));
    }
    toast.info(messages.save.journalDeleted);
  };

  const applyFilter = (nextFilter: JournalFilter) => {
    setFilter(nextFilter);
    if (nextFilter !== 'all') {
      trackEvent('journal_type_filtered', { entry_type: nextFilter, source: 'journal_page' });
    }
    const next = clearJournalSearchParams(searchParams);
    if (nextFilter !== 'all') {
      next.set('type', nextFilter);
    }
    setSearchParams(next);
  };

  const applyTypeFilter = (type: JournalEntryType) => {
    setViewing(null);
    applyFilter(type);
  };

  const closeDetailView = () => {
    setViewing(null);
    if (
      searchParams.has('type') ||
      searchParams.has('tag') ||
      searchParams.has('date') ||
      searchParams.has('from')
    ) {
      setSearchParams(clearJournalSearchParams(searchParams));
    }
  };

  if (displayedEntry) {
    return (
      <div className="animate-fade-in-up">
        {moodChartReturnTo ? (
          <Link
            to={moodChartReturnTo}
            className={`mb-stack-md ${BACK_NAV_CLASS}`}
            aria-label="Go back"
          >
            <Icon name="arrow_back" size={20} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={closeDetailView}
            className={`mb-stack-md ${BACK_NAV_CLASS}`}
            aria-label="Go back"
          >
            <Icon name="arrow_back" size={20} />
          </button>
        )}
        <h2 className="mb-stack-md font-display text-headline-lg-mobile text-primary">
          Reflection
        </h2>
        <JournalViewer
          entry={displayedEntry}
          onBack={closeDetailView}
          onEdit={() => {
            setEditing(displayedEntry);
            setViewing(null);
          }}
          onDelete={() => void handleDelete(displayedEntry)}
          onTypeClick={applyTypeFilter}
        />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex h-[calc(100dvh-72px-4.75rem-env(safe-area-inset-bottom))] flex-col animate-fade-in-up">
        <h2 className="mb-stack-md shrink-0 font-display text-headline-lg-mobile text-primary">
          {editing === 'new' ? 'New Reflection' : 'Edit Entry'}
        </h2>
        <JournalEditor
          key={editing === 'new' ? `new-${editorInitialType}` : editing.id}
          entry={editing === 'new' ? undefined : editing}
          defaultDate={defaultDate}
          initialType={editorInitialType}
          onSave={handleSaved}
          onCancel={() => {
            setEditing(null);
            if (
              searchParams.has('type') ||
              searchParams.has('tag') ||
              searchParams.has('date') ||
              searchParams.has('from')
            ) {
              setSearchParams(clearJournalSearchParams(searchParams));
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      <Link
        to="/calendar"
        className={BACK_NAV_CLASS}
        aria-label="Go back"
      >
        <Icon name="arrow_back" size={20} />
      </Link>

      <header className="flex items-center justify-between gap-3">
        <p className="text-body-md text-on-surface-variant">
          {progress.journalEntries.length} reflections
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={progress.journalEntries.length === 0}
            className="rounded-full p-2 text-primary transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Export journal as PDF"
            title={
              progress.journalEntries.length === 0
                ? messages.export.journalPdfEmpty
                : 'Export journal as PDF'
            }
          >
            <Icon name="picture_as_pdf" />
          </button>
          <button
            type="button"
            onClick={openNewEntry}
            className="btn-stitch-primary !px-4 !py-2 text-body-md"
          >
            + New
          </button>
        </div>
      </header>

      <div className="relative">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search past entries..."
          className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3 pl-12 pr-4 text-body-md grace-shadow focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          aria-label="Search journal entries"
        />
      </div>

      <section className="grid grid-cols-2 gap-2">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => applyFilter(chip.id)}
            className={journalTypePillClass(filter === chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </section>

      {filtered.length === 0 && progress.journalEntries.length === 0 && (
        <EmptyState
          icon="auto_stories"
          title={messages.empty.journal.title}
          description={messages.empty.journal.description}
          action={{
            label: messages.empty.journal.action,
            onClick: openNewEntry,
          }}
        />
      )}

      {filtered.length === 0 && progress.journalEntries.length > 0 && (
        <EmptyState
          icon="search_off"
          title={messages.empty.journalSearch.title}
          description={messages.empty.journalSearch.description}
          action={{
            label: messages.empty.journalSearch.action,
            onClick: () => {
              setSearch('');
              setFilter('all');
              if (searchParams.has('type') || searchParams.has('tag') || searchParams.has('date')) {
                setSearchParams(clearJournalSearchParams(searchParams));
              }
            },
          }}
        />
      )}

      {filtered.length > 0 && (
        <ul className="space-y-stack-md">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <article className="stitch-card min-w-0 overflow-hidden border-l-4 border-secondary p-6 transition-transform active:scale-[0.98]">
                <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
                  <span className="min-w-0 label-caps text-on-surface-variant">
                    {formatDisplayDate(entry.date)}
                  </span>
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(entry)}
                      className="text-label-caps text-secondary underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(entry)}
                      className="text-label-caps text-error underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <JournalTypeBadge type={entry.type} onClick={applyTypeFilter} />
                  {isDailyReflectionEntry(entry) && entry.dayMood && (
                    <MoodBadge mood={entry.dayMood} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setViewing(entry)}
                  className="w-full min-w-0 text-left"
                  aria-label={`View reflection from ${formatDisplayDate(entry.date)}`}
                >
                  <h2 className="text-wrap-anywhere mb-2 font-display text-headline-md text-primary">
                    {getJournalEntryTitle(entry)}
                  </h2>
                  <p className="text-wrap-anywhere line-clamp-3 text-body-md leading-relaxed text-on-surface-variant">
                    {getJournalEntryPreview(entry)}
                  </p>
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
