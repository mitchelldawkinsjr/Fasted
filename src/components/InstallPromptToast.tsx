import { useEffect } from 'react';
import {
  dismissInstallToast,
  isIosSafari,
  isRunningAsInstalledPwa,
  wasInstallToastDismissed,
} from '../lib/pwaInstall';
import { dismissToast, toast } from '../lib/toast';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let installToastId: string | null = null;
let deferredPrompt: BeforeInstallPromptEvent | null = null;

function dismissInstallPrompt() {
  dismissInstallToast();
  if (installToastId) {
    dismissToast(installToastId);
    installToastId = null;
  }
}

function showInstallPrompt() {
  if (installToastId || isRunningAsInstalledPwa() || wasInstallToastDismissed()) return;

  const ios = isIosSafari();
  const message = ios
    ? 'Tap Share, then Add to Home Screen for quick access and offline use.'
    : deferredPrompt
      ? 'Install on your home screen for a faster, app-like experience and offline access.'
      : 'Add Fasted Calendar from your browser menu for quick access and offline use.';

  installToastId = toast.persistent({
    title: 'Add to Home Screen',
    message,
    type: 'info',
    position: 'bottom',
    actions: [
      ...(deferredPrompt && !ios
        ? [
            {
              label: 'Install',
              variant: 'primary' as const,
              onClick: async () => {
                if (!deferredPrompt) return;
                await deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                deferredPrompt = null;
                dismissInstallPrompt();
              },
            },
          ]
        : []),
      {
        label: 'Not now',
        variant: 'secondary' as const,
        onClick: dismissInstallPrompt,
      },
    ],
  });
}

export function InstallPromptToast() {
  useEffect(() => {
    if (isRunningAsInstalledPwa() || wasInstallToastDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const timer = window.setTimeout(showInstallPrompt, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
