import type { JournalEntry } from '../../types';

export type JournalExportModel = {
  journeyName: string | null;
  dateRange: { start: string; end: string } | null;
  exportDate: string;
  entries: JournalEntry[];
};
