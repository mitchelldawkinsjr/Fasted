import { useEffect, useMemo, useRef } from 'react';
import { buildJournalExportModel } from '../lib/journalExport/buildModel';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import { JournalPrintDocument } from '../components/JournalPrintDocument';
import { getStorageScope } from '../lib/storage';

export function JournalPrintPage() {
  const { initialized, user } = useAuth();
  const progress = useProgress();
  const model = useMemo(() => buildJournalExportModel(progress), [progress]);
  const entryCount = model.entries.length;
  const hasPrintedRef = useRef(false);
  const scopeReady = initialized && getStorageScope() === (user?.id ?? null);

  useEffect(() => {
    if (entryCount === 0 || hasPrintedRef.current || !scopeReady) return;

    const fontsReady =
      'fonts' in document
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve();

    let cancelled = false;

    const printWhenReady = async () => {
      await fontsReady;

      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (cancelled || hasPrintedRef.current) return;

      hasPrintedRef.current = true;
      window.print();
    };

    void printWhenReady();

    return () => {
      cancelled = true;
    };
  }, [entryCount, scopeReady]);

  if (entryCount === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest p-gutter text-body-md text-on-surface-variant">
        No journal entries to export.
      </div>
    );
  }

  return <JournalPrintDocument model={model} />;
}
