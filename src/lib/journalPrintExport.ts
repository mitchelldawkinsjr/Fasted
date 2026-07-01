import type { NavigateFunction } from 'react-router-dom';
import { isRunningAsInstalledPwa } from './pwaInstall';

export const JOURNAL_PRINT_RETURN_PATHS = ['/journal', '/settings'] as const;
export type JournalPrintReturnTo = (typeof JOURNAL_PRINT_RETURN_PATHS)[number];

export function parseJournalPrintReturnTo(value: string | null): JournalPrintReturnTo {
  if (value === '/settings') return '/settings';
  return '/journal';
}

export function buildJournalPrintPath(returnTo: JournalPrintReturnTo): string {
  return `/journal/print?return=${encodeURIComponent(returnTo)}`;
}

export type OpenJournalPrintResult = 'navigated' | 'popup' | 'blocked';

export function openJournalPrintView(
  navigate: NavigateFunction,
  returnTo: JournalPrintReturnTo = '/journal',
): OpenJournalPrintResult {
  const printPath = buildJournalPrintPath(returnTo);

  if (isRunningAsInstalledPwa()) {
    navigate(printPath);
    return 'navigated';
  }

  const printWindow = window.open(printPath, '_blank');
  if (!printWindow) {
    return 'blocked';
  }

  printWindow.opener = null;
  return 'popup';
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

export function suppressBrowserPrintFooter(): { title: string; href: string } {
  const snapshot = {
    title: document.title,
    href: window.location.href,
  };

  document.title = ' ';
  history.replaceState(null, '', ' ');

  return snapshot;
}

export function restoreBrowserPrintFooter(
  snapshot: { title: string; href: string },
  navigate: NavigateFunction,
  routerPath: string,
): void {
  document.title = snapshot.title;
  history.replaceState(null, '', snapshot.href);
  navigate(routerPath, { replace: true });
}
