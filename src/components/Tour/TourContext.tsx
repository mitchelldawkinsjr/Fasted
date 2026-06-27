import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import confetti from 'canvas-confetti';

export type TourStep = {
  id: string;
  /** CSS selector for the element to spotlight. Omit for full-screen steps. */
  target?: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'center';
  /** Label for the primary action button */
  nextLabel?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Fasted Calendar',
    body: 'Track your 8-phase biblical fasting journey — daily plans, scripture, journaling, and community.',
    placement: 'center',
    nextLabel: 'Get Started',
  },
  {
    id: 'today-card',
    target: '[data-tour="today-card"]',
    title: 'Your Daily Plan',
    body: "This is your fast card — it shows today's fast type, current phase, and instructions to guide your day.",
    placement: 'bottom',
  },
  {
    id: 'checkin-btn',
    target: '[data-tour="checkin-btn"]',
    title: 'Daily Check-in',
    body: 'After you fast and pray, tap here to log your check-in. Streaks and badges unlock as you stay consistent.',
    placement: 'bottom',
  },
  {
    id: 'nav-journal',
    target: '[data-tour="nav-journal"]',
    title: 'Journal Your Journey',
    body: 'Capture daily reflections, prayers, gratitude, and victories — exportable any time.',
    placement: 'top',
  },
  {
    id: 'nav-progress',
    target: '[data-tour="nav-progress"]',
    title: 'Track Your Progress',
    body: 'See your streaks, phase milestones, mood trends, and badges earned along the way.',
    placement: 'top',
  },
  {
    id: 'done',
    title: "You're All Set!",
    body: 'Check in today to start your streak. The journey begins with one faithful step.',
    placement: 'center',
    nextLabel: 'Begin the Journey',
  },
];

const TOUR_STORAGE_KEY = 'fasted-tour-v1';

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
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen) {
      // Small delay so the app renders fully before the overlay appears
      const t = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'done');
    setActive(false);
    setStepIndex(0);
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
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setStepIndex(0);
    setActive(true);
  }, []);

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
