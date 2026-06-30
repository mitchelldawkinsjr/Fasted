import type { JournalEntry } from '../../types';

export type JournalExportDateRange = {
  start: string;
  end: string;
};

export type JournalExportModel = {
  journeyName: string | null;
  dateRange: JournalExportDateRange | null;
  entryCount: number;
  exportDate: string;
  entries: JournalEntry[];
};
