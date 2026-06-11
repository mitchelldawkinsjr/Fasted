import { useState } from 'react';
import { CloudSyncSection } from '../components/CloudSyncSection';
import { SafetyNote } from '../components/SafetyNote';
import { Icon } from '../components/Icon';
import { useProgress } from '../hooks/useProgress';
import {
  exportJournal,
  exportJournalMarkdown,
  importJournalBackup,
  resetProgress,
  saveSettings,
} from '../lib/storage';

export function SettingsPage() {
  const progress = useProgress();
  const [reminderTime, setReminderTime] = useState(progress.settings.reminderTime);
  const [theme, setTheme] = useState(progress.settings.theme);
  const [importStatus, setImportStatus] = useState('');

  const handleSaveSettings = () => {
    saveSettings({ reminderTime, theme });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importJournalBackup(reader.result as string);
        setImportStatus('Journal imported successfully.');
      } catch {
        setImportStatus('Import failed. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      <section className="stitch-card overflow-hidden">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h3 className="label-caps text-secondary">PREFERENCES</h3>
        </div>
        <div className="divide-y divide-surface-variant p-gutter space-y-4">
          <label className="block">
            <span className="mb-1 block text-body-md text-on-surface">Reminder time</span>
            <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className={inputClass} />
            <p className="mt-1 text-label-caps text-on-surface-variant">Saved for future notification support.</p>
          </label>

          <label className="block">
            <span className="mb-1 block text-body-md text-on-surface">Theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')} className={inputClass}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>

          <button type="button" onClick={handleSaveSettings} className="btn-stitch-primary w-full">
            Save Preferences
          </button>
        </div>
      </section>

      <section className="stitch-card overflow-hidden">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h3 className="label-caps text-secondary">JOURNAL BACKUP</h3>
        </div>
        <div className="divide-y divide-surface-variant">
          <button
            type="button"
            onClick={() => download(exportJournal(), 'fasted-journal.json', 'application/json')}
            className="group flex w-full items-center justify-between p-gutter transition-colors hover:bg-surface-container"
          >
            <div className="flex items-center gap-4">
              <Icon name="download" className="text-on-surface-variant group-hover:text-primary" />
              <span className="text-body-md text-on-surface">Export as JSON</span>
            </div>
            <Icon name="chevron_right" className="text-outline-variant" />
          </button>
          <button
            type="button"
            onClick={() => download(exportJournalMarkdown(), 'fasted-journal.md', 'text/markdown')}
            className="group flex w-full items-center justify-between p-gutter transition-colors hover:bg-surface-container"
          >
            <div className="flex items-center gap-4">
              <Icon name="description" className="text-on-surface-variant group-hover:text-primary" />
              <span className="text-body-md text-on-surface">Export as Markdown</span>
            </div>
            <Icon name="chevron_right" className="text-outline-variant" />
          </button>
          <label className="group flex w-full cursor-pointer items-center justify-between p-gutter transition-colors hover:bg-surface-container">
            <div className="flex items-center gap-4">
              <Icon name="upload" className="text-on-surface-variant group-hover:text-primary" />
              <span className="text-body-md text-on-surface">Import Backup</span>
            </div>
            <Icon name="chevron_right" className="text-outline-variant" />
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
        {importStatus && <p className="p-gutter text-body-md text-on-surface-variant">{importStatus}</p>}
      </section>

      <CloudSyncSection />

      <section className="stitch-card overflow-hidden border-l-4 border-error">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h3 className="label-caps text-error">DANGER ZONE</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('Reset all check-ins, badges, and progress? Journal entries will also be cleared.')) {
              resetProgress();
            }
          }}
          className="flex w-full items-center gap-4 p-gutter text-body-md text-error transition-colors hover:bg-error-container/30"
        >
          <Icon name="delete_forever" />
          Reset All Progress
        </button>
      </section>

      <section className="stitch-card p-gutter">
        <h3 className="mb-2 font-display text-headline-md text-primary">Scripture Note</h3>
        <p className="text-body-md text-on-surface-variant">{progress.settings.scriptureNote}</p>
      </section>

      <SafetyNote />
    </div>
  );
}
