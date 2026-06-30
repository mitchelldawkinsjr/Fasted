import { messages } from './messages';
import { toast } from './toast';

export function openJournalPrintExport(): boolean {
  const printWindow = window.open('/journal/print', '_blank');
  if (!printWindow) {
    toast.warning(messages.export.journalPdfBlocked);
    return false;
  }
  printWindow.opener = null;
  toast.info(messages.export.journalPdf);
  return true;
}
