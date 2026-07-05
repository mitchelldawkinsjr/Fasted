import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import {
  dismissInstallToast,
  isIosSafari,
  isRunningAsInstalledPwa,
  wasInstallToastDismissed,
} from '../lib/pwaInstall';
import { dismissToast, toast } from '../lib/toast';
import { useTour } from './Tour/TourContext';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DEFAULT_DELAY_MS = 2000;
const POST_TOUR_DELAY_MS = 800;

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
      : 'Add Fasted from your browser menu for quick access and offline use.';

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
  const { active: tourActive } = useTour();
  const { hasSeenTour } = useProgress();
  const { pathname } = useLocation();
  const tourWasActive = useRef(false);

  useEffect(() => {
    if (tourActive) tourWasActive.current = true;
  }, [tourActive]);

  useEffect(() => {
    if (isRunningAsInstalledPwa() || wasInstallToastDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (isRunningAsInstalledPwa() || wasInstallToastDismissed()) return;
    if (tourActive) return;

    const tourWillAutoStart = !hasSeenTour && pathname === '/';
    if (tourWillAutoStart && !tourWasActive.current) return;

    const delay = tourWasActive.current ? POST_TOUR_DELAY_MS : DEFAULT_DELAY_MS;
    const timer = window.setTimeout(showInstallPrompt, delay);

    return () => window.clearTimeout(timer);
  }, [tourActive, hasSeenTour, pathname]);

  return null;
}
