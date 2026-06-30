import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildJournalExportModel } from '../lib/journalExport';
import { useProgress } from '../hooks/useProgress';
import { JournalPrintDocument } from '../components/JournalPrintDocument';

export function JournalPrintPage() {
  const progress = useProgress();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get('preview') === '1';
  const model = useMemo(() => buildJournalExportModel(progress), [progress]);

  useEffect(() => {
    if (preview || model.entryCount === 0) return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 400);

    const handleAfterPrint = () => {
      window.close();
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [model.entryCount, preview]);

  if (model.entryCount === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest p-gutter text-body-md text-on-surface-variant">
        No journal entries to export.
      </div>
    );
  }

  return <JournalPrintDocument model={model} />;
}
