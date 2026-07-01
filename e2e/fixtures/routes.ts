export type AppRoute = {
  path: string;
  label: string;
};

/** Main nav routes audited for overflow and visual baselines. */
export const MAIN_ROUTES: AppRoute[] = [
  { path: '/', label: 'Today' },
  { path: '/calendar', label: 'Calendar' },
  { path: '/journal', label: 'Journal' },
  { path: '/progress', label: 'Progress' },
  { path: '/progress/mood', label: 'MoodVisualizer' },
  { path: '/progress/badges', label: 'Badges' },
  { path: '/phases', label: 'Phases' },
  { path: '/settings', label: 'Settings' },
];
