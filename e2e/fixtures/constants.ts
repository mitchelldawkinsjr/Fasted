export const STORAGE_KEY = 'fasted-calendar-progress:guest';
export const INSTALL_TOAST_KEY = 'fasted-calendar-install-toast-dismissed';

/** Fixed date for deterministic UI (within default Fasted journey plan). */
export const FIXED_DATE = '2026-06-27';

export const LONG_TEXT =
  'Supercalifragilisticexpialidocious pneumonoultramicroscopicsilicovolcanoconiosis extraordinarilylongunbrokenstringwithoutspaces1234567890';

/** Default progress flags so onboarding tours do not block unrelated e2e tests. */
export const TOUR_DISMISSED = {
  hasSeenTour: true,
  pageToursSeen: {
    settings: true,
    calendar: true,
    progress: true,
    groups: true,
  },
} as const;
