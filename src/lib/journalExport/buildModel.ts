import { formatDisplayDate, getLocalDateString } from '../dateUtils';
import { getActiveJourney } from '../journey';
import { getProgress } from '../storage';
import type { UserProgress } from '../../types';
import type { JournalExportModel } from './types';

export function buildJournalExportModel(progress?: UserProgress): JournalExportModel {
  const data = progress ?? getProgress();
  const journey = getActiveJourney(data);
  const entries = [...data.journalEntries].sort((a, b) => a.date.localeCompare(b.date));
  const dates = entries.map((entry) => entry.date);

  return {
    journeyName: journey.isDefault ? null : journey.name,
    dateRange:
      dates.length > 0
        ? { start: dates[0], end: dates[dates.length - 1] }
        : null,
    entryCount: entries.length,
    exportDate: formatDisplayDate(getLocalDateString()),
    entries,
  };
}
