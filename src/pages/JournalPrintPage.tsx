import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { buildJournalExportModel, JournalPrintDocument } from '../components/JournalPrintDocument';
import { Icon } from '../components/Icon';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import {
  leavePrintView,
  parseJournalPrintReturnTo,
  restoreBrowserPrintFooter,
  suppressBrowserPrintFooter,
} from '../lib/journalPrintExport';
import { getStorageScope } from '../lib/storage';

const BACK_NAV_CLASS =
  'inline-flex items-center gap-1 text-body-md font-medium text-primary transition-opacity hover:opacity-80';

export function JournalPrintPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = parseJournalPrintReturnTo(searchParams.get('return'));
  const routerPath = `${location.pathname}${location.search}`;
  const { initialized, user } = useAuth();
  const progress = useProgress();
  const storageScope = getStorageScope();
  const scopeReady = initialized && storageScope === (user?.id ?? null);
  const model = useMemo(() => buildJournalExportModel(progress), [progress]);
  const entryCount = model.entries.length;
  const progressStamp = `${storageScope ?? 'guest'}:${progress.updatedAt ?? ''}:${progress.journalEntries.map((e) => e.id).join(',')}`;
  const printedStampRef = useRef<string | null>(null);

  useEffect(() => {
    const handleAfterPrint = () => {
      leavePrintView(navigate, returnTo);
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [navigate, returnTo]);

  useEffect(() => {
    if (entryCount === 0 || !scopeReady) return;
    if (printedStampRef.current === progressStamp) return;

    const fontsReady =
      'fonts' in document
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve();

    let cancelled = false;

    const printWhenReady = async () => {
      await fontsReady;
      if (cancelled || printedStampRef.current === progressStamp) return;

      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (cancelled || printedStampRef.current === progressStamp) return;

      printedStampRef.current = progressStamp;
      const snapshot = suppressBrowserPrintFooter();
      try {
        window.print();
      } finally {
        restoreBrowserPrintFooter(snapshot, navigate, routerPath);
      }
    };

    void printWhenReady();

    return () => {
      cancelled = true;
    };
  }, [entryCount, navigate, progressStamp, routerPath, scopeReady]);

  if (entryCount === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-container-lowest p-gutter">
        <Link
          to={returnTo}
          className={`mb-stack-md ${BACK_NAV_CLASS} print:hidden`}
          aria-label="Go back"
        >
          <Icon name="arrow_back" size={20} />
        </Link>
        <div className="flex flex-1 items-center justify-center text-body-md text-on-surface-variant">
          No journal entries to export.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest">
      <div className="print:hidden px-gutter pb-stack-md pt-gutter">
        <Link to={returnTo} className={BACK_NAV_CLASS} aria-label="Go back">
          <Icon name="arrow_back" size={20} />
        </Link>
      </div>
      <JournalPrintDocument model={model} />
    </div>
  );
}
