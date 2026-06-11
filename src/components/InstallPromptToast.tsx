import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import {
  dismissInstallToast,
  isIosSafari,
  isRunningAsInstalledPwa,
  wasInstallToastDismissed,
} from '../lib/pwaInstall';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallPromptToast() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const ios = isIosSafari();

  useEffect(() => {
    if (isRunningAsInstalledPwa() || wasInstallToastDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const timer = window.setTimeout(() => {
      if (!isRunningAsInstalledPwa() && !wasInstallToastDismissed()) {
        setVisible(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    dismissInstallToast();
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    handleDismiss();
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-[7.5rem] left-4 right-4 z-[55] mx-auto max-w-lg animate-fade-in-up"
      role="status"
      aria-live="polite"
      aria-label="Add to home screen"
    >
      <div className="stitch-card border-l-4 border-secondary p-4 shadow-grace-up">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-primary">
            <Icon name="install_mobile" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-display text-headline-md text-primary">Add to Home Screen</p>
            {ios ? (
              <p className="mt-1 text-body-md leading-relaxed text-on-surface-variant">
                Install Fasted Calendar for quick access and offline use. Tap{' '}
                <Icon name="ios_share" className="align-middle text-base" /> Share, then{' '}
                <strong>Add to Home Screen</strong>.
              </p>
            ) : deferredPrompt ? (
              <p className="mt-1 text-body-md leading-relaxed text-on-surface-variant">
                Install this app on your home screen for a faster, app-like experience and offline
                access.
              </p>
            ) : (
              <p className="mt-1 text-body-md leading-relaxed text-on-surface-variant">
                Add Fasted Calendar to your home screen from your browser menu for quick access and
                offline use.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {deferredPrompt && !ios && (
                <button type="button" onClick={handleInstall} className="btn-stitch-primary !px-4 !py-2 text-body-md">
                  Install
                </button>
              )}
              <button type="button" onClick={handleDismiss} className="btn-stitch-secondary !px-4 !py-2 text-body-md">
                Not now
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 text-outline transition hover:text-primary"
            aria-label="Dismiss"
          >
            <Icon name="close" />
          </button>
        </div>
      </div>
    </div>
  );
}
