import type { TourStep } from './TourContext';

export type PageTourId = 'settings' | 'calendar' | 'progress' | 'groups';

export const PAGE_TOUR_PATHS: Record<PageTourId, string> = {
  settings: '/settings',
  calendar: '/calendar',
  progress: '/progress',
  groups: '/groups',
};

export function getPageTourForPath(pathname: string): PageTourId | null {
  for (const [id, path] of Object.entries(PAGE_TOUR_PATHS) as [PageTourId, string][]) {
    if (pathname === path) return id;
  }
  return null;
}

/** Short first-visit tours for individual pages (1–2 steps each). */
export const PAGE_TOURS: Record<PageTourId, TourStep[]> = {
  settings: [
    {
      id: 'settings-sign-in',
      target: '[data-tour="settings-sign-in"]',
      title: 'Sign In & Sync',
      body: 'Create an account or sign in here to back up check-ins, journal entries, and streaks to the cloud.',
      placement: 'bottom',
      scroll: 'center',
    },
    {
      id: 'settings-journeys',
      target: '[data-tour="settings-journeys"]',
      title: 'Your Journeys',
      body: 'Switch journeys, adjust start dates, or build a custom fast plan for your church or group.',
      placement: 'top',
      scroll: 'center',
    },
  ],
  calendar: [
    {
      id: 'calendar-legend',
      target: '[data-tour="calendar-legend"]',
      title: 'Reading the Calendar',
      body: 'Water drops mark fast days; green checks mean you checked in that day.',
      placement: 'bottom',
    },
    {
      id: 'calendar-grid',
      target: '[data-tour="calendar-grid"]',
      title: 'Tap Any Day',
      body: 'Open any date on Today to see that day’s plan, scripture, and check-in.',
      placement: 'top',
    },
  ],
  progress: [
    {
      id: 'progress-streak',
      target: '[data-tour="progress-streak"]',
      title: 'Your Streaks',
      body: 'Track current streak, longest streak, total check-ins, and phases completed.',
      placement: 'bottom',
      scroll: 'center',
    },
    {
      id: 'progress-mood',
      target: '[data-tour="progress-mood"]',
      title: 'Mood Trends',
      body: 'Daily reflection moods build your mood chart over time — tap to explore the full visualizer by month and phase.',
      placement: 'top',
      scroll: 'center',
    },
    {
      id: 'progress-badges',
      target: '[data-tour="progress-badges"]',
      title: 'Sacred Milestones',
      body: 'Earn badges as you stay consistent — tap View all sprites for the full gallery.',
      placement: 'top',
      scroll: 'center',
    },
  ],
  groups: [
    {
      id: 'groups-create',
      target: '[data-tour="groups-create"]',
      title: 'Create a Group',
      body: 'Start a group for your church or friends — pick a journey and share an invite code.',
      placement: 'bottom',
    },
    {
      id: 'groups-join',
      target: '[data-tour="groups-join"]',
      title: 'Join with a Code',
      body: 'Already have an invite? Enter the code here to join an existing group.',
      placement: 'top',
    },
  ],
};
