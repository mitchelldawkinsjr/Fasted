import type { NavigateFunction } from 'react-router-dom';
import { isRunningAsInstalledPwa } from './pwaInstall';

export type JournalPrintReturnTo = '/journal' | '/settings';

export function openJournalPrintView(
  navigate: NavigateFunction,
  returnTo: JournalPrintReturnTo = '/journal',
): boolean {
  const printPath = `/journal/print?return=${encodeURIComponent(returnTo)}`;

  if (isRunningAsInstalledPwa()) {
    navigate(printPath);
    return true;
  }

  const printWindow = window.open(printPath, '_blank');
  if (!printWindow) {
    return false;
  }

  printWindow.opener = null;
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
