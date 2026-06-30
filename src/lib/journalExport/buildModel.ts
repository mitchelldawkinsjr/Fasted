import { formatDisplayDate, getLocalDateString } from '../dateUtils';
import { getActiveJourney } from '../journey';
import type { JournalEntry, UserProgress } from '../../types';

export type JournalExportModel = {
  journeyName: string | null;
  dateRange: { start: string; end: string } | null;
  exportDate: string;
  entries: JournalEntry[];
};

export function buildJournalExportModel(progress: UserProgress): JournalExportModel {
  const journey = getActiveJourney(progress);
  const entries = [...progress.journalEntries].sort((a, b) => a.date.localeCompare(b.date));
  const dates = entries.map((entry) => entry.date);

  return {
    journeyName: journey.isDefault ? null : journey.name,
    dateRange:
      dates.length > 0
        ? { start: dates[0], end: dates[dates.length - 1] }
        : null,
    exportDate: formatDisplayDate(getLocalDateString()),
    entries,
  };
}
