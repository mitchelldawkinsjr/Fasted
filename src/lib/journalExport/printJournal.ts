import { getProgress } from '../storage';

export function canExportJournalPdf(): boolean {
  return getProgress().journalEntries.length > 0;
}

export function exportJournalPdf(): boolean {
  if (!canExportJournalPdf()) return false;

  window.open('/journal/print', '_blank', 'noopener,noreferrer');
  return true;
}
