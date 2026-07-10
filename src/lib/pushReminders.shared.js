/** Shared reminder decision logic for the PWA and VPS cron sender. */

export const EVENING_REMINDER_TIME = '20:00';

export const REMINDER_COPY = {
  morning: {
    title: 'Fasted',
    body: 'Good morning — don’t forget to check your fast for today.',
    url: '/',
  },
  evening: {
    title: 'Fasted',
    body: 'Still time to check in and reflect on today’s fast.',
    url: '/',
  },
};

export function localDateInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function localTimeInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function hasCompletedCheckIn(progress, date) {
  if (!progress?.checkIns?.length) return false;
  return progress.checkIns.some((c) => c.date === date && Boolean(c.completedAt));
}

export function hasDailyReflection(progress, date) {
  if (!progress?.journalEntries?.length) return false;
  return progress.journalEntries.some(
    (entry) => entry.date === date && entry.type === 'daily-reflection',
  );
}

function buildReminderDecision(kind, localDate) {
  const copy = REMINDER_COPY[kind];
  return {
    kind,
    title: copy.title,
    body: copy.body,
    url: copy.url,
    tag: `fasted-${kind}-${localDate}`,
    localDate,
  };
}

/**
 * Morning first (user-editable time), then evening at 20:00.
 * Skip entirely once today’s check-in exists; evening also skips if a daily reflection exists.
 */
export function decideReminder({
  now,
  timeZone,
  reminderTime,
  lastMorningSentOn,
  lastEveningSentOn,
  progress,
}) {
  const localDate = localDateInTimeZone(now, timeZone);
  const localTime = localTimeInTimeZone(now, timeZone);

  if (hasCompletedCheckIn(progress, localDate)) {
    return null;
  }

  if (localTime >= reminderTime && lastMorningSentOn !== localDate) {
    return buildReminderDecision('morning', localDate);
  }

  if (localTime >= EVENING_REMINDER_TIME) {
    if (lastEveningSentOn === localDate) return null;
    if (hasDailyReflection(progress, localDate)) return null;
    return buildReminderDecision('evening', localDate);
  }

  return null;
}
