import { useEffect, useMemo, useRef } from 'react';
import { buildJournalExportModel, JournalPrintDocument } from '../components/JournalPrintDocument';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import { getStorageScope } from '../lib/storage';

export function JournalPrintPage() {
  const { initialized, user } = useAuth();
  const progress = useProgress();
  const storageScope = getStorageScope();
  const scopeReady = initialized && storageScope === (user?.id ?? null);
  const model = useMemo(() => buildJournalExportModel(progress), [progress]);
  const entryCount = model.entries.length;
  const progressStamp = `${storageScope ?? 'guest'}:${progress.updatedAt ?? ''}:${progress.journalEntries.map((e) => e.id).join(',')}`;
  const printedStampRef = useRef<string | null>(null);

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
      window.print();
    };

    void printWhenReady();

    return () => {
      cancelled = true;
    };
  }, [entryCount, progressStamp, scopeReady]);

  if (entryCount === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest p-gutter text-body-md text-on-surface-variant">
        No journal entries to export.
      </div>
    );
  }

  return <JournalPrintDocument model={model} />;
}
