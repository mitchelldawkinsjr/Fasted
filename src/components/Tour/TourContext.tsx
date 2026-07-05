import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useProgress } from '../../hooks/useProgress';
import { markTourSeen, migrateLegacyTourFlag } from '../../lib/storage';

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
    id: 'done',
    title: "You're All Set!",
    body: 'Check in today to start your streak. Tap the account icon anytime for settings, journeys, and cloud sync.',
    placement: 'center',
    nextLabel: 'Begin the Journey',
  },
];

type TourContextValue = {
  active: boolean;
  stepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
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
  const progress = useProgress();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [manualStart, setManualStart] = useState(false);

  useEffect(() => {
    migrateLegacyTourFlag();
  }, []);

  useEffect(() => {
    if (manualStart || progress.hasSeenTour || location.pathname !== '/') return;
    const timer = window.setTimeout(() => setActive(true), 800);
    return () => window.clearTimeout(timer);
  }, [progress.hasSeenTour, location.pathname, manualStart]);

  const completeTour = useCallback(() => {
    markTourSeen();
    setActive(false);
    setStepIndex(0);
    setManualStart(false);
  }, []);

  const nextStep = useCallback(() => {
    const next = stepIndex + 1;
    if (next >= TOUR_STEPS.length) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#fed65b', '#3d7a00', '#fff8e7'],
      });
      completeTour();
    } else {
      setStepIndex(next);
    }
  }, [stepIndex, completeTour]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const startTour = useCallback(() => {
    setManualStart(true);
    navigate('/');
    setStepIndex(0);
    window.scrollTo({ top: 0, behavior: 'instant' });
    window.setTimeout(() => setActive(true), 300);
  }, [navigate]);

  const currentStep = active ? (TOUR_STEPS[stepIndex] ?? null) : null;

  return (
    <TourContext.Provider
      value={{
        active,
        stepIndex,
        currentStep,
        totalSteps: TOUR_STEPS.length,
        startTour,
        nextStep,
        skipTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
