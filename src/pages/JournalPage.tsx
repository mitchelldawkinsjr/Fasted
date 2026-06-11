import { useMemo, useState } from 'react';
import { JournalEditor } from '../components/JournalEditor';
import { Icon } from '../components/Icon';
import { useProgress } from '../hooks/useProgress';
import { deleteJournalEntry, exportJournalMarkdown } from '../lib/storage';
import { getLocalDateString } from '../lib/dateUtils';
import type { JournalEntry } from '../types';

export function JournalPage() {
  const progress = useProgress();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<JournalEntry | 'new' | null>(null);
  const today = getLocalDateString();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return progress.journalEntries;
    return progress.journalEntries.filter(
      (e) =>
        e.date.includes(q) ||
        e.prayerFocus.toLowerCase().includes(q) ||
        e.prayedAbout.toLowerCase().includes(q) ||
        e.godTeaching.toLowerCase().includes(q) ||
        e.victory.toLowerCase().includes(q),
    );
  }, [progress.journalEntries, search]);

  const downloadMarkdown = () => {
    const blob = new Blob([exportJournalMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fasted-journal.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (editing) {
    return (
      <div className="animate-fade-in-up">
        <h2 className="mb-stack-md font-display text-headline-lg-mobile text-primary">
          {editing === 'new' ? 'New Reflection' : 'Edit Entry'}
        </h2>
        <JournalEditor
          entry={editing === 'new' ? undefined : editing}
          defaultDate={today}
          onSave={() => setEditing(null)}
          onCancel={() => setEditing(null)}
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
          <button type="button" onClick={() => setEditing('new')} className="btn-stitch-primary !px-4 !py-2 text-body-md">
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

      <section className="scroll-hide flex gap-stack-sm overflow-x-auto pb-2">
        {['All Reflections', 'Prayer', 'Gratitude', 'Victory'].map((chip, i) => (
          <button
            key={chip}
            type="button"
            className={`shrink-0 rounded-full px-4 py-1.5 label-caps transition-colors ${
              i === 0
                ? 'bg-primary text-on-primary grace-shadow'
                : 'border border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {chip}
          </button>
        ))}
      </section>

      {filtered.length === 0 ? (
        <p className="stitch-card p-stack-lg text-center text-body-md text-on-surface-variant">
          No journal entries yet. Start writing about what God is teaching you.
        </p>
      ) : (
        <ul className="space-y-stack-md">
          {filtered.map((entry) => (
            <li
              key={entry.id}
              className="stitch-card cursor-pointer border-l-4 border-secondary p-6 transition-transform active:scale-[0.98]"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="label-caps text-on-surface-variant">{entry.date}</span>
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
                    onClick={() => {
                      if (confirm('Delete this entry?')) deleteJournalEntry(entry.id);
                    }}
                    className="text-label-caps text-error underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {entry.prayerFocus && (
                <h3 className="mb-2 font-display text-headline-md text-primary">
                  {entry.prayerFocus}
                </h3>
              )}
              {entry.victory && (
                <p className="line-clamp-2 text-body-md leading-relaxed text-on-surface-variant">
                  {entry.victory}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
