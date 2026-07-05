import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../lib/analytics';
import { VerseOfTheDayLabel } from './VerseOfTheDayLabel';

export type FocusField = {
  key: string;
  label: string;
  ariaLabel: string;
  stripLabel: string;
};

type Props = {
  fields: FocusField[];
  activeKey: string;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onNavigate: (key: string) => void;
  onClose: () => void;
  date: string;
  entryType: string;
};

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function JournalFocusLightbox({
  fields,
  activeKey,
  values,
  onChange,
  onNavigate,
  onClose,
  date,
  entryType,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const labelId = useId();
  const openedAtRef = useRef(Date.now());
  const activeIndex = fields.findIndex((field) => field.key === activeKey);
  const activeField = fields[activeIndex];
  const value = values[activeKey] ?? '';
  const showFieldNav = fields.length > 1;
  const prevKey = activeIndex > 0 ? fields[activeIndex - 1]?.key : null;
  const nextKey =
    activeIndex >= 0 && activeIndex < fields.length - 1
      ? fields[activeIndex + 1]?.key
      : null;

  useEffect(() => {
    openedAtRef.current = Date.now();
    trackEvent('journal_focus_mode_opened', {
      field_key: activeKey,
      entry_type: entryType,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track once on mount
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeKey]);

  const handleClose = () => {
    trackEvent('journal_focus_mode_closed', {
      field_key: activeKey,
      entry_type: entryType,
      duration_ms: Date.now() - openedAtRef.current,
    });
    onClose();
  };
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseRef.current();
      }
    };

    const main = document.querySelector('main');
    main?.setAttribute('inert', '');

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      main?.removeAttribute('inert');
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, []);

  const handleNavigate = (key: string) => {
    if (key === activeKey) return;
    trackEvent('journal_focus_mode_navigated', {
      from_key: activeKey,
      to_key: key,
      entry_type: entryType,
    });
    onNavigate(key);
  };

  if (!activeField) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/20 p-3 backdrop-blur-[4px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      onClick={handleClose}
    >
      <div
        className="journal-focus-sans mx-auto flex h-full w-full max-w-[680px] flex-col rounded-lg border border-[#E5E5E5] bg-surface-container-lowest shadow-[0_8px_40px_rgba(0,0,0,0.10)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/30 px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={handleClose}
            className="journal-focus-sans text-body-md font-medium text-on-surface transition hover:text-on-surface-variant"
          >
            Done
          </button>
          {showFieldNav ? (
            <span className="journal-focus-sans text-[14px] font-medium tracking-wide text-on-surface-variant">
              {activeIndex + 1} of {fields.length}
            </span>
          ) : (
            <span className="sr-only">Focus mode</span>
          )}
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
          <div id={labelId} className="mb-4 shrink-0">
            {activeField.key === 'prayerFocus' ? (
              <VerseOfTheDayLabel date={date} />
            ) : (
              <h2 className="journal-focus-sans text-[14px] font-medium tracking-wide text-on-surface">
                {activeField.label}
              </h2>
            )}
          </div>

          {showFieldNav && (
            <div className="scroll-hide mb-4 flex shrink-0 gap-2 overflow-x-auto pb-1">
              {fields.map((field) => {
                const selected = field.key === activeKey;
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => handleNavigate(field.key)}
                    aria-current={selected ? 'true' : undefined}
                    className={`journal-focus-sans shrink-0 rounded px-2 py-1 text-[12px] font-medium transition ${
                      selected
                        ? 'border-l-2 border-l-on-surface bg-surface-container-low pl-2 text-on-surface'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {field.stripLabel}
                  </button>
                );
              })}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(activeKey, event.target.value)}
            aria-label={activeField.ariaLabel}
            className="journal-focus-serif min-h-0 w-full flex-1 resize-none border-0 border-b border-outline-variant bg-transparent pb-2 text-[17px] leading-[1.6] text-on-surface focus:border-on-surface focus:outline-none focus:ring-0"
          />

          {showFieldNav && (
            <div className="mt-4 flex shrink-0 items-center justify-between gap-3">
              <button
                type="button"
                disabled={!prevKey}
                onClick={() => prevKey && handleNavigate(prevKey)}
                className="journal-focus-sans text-[14px] font-medium text-on-surface-variant transition hover:text-on-surface disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!nextKey}
                onClick={() => nextKey && handleNavigate(nextKey)}
                className="journal-focus-sans text-[14px] font-medium text-on-surface-variant transition hover:text-on-surface disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <footer className="journal-focus-sans shrink-0 border-t border-outline-variant/30 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-[12px] font-medium text-on-surface-variant">
          {wordCount(value) === 1 ? '1 word' : `${wordCount(value)} words`}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
