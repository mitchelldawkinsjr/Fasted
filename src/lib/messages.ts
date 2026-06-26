/** Centralized user-facing copy for consistent tone across the app. */
export const messages = {
  save: {
    journal: 'Devotion saved.',
    journalUpdated: 'Devotion updated.',
    journalDeleted: 'Devotion deleted.',
    checkIn: 'Check-in saved.',
    preferences: 'Preferences saved.',
    profile: 'Profile saved.',
  },
  export: {
    journalJson: 'Journal exported as JSON.',
    journalMarkdown: 'Journal exported as Markdown.',
  },
  import: {
    journalSuccess: 'Journal imported successfully.',
    journalInvalid: 'Import failed. Please check the file format.',
    fileReadError: 'Could not read the selected file.',
  },
  sync: {
    signedIn: 'Signed in. Your progress is syncing.',
    accountCreated: 'Account created. Your progress is syncing.',
    signedOut: 'Signed out. Using guest mode on this device.',
    synced: 'Synced to cloud.',
    offline: 'Offline — your progress is saved on this device.',
    failed: 'Sync failed. Your data is still saved on this device.',
    authFailed: 'Sign in failed. Check your email and password.',
    profileFailed: 'Profile update failed. Please try again.',
  },
  progress: {
    reset: 'All progress has been reset.',
    resetFailed: 'Could not reset progress.',
    badgeEarned: (title: string) => `Milestone earned: ${title}`,
  },
  errors: {
    storage: 'Could not save to browser storage. Check storage settings and try again.',
    storageFull:
      'Storage is full. Export or delete old entries, then try again.',
    saveJournal: 'Could not save your devotion. Please try again.',
    saveCheckIn: 'Could not save your check-in. Please try again.',
    savePreferences: 'Could not save preferences.',
    journalContentRequired: 'Write something in your devotion before saving.',
    journalMoodRequired: 'Choose how you feel this morning before saving your morning devotion.',
    generic: 'Something went wrong. Please try again.',
  },
  confirm: {
    deleteJournal: {
      title: 'Delete devotion?',
      message: 'This entry will be removed from your journal on this device.',
      confirm: 'Delete',
      cancel: 'Keep',
    },
    resetProgress: {
      title: 'Reset all progress?',
      message:
        'Check-ins, badges, journal entries, and streaks will be cleared. This cannot be undone.',
      confirm: 'Reset everything',
      cancel: 'Cancel',
    },
  },
  empty: {
    journal: {
      title: 'No devotions yet',
      description: 'Start writing about what God is teaching you on this journey.',
      action: 'Write your first devotion',
    },
    journalSearch: {
      title: 'No matching devotions',
      description: 'Try a different search or clear the filter.',
      action: 'Clear search',
    },
    badges: {
      title: 'Milestones await',
      description: 'Check in each day and stay faithful through each phase to earn sacred milestones.',
    },
  },
} as const;

export function formatError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}
