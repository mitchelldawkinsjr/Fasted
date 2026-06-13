import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { JournalEditor } from '../components/JournalEditor';
import { JournalTagBadges } from '../components/JournalTagPicker';
import { Icon } from '../components/Icon';
import { useProgress } from '../hooks/useProgress';
import { confirmAction } from '../lib/confirm';
import { formatDisplayDate, getDefaultJournalDate, getLocalDateString } from '../lib/dateUtils';
import {
  JOURNAL_TAG_LABELS,
  JOURNAL_TAGS,
  isJournalTag,
} from '../lib/journalTags';
import { messages } from '../lib/messages';
import { deleteJournalEntry, exportJournalMarkdown } from '../lib/storage';
import { toast } from '../lib/toast';
import type { JournalEntry, JournalTag } from '../types';

type JournalFilter = 'all' | JournalTag;

const FILTER_CHIPS: { id: JournalFilter; label: string }[] = [
  { id: 'all', label: 'All Reflections' },
  ...JOURNAL_TAGS.map((tag) => ({ id: tag, label: JOURNAL_TAG_LABELS[tag] })),
];

function getEntryPreview(entry: JournalEntry): string {
  return (
    entry.victory ||
    entry.prayerFocus ||
    entry.prayedAbout ||
    entry.godTeaching ||
    entry.hungerNotes ||
    entry.tomorrowIntention ||
    'Reflection saved'
  );
}

function matchesFilter(entry: JournalEntry, filter: JournalFilter): boolean {
  if (filter === 'all') return true;
  return entry.tags.includes(filter);
}

function getInitialTagsFromParams(searchParams: URLSearchParams): JournalTag[] {
  const tag = searchParams.get('tag');
  if (tag && isJournalTag(tag)) return [tag];
  return [];
}

export function JournalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const progress = useProgress();
  const [search, setSearch] = useState('');
  const tagParam = searchParams.get('tag');
  const [filter, setFilter] = useState<JournalFilter>(() =>
    tagParam && isJournalTag(tagParam) ? tagParam : 'all',
  );
  const [editing, setEditing] = useState<JournalEntry | 'new' | null>(null);
  const today = getLocalDateString();
  const defaultDate = getDefaultJournalDate(today);
  const initialTags = useMemo(() => getInitialTagsFromParams(searchParams), [searchParams]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return progress.journalEntries.filter((entry) => {
      if (!matchesFilter(entry, filter)) return false;
      if (!q) return true;
      return (
        entry.date.includes(q) ||
        entry.tags.some((tag) => JOURNAL_TAG_LABELS[tag].toLowerCase().includes(q)) ||
        entry.prayerFocus.toLowerCase().includes(q) ||
        entry.prayedAbout.toLowerCase().includes(q) ||
        entry.godTeaching.toLowerCase().includes(q) ||
        entry.victory.toLowerCase().includes(q) ||
        entry.hungerNotes.toLowerCase().includes(q) ||
        entry.tomorrowIntention.toLowerCase().includes(q)
      );
    });
  }, [filter, progress.journalEntries, search]);

  const downloadMarkdown = () => {
    const blob = new Blob([exportJournalMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fasted-journal.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.info(messages.export.journalMarkdown);
  };

  const handleSaved = () => {
    setSearch('');
    setFilter('all');
    setEditing(null);
    if (searchParams.has('tag')) {
      setSearchParams({});
    }
  };

  const openNewEntry = () => {
    setEditing('new');
  };

  const editorInitialTags =
    editing === 'new' ? (filter !== 'all' ? [filter] : initialTags) : undefined;

  const handleDelete = async (entry: JournalEntry) => {
    const confirmed = await confirmAction({
      ...messages.confirm.deleteJournal,
      confirmLabel: messages.confirm.deleteJournal.confirm,
      cancelLabel: messages.confirm.deleteJournal.cancel,
      variant: 'danger',
    });
    if (!confirmed) return;
    deleteJournalEntry(entry.id);
    toast.info(messages.save.journalDeleted);
  };

  if (editing) {
    return (
      <div className="animate-fade-in-up">
        <h2 className="mb-stack-md font-display text-headline-lg-mobile text-primary">
          {editing === 'new' ? 'New Reflection' : 'Edit Entry'}
        </h2>
        <JournalEditor
          entry={editing === 'new' ? undefined : editing}
          defaultDate={defaultDate}
          initialTags={editorInitialTags}
          onSave={handleSaved}
          onCancel={() => {
            setEditing(null);
            if (searchParams.has('tag')) setSearchParams({});
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      <header className="flex items-center justify-between gap-3">
        <p className="text-body-md text-on-surface-variant">
          {progress.journalEntries.length} reflections
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadMarkdown}
            className="rounded-full p-2 text-primary transition hover:bg-surface-container-high"
            aria-label="Export as Markdown"
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

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`w-full rounded-full px-2 py-1.5 text-center label-caps leading-tight transition-colors sm:px-3 ${
              filter === chip.id
                ? 'bg-primary text-on-primary grace-shadow'
                : 'border border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
            }`}
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
              if (searchParams.has('tag')) setSearchParams({});
            },
          }}
        />
      )}

      {filtered.length > 0 && (
        <ul className="space-y-stack-md">
          {filtered.map((entry) => (
            <li
              key={entry.id}
              className="stitch-card border-l-4 border-secondary p-6 transition-transform active:scale-[0.98]"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="label-caps text-on-surface-variant">
                  {formatDisplayDate(entry.date)}
                </span>
                <div className="flex gap-3">
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
              {entry.prayerFocus ? (
                <h3 className="mb-2 font-display text-headline-md text-primary">
                  {entry.prayerFocus}
                </h3>
              ) : (
                <h3 className="mb-2 font-display text-headline-md text-primary">Reflection</h3>
              )}
              <p className="line-clamp-3 text-body-md leading-relaxed text-on-surface-variant">
                {getEntryPreview(entry)}
              </p>
              <JournalTagBadges tags={entry.tags} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
