import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../../hooks/useAuth';
import { useProgress } from '../../hooks/useProgress';
import { markPageTourSeen, markTourSeen, migrateLegacyTourFlag } from '../../lib/storage';
import { getPageTourForPath, PAGE_TOURS, type PageTourId } from './pageTours';

export type TourStep = {
  id: string;
  /** CSS selector for the element to spotlight. Omit for full-screen steps. */
  target?: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'center';
  /** Scroll the target into the visible viewport center before spotlighting. */
  scroll?: 'center';
  /** Label for the primary action button */
  nextLabel?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Fasted',
    body: 'Track your biblical fasting journey — daily plans, scripture, journaling, streaks, and optional group community.',
    placement: 'center',
    nextLabel: 'Get Started',
  },
  {
    id: 'today-card',
    target: '[data-tour="today-card"]',
    title: 'Your Daily Plan',
    body: "Today's phase, fast type, and instructions guide each day of your journey.",
    placement: 'bottom',
  },
  {
    id: 'checkin-btn',
    target: '[data-tour="checkin-btn"]',
    title: 'Daily Check-in',
    body: 'After you fast and pray, log your check-in here. Streaks and sacred milestones unlock as you stay consistent.',
    placement: 'top',
    scroll: 'center',
  },
  {
    id: 'scripture-card',
    target: '[data-tour="scripture-card"]',
    title: "Today's Scripture",
    body: 'Each day includes a verse and reference tied to your current phase — tap to read on Bible.com.',
    placement: 'top',
    scroll: 'center',
  },
  {
    id: 'prayer-focus',
    target: '[data-tour="prayer-focus"]',
    title: 'Prayer Focus',
    body: 'Guided prayer points help you stay centered on what matters each day of the fast.',
    placement: 'top',
    scroll: 'center',
  },
  {
    id: 'daily-encouragement',
    target: '[data-tour="daily-encouragement"]',
    title: 'Daily Encouragement',
    body: 'A short word of motivation for your day — refreshed with each phase of the journey.',
    placement: 'top',
    scroll: 'center',
  },
  {
    id: 'morning-reflection',
    target: '[data-tour="morning-reflection"]',
    title: 'Morning Reflection',
    body: 'Jump straight into journaling from Today — daily reflection, prayer, gratitude, and more.',
    placement: 'top',
    scroll: 'center',
  },
  {
    id: 'nav-calendar',
    target: '[data-tour="nav-calendar"]',
    title: 'Your Fasting Calendar',
    body: 'See your full journey at a glance — fast days, phases, and check-ins. Tap any day to jump back to it.',
    placement: 'top',
  },
  {
    id: 'nav-journal',
    target: '[data-tour="nav-journal"]',
    title: 'Journal Your Journey',
    body: 'Capture reflections, prayers, gratitude, and victories — exportable as JSON, Markdown, or PDF.',
    placement: 'top',
  },
  {
    id: 'nav-progress',
    target: '[data-tour="nav-progress"]',
    title: 'Track Your Progress',
    body: 'See streaks, phase milestones, mood trends, and sacred milestones earned along the way.',
    placement: 'top',
  },
  {
    id: 'nav-groups',
    target: '[data-tour="nav-groups"]',
    title: 'Fast Together',
    body: 'Join or create a group to share the journey — shared prayer, commitments, and a leader dashboard (sign-in required).',
    placement: 'top',
  },
  {
    id: 'account-settings',
    target: '[data-tour="account-settings"]',
    title: 'Save Your Progress',
    body: 'Tap the account icon to open Settings — sign in to sync check-ins, journal entries, and streaks across devices.',
    placement: 'bottom',
  },
  {
    id: 'done',
    title: "You're All Set!",
    body: 'Check in today to start your streak. Replay this tour anytime from Settings.',
    placement: 'center',
    nextLabel: 'Begin the Journey',
  },
];

type ActiveTour = { kind: 'main' } | { kind: 'page'; id: PageTourId };

type TourContextValue = {
  active: boolean;
  stepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside TourProvider');
  return ctx;
}

type Props = { children: ReactNode };

export function TourProvider({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { initialized: authInitialized } = useAuth();
  const progress = useProgress();
  const [activeTour, setActiveTour] = useState<ActiveTour | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [manualStart, setManualStart] = useState(false);

  const activeSteps = useMemo(() => {
    if (!activeTour) return [];
    return activeTour.kind === 'main' ? TOUR_STEPS : PAGE_TOURS[activeTour.id];
  }, [activeTour]);

  useEffect(() => {
    migrateLegacyTourFlag();
  }, []);

  useEffect(() => {
    if (manualStart || activeTour !== null) return;
    if (progress.hasSeenTour || location.pathname !== '/') return;
    const timer = window.setTimeout(() => {
      setActiveTour({ kind: 'main' });
      setStepIndex(0);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [progress.hasSeenTour, location.pathname, manualStart, activeTour]);

  useEffect(() => {
    if (manualStart || activeTour !== null) return;

    const pageId = getPageTourForPath(location.pathname);
    if (!pageId) return;
    if (progress.pageToursSeen?.[pageId]) return;
    if (pageId === 'groups' && !authInitialized) return;

    const tourPageId = pageId;
    let cancelled = false;
    let attemptTimer = 0;
    let startTimer = 0;
    const firstTarget = PAGE_TOURS[tourPageId][0]?.target;
    const MAX_TARGET_WAIT_ATTEMPTS = 40;

    function beginTour() {
      if (cancelled) return;
      setActiveTour({ kind: 'page', id: tourPageId });
      setStepIndex(0);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    function waitForTarget(attemptsLeft: number) {
      if (cancelled) return;
      if (!firstTarget || document.querySelector(firstTarget)) {
        beginTour();
        return;
      }
      if (attemptsLeft <= 0) return;
      attemptTimer = window.setTimeout(() => waitForTarget(attemptsLeft - 1), 100);
    }

    startTimer = window.setTimeout(() => waitForTarget(MAX_TARGET_WAIT_ATTEMPTS), 350);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      window.clearTimeout(attemptTimer);
    };
  }, [location.pathname, progress.pageToursSeen, manualStart, activeTour, authInitialized]);

  const completeTour = useCallback(() => {
    if (activeTour?.kind === 'main') {
      markTourSeen();
    } else if (activeTour?.kind === 'page') {
      markPageTourSeen(activeTour.id);
    }
    setActiveTour(null);
    setStepIndex(0);
    setManualStart(false);
  }, [activeTour]);

  const nextStep = useCallback(() => {
    const next = stepIndex + 1;
    if (next >= activeSteps.length) {
      if (activeTour?.kind === 'main') {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#fed65b', '#3d7a00', '#fff8e7'],
        });
      }
      completeTour();
    } else {
      setStepIndex(next);
    }
  }, [stepIndex, activeSteps.length, activeTour, completeTour]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  }, [stepIndex]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const startTour = useCallback(() => {
    setManualStart(true);
    setActiveTour(null);
    navigate('/');
    setStepIndex(0);
    window.scrollTo({ top: 0, behavior: 'instant' });
    window.setTimeout(() => {
      setActiveTour({ kind: 'main' });
      setStepIndex(0);
    }, 300);
  }, [navigate]);

  const active = activeTour !== null;
  const currentStep = active ? (activeSteps[stepIndex] ?? null) : null;

  return (
    <TourContext.Provider
      value={{
        active,
        stepIndex,
        currentStep,
        totalSteps: activeSteps.length,
        startTour,
        nextStep,
        prevStep,
        skipTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
