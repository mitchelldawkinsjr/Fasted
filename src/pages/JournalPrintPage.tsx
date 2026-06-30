import { useEffect, useMemo } from 'react';
import { buildJournalExportModel } from '../lib/journalExport';
import { useProgress } from '../hooks/useProgress';
import { JournalPrintDocument } from '../components/JournalPrintDocument';

export function JournalPrintPage() {
  const progress = useProgress();
  const model = useMemo(() => buildJournalExportModel(progress), [progress]);
  const entryCount = model.entries.length;

  useEffect(() => {
    if (entryCount === 0) return;

    let cancelled = false;

    const printWhenReady = async () => {
      if ('fonts' in document) {
        await document.fonts.ready.catch(() => undefined);
      }
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (cancelled) return;
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
