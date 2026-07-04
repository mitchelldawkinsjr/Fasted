import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildJournalExportModel, JournalPrintDocument } from '../components/JournalPrintDocument';
import { Icon } from '../components/Icon';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import {
  type JournalPrintReturnTo,
  leavePrintView,
  withSuppressedPrintFooter,
} from '../lib/journalPrintExport';
import { collectMealImageIds } from '../lib/mealImages';
import { getStorageScope } from '../lib/storage';

const BACK_NAV_CLASS =
  'inline-flex items-center gap-1 text-body-md font-medium text-primary transition-opacity hover:opacity-80';

async function waitForPrintMealImages(expectedCount: number): Promise<void> {
  if (expectedCount === 0) return;

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const imgs = document.querySelectorAll<HTMLImageElement>('.print-meal-image');
    if (
      imgs.length >= expectedCount &&
      [...imgs].every((img) => img.complete && img.naturalWidth > 0)
    ) {
      return;
    }
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }
}

export function JournalPrintPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnParam = searchParams.get('return');
  const returnTo: JournalPrintReturnTo = returnParam === '/settings' ? '/settings' : '/journal';
  const { initialized, user } = useAuth();
  const progress = useProgress();
  const storageScope = getStorageScope();
  const scopeReady = initialized && storageScope === (user?.id ?? null);
  const model = useMemo(() => buildJournalExportModel(progress), [progress]);
  const mealImageCount = useMemo(
    () => Object.values(progress.mealImages ?? {}).flatMap((images) => collectMealImageIds(images)).length,
    [progress.mealImages],
  );
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

      await waitForPrintMealImages(mealImageCount);
      if (cancelled || printedStampRef.current === progressStamp) return;

      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (cancelled || printedStampRef.current === progressStamp) return;

      printedStampRef.current = progressStamp;
      withSuppressedPrintFooter(() => window.print());
    };

    void printWhenReady();

    return () => {
      cancelled = true;
    };
  }, [entryCount, mealImageCount, progressStamp, scopeReady]);

  const backControl = (
    <button
      type="button"
      onClick={() => leavePrintView(navigate, returnTo)}
      className={BACK_NAV_CLASS}
      aria-label="Go back"
    >
      <Icon name="arrow_back" size={20} />
    </button>
  );

  if (entryCount === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-container-lowest p-gutter">
        <div className="mb-stack-md print:hidden">{backControl}</div>
        <div className="flex flex-1 items-center justify-center text-body-md text-on-surface-variant">
          No journal entries to export.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest">
      <div className="print:hidden px-gutter pb-stack-md pt-gutter">{backControl}</div>
      <JournalPrintDocument model={model} />
    </div>
  );
}
