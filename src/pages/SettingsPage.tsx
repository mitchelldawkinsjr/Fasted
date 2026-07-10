import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CloudSyncSection } from '../components/CloudSyncSection';
import { GroupsSettingsSection } from '../components/GroupsSettingsSection';
import { JourneySettingsSection } from '../components/JourneySettingsSection';
import { LoadingButton } from '../components/LoadingButton';
import { ProfileHeader } from '../components/ProfileHeader';
import { ReminderPreviewBanner } from '../components/ReminderPreviewBanner';
import { SafetyNote } from '../components/SafetyNote';
import { Icon } from '../components/Icon';
import { useTour } from '../components/Tour/TourContext';
import { useProgress } from '../hooks/useProgress';
import { confirmAction } from '../lib/confirm';
import { openJournalPrintView } from '../lib/journalPrintExport';
import { formatError, messages } from '../lib/messages';
import {
  disablePushNotifications,
  enablePushNotifications,
  EVENING_REMINDER_TIME,
  getPushSupport,
  isValidReminderTime,
  syncPushSubscriptionIfNeeded,
} from '../lib/push';
import type { ReminderKind } from '../lib/pushReminders';
import {
  exportJournal,
  exportJournalMarkdown,
  importJournalBackup,
  resetProgress,
  saveSettings,
} from '../lib/storage';
import { useAuth } from '../hooks/useAuth';
import { deleteAccountData } from '../lib/sync';
import { toast } from '../lib/toast';
import { setAuthReturnPath } from '../lib/authReturnPath';

type SettingsLocationState = {
  from?: string;
  message?: string;
};

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authPromptHandled = useRef(false);
  const progress = useProgress();
  const { startTour } = useTour();
  const { isLoggedIn: signedIn } = useAuth();
  const [theme, setTheme] = useState(progress.settings.theme);
  const [reminderTime, setReminderTime] = useState(progress.settings.reminderTime || '07:00');
  const [pushEnabled, setPushEnabled] = useState(Boolean(progress.settings.pushEnabled));
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [updatingPush, setUpdatingPush] = useState(false);
  const [previewKind, setPreviewKind] = useState<ReminderKind | null>(null);
  const pushSupport = getPushSupport();
  const isDev = import.meta.env.DEV;

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

  useEffect(() => {
    setTheme(progress.settings.theme);
    setReminderTime(progress.settings.reminderTime || '07:00');
    setPushEnabled(Boolean(progress.settings.pushEnabled));
  }, [progress.settings.theme, progress.settings.reminderTime, progress.settings.pushEnabled]);

  useEffect(() => {
    if (!signedIn || !pushEnabled) return;
    void syncPushSubscriptionIfNeeded(true).catch(() => {
      /* best-effort resync of endpoint / timezone */
    });
  }, [signedIn, pushEnabled]);

  const handleSaveSettings = async () => {
    if (!isValidReminderTime(reminderTime)) {
      toast.error('Choose a valid morning reminder time.');
      return;
    }
    setSavingPrefs(true);
    try {
      saveSettings({ theme, reminderTime, pushEnabled });
      if (pushEnabled && signedIn) {
        await syncPushSubscriptionIfNeeded(true);
      }
      toast.success(messages.save.preferences);
    } catch (err) {
      toast.error(formatError(err, messages.errors.savePreferences));
    } finally {
      setSavingPrefs(false);
    }
  };

  const handlePushToggle = async (next: boolean) => {
    if (next) {
      if (!signedIn) {
        toast.info(messages.push.signInRequired);
        return;
      }
      if (!pushSupport.ok) {
        toast.error(
          pushSupport.reason === 'unsupported'
            ? messages.push.unsupported
            : pushSupport.reason === 'insecure-context'
              ? messages.push.insecure
              : messages.push.notConfigured,
        );
        return;
      }
      setUpdatingPush(true);
      try {
        await enablePushNotifications();
        setPushEnabled(true);
        saveSettings({ pushEnabled: true, reminderTime });
        toast.success(messages.push.enabled);
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message.includes('permission')) {
          toast.error(messages.push.permissionDenied);
        } else {
          toast.error(formatError(err, messages.push.saveFailed));
        }
        setPushEnabled(false);
      } finally {
        setUpdatingPush(false);
      }
      return;
    }

    setUpdatingPush(true);
    try {
      await disablePushNotifications();
      setPushEnabled(false);
      saveSettings({ pushEnabled: false });
      toast.info(messages.push.disabled);
    } catch (err) {
      toast.error(formatError(err, messages.push.saveFailed));
    } finally {
      setUpdatingPush(false);
    }
  };

  const showReminderPreview = (kind: ReminderKind) => {
    setPreviewKind(kind);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          await importJournalBackup(reader.result as string);
          toast.success(messages.import.journalSuccess);
        } catch {
          toast.error(messages.import.journalInvalid);
        }
      })();
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

  const handleDeleteAccountData = async () => {
    const confirmed = await confirmAction({
      ...messages.confirm.deleteAccountData,
      confirmLabel: messages.confirm.deleteAccountData.confirm,
      cancelLabel: messages.confirm.deleteAccountData.cancel,
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteAccountData();
      toast.warning('Account data deleted on this device and in the cloud.');
    } catch (err) {
      toast.error(formatError(err, messages.errors.generic));
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

          <div className="space-y-3 pt-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-body-md text-on-surface">Daily reminders</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Morning nudge at your chosen time; evening at {EVENING_REMINDER_TIME} if you still
                  haven’t checked in or reflected. Skipped once today’s check-in is done.
                </p>
              </div>
              <label className="inline-flex shrink-0 items-center gap-2 pt-0.5">
                <span className="sr-only">Enable daily reminders</span>
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  disabled={updatingPush}
                  onChange={(e) => void handlePushToggle(e.target.checked)}
                  className="h-5 w-5 rounded border-outline-variant text-secondary focus:ring-secondary"
                />
              </label>
            </div>

            {pushEnabled && (
              <label className="block">
                <span className="mb-1 block text-body-md text-on-surface">Morning reminder</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className={inputClass}
                />
                <span className="mt-1 block text-body-sm text-on-surface-variant">
                  Evening reminder is fixed at 8:00 PM. On iPhone, install Fasted to your Home Screen
                  for Web Push to work.
                </span>
              </label>
            )}

            {!signedIn && (
              <p className="text-body-sm text-on-surface-variant">{messages.push.signInRequired}</p>
            )}

            {isDev && (
              <div className="space-y-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-low/60 p-3">
                <p className="text-body-sm text-on-surface-variant">
                  Dev only — preview reminder copy in-app (no OS banner required).
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => showReminderPreview('morning')}
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface transition hover:bg-surface-container"
                  >
                    Preview morning
                  </button>
                  <button
                    type="button"
                    onClick={() => showReminderPreview('evening')}
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface transition hover:bg-surface-container"
                  >
                    Preview evening
                  </button>
                </div>
                {previewKind && (
                  <ReminderPreviewBanner
                    kind={previewKind}
                    onDismiss={() => setPreviewKind(null)}
                  />
                )}
              </div>
            )}
          </div>

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
              void (async () => {
                try {
                  const json = await exportJournal();
                  download(json, 'fasted-journal.json', 'application/json');
                  toast.info(messages.export.journalJson);
                } catch (err) {
                  toast.error(formatError(err, messages.errors.generic));
                }
              })();
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
              if (!openJournalPrintView(navigate, '/settings')) {
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

      <section className="stitch-card overflow-hidden">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h2 className="label-caps text-secondary">APP TOUR</h2>
        </div>
        <button
          type="button"
          onClick={startTour}
          className="flex w-full items-center gap-4 p-gutter text-body-md transition-colors hover:bg-surface-variant"
        >
          <Icon name="tour" />
          Replay App Tour
        </button>
      </section>

      <section className="stitch-card min-w-0 overflow-hidden p-gutter">
        <h2 className="mb-2 font-display text-headline-md text-primary">Privacy & data</h2>
        <p className="text-wrap-anywhere text-body-md text-on-surface-variant">
          Journals, check-ins, and meal photos are stored on this device (browser storage and
          IndexedDB). When you sign in, progress syncs to your account and meal photos upload to
          private cloud storage. Use Export to download a portable copy. Reset clears this device
          only; Delete account data also removes cloud progress and photos for the signed-in user.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-body-md">
          <Link to="/privacy" className="text-secondary underline underline-offset-2">
            Privacy Policy
          </Link>
          <Link to="/data-deletion" className="text-secondary underline underline-offset-2">
            Data Deletion Instructions
          </Link>
        </div>
      </section>

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
        {signedIn && (
          <button
            type="button"
            onClick={() => void handleDeleteAccountData()}
            className="flex w-full items-center gap-4 border-t border-surface-variant p-gutter text-body-md text-error transition-colors hover:bg-error-container/30"
          >
            <Icon name="person_off" />
            Delete Account Data
          </button>
        )}
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
