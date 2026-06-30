import { useEffect, useMemo, useRef } from 'react';
import { buildJournalExportModel } from '../lib/journalExport/buildModel';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import { JournalPrintDocument } from '../components/JournalPrintDocument';

export function JournalPrintPage() {
  const { initialized } = useAuth();
  const initializedRef = useRef(initialized);
  initializedRef.current = initialized;

  const progress = useProgress();
  const model = useMemo(() => buildJournalExportModel(progress), [progress]);
  const entryCount = model.entries.length;
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (entryCount === 0 || hasPrintedRef.current) return;

    const fontsReady =
      'fonts' in document
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve();

    let cancelled = false;

    const printWhenReady = async () => {
      await fontsReady;

      while (!cancelled && !initializedRef.current) {
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      }
      if (cancelled || hasPrintedRef.current || !initializedRef.current) return;

      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (cancelled || hasPrintedRef.current) return;

      hasPrintedRef.current = true;
      window.print();
    };

    void printWhenReady();

    return () => {
      cancelled = true;
    };
  }, [entryCount]);

  if (entryCount === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest p-gutter text-body-md text-on-surface-variant">
        No journal entries to export.
      </div>
    );
  }

  return <JournalPrintDocument model={model} />;
}
