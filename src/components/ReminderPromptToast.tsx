import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import {
  dismissReminderPrompt,
  isRunningAsInstalledPwa,
  wasInstallToastDismissed,
  wasReminderPromptDismissed,
} from '../lib/pwaInstall';
import { messages } from '../lib/messages';
import { dismissToast, toast } from '../lib/toast';
import { useTour } from './Tour/TourContext';

const DEFAULT_DELAY_MS = 2500;
const POST_TOUR_DELAY_MS = 1000;

let reminderToastId: string | null = null;

function clearReminderToast() {
  if (reminderToastId) {
    dismissToast(reminderToastId);
    reminderToastId = null;
  }
}

function dismissAndClear() {
  dismissReminderPrompt();
  clearReminderToast();
}

function canShowReminderPrompt(pushEnabled: boolean, signedIn: boolean): boolean {
  if (!signedIn || pushEnabled) return false;
  if (wasReminderPromptDismissed()) return false;
  if (!isRunningAsInstalledPwa() && !wasInstallToastDismissed()) return false;
  return true;
}

/** One-time discovery toast pointing signed-in users to Daily reminders in Settings. */
export function ReminderPromptToast() {
  const { active: tourActive } = useTour();
  const { hasSeenTour, settings } = useProgress();
  const { isLoggedIn: signedIn } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tourWasActive = useRef(false);
  const pushEnabled = Boolean(settings.pushEnabled);

  useEffect(() => {
    if (tourActive) tourWasActive.current = true;
  }, [tourActive]);

  useEffect(() => {
    if (pushEnabled) {
      dismissReminderPrompt();
      clearReminderToast();
    }
  }, [pushEnabled]);

  useEffect(() => {
    if (!canShowReminderPrompt(pushEnabled, signedIn)) return;
    if (tourActive) return;
    if (pathname.startsWith('/settings')) return;

    const tourWillAutoStart = !hasSeenTour && pathname === '/';
    if (tourWillAutoStart && !tourWasActive.current) return;

    const delay = tourWasActive.current ? POST_TOUR_DELAY_MS : DEFAULT_DELAY_MS;
    const timer = window.setTimeout(() => {
      if (!canShowReminderPrompt(pushEnabled, signedIn) || reminderToastId) return;
      reminderToastId = toast.persistent({
        title: messages.push.discoverTitle,
        message: messages.push.discoverBody,
        type: 'info',
        position: 'bottom',
        actions: [
          {
            label: 'Open Settings',
            variant: 'primary',
            onClick: () => {
              dismissAndClear();
              navigate('/settings#daily-reminders');
            },
          },
          {
            label: 'Not now',
            variant: 'secondary',
            onClick: dismissAndClear,
          },
        ],
      });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [tourActive, hasSeenTour, pathname, pushEnabled, signedIn, navigate]);

  return null;
}
