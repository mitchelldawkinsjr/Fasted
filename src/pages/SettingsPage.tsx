import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CloudSyncSection } from '../components/CloudSyncSection';
import { GroupsSettingsSection } from '../components/GroupsSettingsSection';
import { JourneySettingsSection } from '../components/JourneySettingsSection';
import { LoadingButton } from '../components/LoadingButton';
import { ProfileHeader } from '../components/ProfileHeader';
import { SafetyNote } from '../components/SafetyNote';
import { Icon } from '../components/Icon';
import { useProgress } from '../hooks/useProgress';
import { confirmAction } from '../lib/confirm';
import { formatError, messages } from '../lib/messages';
import {
  exportJournal,
  exportJournalMarkdown,
  importJournalBackup,
  resetProgress,
  saveSettings,
} from '../lib/storage';
import { toast } from '../lib/toast';
import { setAuthReturnPath } from '../lib/authReturnPath';

type SettingsLocationState = {
  from?: string;
  message?: string;
};

export function SettingsPage() {
  const location = useLocation();
  const authPromptHandled = useRef(false);
  const progress = useProgress();
  const [theme, setTheme] = useState(progress.settings.theme);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (authPromptHandled.current) return;

    const state = location.state as SettingsLocationState | null;
    if (!state?.from && !state?.message && location.hash !== '#account-sign-in') return;

    authPromptHandled.current = true;

    if (state?.from) {
      setAuthReturnPath(state.from);
    }
    if (state?.message) {
      toast.info(state.message);
    }

    requestAnimationFrame(() => {
      document.getElementById('account-sign-in')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.hash, location.key, location.state]);

  const handleSaveSettings = async () => {
    setSavingPrefs(true);
    try {
      saveSettings({ theme });
      toast.success(messages.save.preferences);
    } catch (err) {
      toast.error(formatError(err, messages.errors.savePreferences));
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importJournalBackup(reader.result as string);
        toast.success(messages.import.journalSuccess);
      } catch {
        toast.error(messages.import.journalInvalid);
      }
    };
    reader.onerror = () => {
      toast.error(messages.import.fileReadError);
    };
    reader.readAsText(file);
    e.target.value = '';
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

  const handleReset = async () => {
    const confirmed = await confirmAction({
      ...messages.confirm.resetProgress,
      confirmLabel: messages.confirm.resetProgress.confirm,
      cancelLabel: messages.confirm.resetProgress.cancel,
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      resetProgress();
      toast.warning(messages.progress.reset);
    } catch (err) {
      toast.error(formatError(err, messages.progress.resetFailed));
    }
  };

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      <ProfileHeader />

      <section className="stitch-card overflow-hidden">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h2 className="label-caps text-secondary">PREFERENCES</h2>
        </div>
        <div className="divide-y divide-surface-variant p-gutter space-y-4">
          <label className="block">
            <span className="mb-1 block text-body-md text-on-surface">Theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')} className={inputClass}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>

          <LoadingButton
            type="button"
            onClick={() => void handleSaveSettings()}
            loading={savingPrefs}
            loadingLabel="Saving…"
            className="w-full"
          >
            Save Preferences
          </LoadingButton>
        </div>
      </section>

      <section className="stitch-card overflow-hidden">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h2 className="label-caps text-secondary">JOURNAL BACKUP</h2>
        </div>
        <div className="divide-y divide-surface-variant">
          <button
            type="button"
            onClick={() => {
              download(exportJournal(), 'fasted-journal.json', 'application/json');
              toast.info(messages.export.journalJson);
            }}
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
            onClick={() => {
              download(exportJournalMarkdown(), 'fasted-journal.md', 'text/markdown');
              toast.info(messages.export.journalMarkdown);
            }}
            className="group flex w-full items-center justify-between p-gutter transition-colors hover:bg-surface-container"
          >
            <div className="flex items-center gap-4">
              <Icon name="description" className="text-on-surface-variant group-hover:text-primary" />
              <span className="text-body-md text-on-surface">Export as Markdown</span>
            </div>
            <Icon name="chevron_right" className="text-outline-variant" />
          </button>
          <button
            type="button"
            disabled={progress.journalEntries.length === 0}
            onClick={() => {
              const printWindow = window.open('/journal/print', '_blank', 'noopener,noreferrer');
              if (!printWindow) {
                toast.warning(messages.export.journalPdfBlocked);
                return;
              }
              toast.info(messages.export.journalPdf);
            }}
            className="group flex w-full items-center justify-between p-gutter transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
          >
            <div className="flex items-center gap-4">
              <Icon name="picture_as_pdf" className="text-on-surface-variant group-hover:text-primary" />
              <span className="text-body-md text-on-surface">Export journal (PDF)</span>
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
      </section>

      <JourneySettingsSection />

      <CloudSyncSection />

      <GroupsSettingsSection />

      <section className="stitch-card overflow-hidden border-l-4 border-error">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h2 className="label-caps text-error">DANGER ZONE</h2>
        </div>
        <button
          type="button"
          onClick={() => void handleReset()}
          className="flex w-full items-center gap-4 p-gutter text-body-md text-error transition-colors hover:bg-error-container/30"
        >
          <Icon name="delete_forever" />
          Reset All Progress
        </button>
      </section>

      <section className="stitch-card min-w-0 overflow-hidden p-gutter">
        <h2 className="mb-2 font-display text-headline-md text-primary">Scripture Note</h2>
        <p className="text-wrap-anywhere text-body-md text-on-surface-variant">
          {progress.settings.scriptureNote}
        </p>
      </section>

      <SafetyNote />
    </div>
  );
}
