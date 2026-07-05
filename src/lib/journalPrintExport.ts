import type { NavigateFunction } from 'react-router-dom';
import { trackEvent } from './analytics';
import { isRunningAsInstalledPwa } from './pwaInstall';

export type JournalPrintReturnTo = '/journal' | '/settings';

export function openJournalPrintView(
  navigate: NavigateFunction,
  returnTo: JournalPrintReturnTo = '/journal',
  entryCount = 0,
): boolean {
  const source = returnTo === '/settings' ? 'settings' : 'journal';
  const printPath = `/journal/print?return=${encodeURIComponent(returnTo)}`;

  if (isRunningAsInstalledPwa()) {
    navigate(printPath);
    trackEvent('journal_pdf_export', { source, entry_count: entryCount });
    return true;
  }

  const printWindow = window.open(printPath, '_blank');
  if (!printWindow) {
    return false;
  }

  printWindow.opener = null;
  trackEvent('journal_pdf_export', { source, entry_count: entryCount });
  return true;
}

export function leavePrintView(navigate: NavigateFunction, returnTo: JournalPrintReturnTo): void {
  if (isRunningAsInstalledPwa()) {
    navigate(returnTo);
    return;
  }

  window.close();
  window.setTimeout(() => {
    navigate(returnTo);
  }, 150);
}

export function withSuppressedPrintFooter<T>(print: () => T): T {
  const snapshot = {
    title: document.title,
    href: window.location.href,
  };

  document.title = ' ';
  history.replaceState(null, '', ' ');
  const suppressedHref = window.location.href;

  try {
    return print();
  } finally {
    document.title = snapshot.title;
    if (window.location.href === suppressedHref) {
      history.replaceState(null, '', snapshot.href);
    }
  }
}
