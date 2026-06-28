import { useMemo, useRef, useState } from 'react';
import { PHASE_TEMPLATES } from '../data/phaseTemplates';
import { getJourneyPhaseWindows } from '../lib/journey';
import {
  readJourneyImageFile,
  resolvePhaseImagePath,
  validateJourneyImageFile,
} from '../lib/journeyImages';
import { formatDisplayDate, getLocalDateString } from '../lib/dateUtils';
import { saveJourney, setActiveJourney } from '../lib/storage';
import { toast } from '../lib/toast';
import type { Journey, JourneyPhase } from '../types';
import { LoadingButton } from './LoadingButton';
import { Icon } from './Icon';

type Props = {
  open: boolean;
  onClose: () => void;
  /** When set, saves locally is skipped and this callback receives the draft journey. */
  onComplete?: (journey: Journey) => void | Promise<void>;
  confirmLabel?: string;
  title?: string;
};

function createJourneyId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `journey-${crypto.randomUUID()}`;
  }
  return `journey-${Date.now().toString(36)}`;
}

export function JourneyBuilder({ open, onClose, onComplete, confirmLabel, title }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [selected, setSelected] = useState<string[]>(PHASE_TEMPLATES.map((t) => t.id));
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetTemplateId, setUploadTargetTemplateId] = useState<string | null>(null);

  const previewJourney = useMemo((): Journey => {
    const phases: JourneyPhase[] = selected.map((templateId, order) => ({
      templateId,
      order,
      ...(imageOverrides[templateId] ? { imagePath: imageOverrides[templateId] } : {}),
    }));
    return {
      id: 'preview',
      name: name.trim() || 'Custom Journey',
      startDate,
      phases,
    };
  }, [name, selected, startDate, imageOverrides]);

  const draftJourney = useMemo((): Journey | null => {
    if (!name.trim() || selected.length === 0) return null;
    const phases: JourneyPhase[] = selected.map((templateId, order) => ({
      templateId,
      order,
      ...(imageOverrides[templateId] ? { imagePath: imageOverrides[templateId] } : {}),
    }));
    return { id: createJourneyId(), name: name.trim(), startDate, phases };
  }, [name, selected, startDate, imageOverrides]);

  const windows = draftJourney ? getJourneyPhaseWindows(draftJourney) : [];

  if (!open) return null;

  const toggleTemplate = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const moveTemplate = (id: string, direction: -1 | 1) => {
    setSelected((prev) => {
      const index = prev.indexOf(id);
      if (index < 0) return prev;
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const resetForm = () => {
    setStep(0);
    setName('');
    setStartDate(getLocalDateString());
    setSelected(PHASE_TEMPLATES.map((t) => t.id));
    setImageOverrides({});
  };

  const handleConfirm = async () => {
    if (!draftJourney) return;
    setBusy(true);
    try {
      if (onComplete) {
        await onComplete(draftJourney);
      } else {
        saveJourney(draftJourney);
        setActiveJourney(draftJourney.id);
      }
      onClose();
      resetForm();
    } finally {
      setBusy(false);
    }
  };

  const openImageUpload = (templateId: string) => {
    setUploadTargetTemplateId(templateId);
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const templateId = uploadTargetTemplateId;
    setUploadTargetTemplateId(null);
    if (!file || !templateId) return;

    const validation = validateJourneyImageFile(file);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    try {
      const dataUrl = await readJourneyImageFile(file);
      setImageOverrides((prev) => ({ ...prev, [templateId]: dataUrl }));
      toast.success('Custom image attached');
    } catch {
      toast.error('Could not read the selected image.');
    }
  };

  const clearImageOverride = (templateId: string) => {
    setImageOverrides((prev) => {
      const next = { ...prev };
      delete next[templateId];
      return next;
    });
  };

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  const backButtonClass =
    'flex-1 rounded-xl bg-surface-container px-4 py-3 text-body-md text-on-surface';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => void handleImageSelected(event)}
      />
      <div
        className="flex max-h-[min(90vh,calc(100dvh-6rem))] w-full max-w-lg flex-col rounded-2xl bg-surface-container-lowest shadow-grace-up sm:max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="journey-builder-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-surface-variant px-gutter py-4">
          <h2 id="journey-builder-title" className="font-display text-headline-md text-primary">
            {title ?? 'Create Journey'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-surface-container">
            <Icon name="close" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-gutter">
          {step === 0 && (
            <label className="block">
              <span className="mb-1 block text-body-md text-on-surface">Journey name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer Consecration"
                className={inputClass}
              />
            </label>
          )}

          {step === 1 && (
            <>
              <p className="text-body-md text-on-surface-variant">
                Choose phases and reorder. Custom journey images are included for each fast. You
                can optionally upload your own image to replace one.
              </p>
              <ul className="mt-4 space-y-2">
                {selected.map((templateId) => {
                  const template = PHASE_TEMPLATES.find((t) => t.id === templateId);
                  if (!template) return null;
                  const imagePath = resolvePhaseImagePath(
                    previewJourney,
                    template.id,
                    template.imagePath,
                    imageOverrides[templateId],
                  );
                  const hasOverride = Boolean(imageOverrides[templateId]);
                  return (
                    <li
                      key={templateId}
                      className="flex items-center gap-2 rounded-xl border border-surface-variant bg-surface-container-low p-3"
                    >
                      <img
                        src={imagePath}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover object-top"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-md text-on-surface">{template.title}</p>
                        <p className="text-label-caps text-on-surface-variant">
                          {template.durationDays} days
                          {hasOverride ? ' · custom upload' : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openImageUpload(templateId)}
                        aria-label={`Upload image for ${template.title}`}
                        className="rounded-lg p-1 hover:bg-surface-container"
                      >
                        <Icon name="upload" size={18} />
                      </button>
                      {hasOverride ? (
                        <button
                          type="button"
                          onClick={() => clearImageOverride(templateId)}
                          aria-label={`Reset image for ${template.title}`}
                          className="rounded-lg p-1 hover:bg-surface-container"
                        >
                          <Icon name="restart_alt" size={18} />
                        </button>
                      ) : null}
                      <button type="button" onClick={() => moveTemplate(templateId, -1)} aria-label="Move up">
                        <Icon name="arrow_upward" size={18} />
                      </button>
                      <button type="button" onClick={() => moveTemplate(templateId, 1)} aria-label="Move down">
                        <Icon name="arrow_downward" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleTemplate(templateId)}
                        aria-label="Remove phase"
                      >
                        <Icon name="close" size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {PHASE_TEMPLATES.filter((t) => !selected.includes(t.id)).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => toggleTemplate(template.id)}
                    className="rounded-full bg-secondary-container px-3 py-1 text-label-caps text-on-secondary-container"
                  >
                    + {template.title}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <label className="block">
              <span className="mb-1 block text-body-md text-on-surface">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </label>
          )}

          {step === 3 && draftJourney && (
            <>
              <p className="text-body-md text-on-surface">
                <strong>{draftJourney.name}</strong> starts {formatDisplayDate(startDate)}.
              </p>
              <ul className="mt-4 space-y-2">
                {windows.map((window) => {
                  const template = PHASE_TEMPLATES.find((t) => t.id === window.templateId);
                  const imagePath = template
                    ? resolvePhaseImagePath(
                        draftJourney,
                        template.id,
                        template.imagePath,
                        imageOverrides[template.id],
                      )
                    : undefined;
                  return (
                    <li
                      key={window.templateId}
                      className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3 text-body-md"
                    >
                      {imagePath ? (
                        <img
                          src={imagePath}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-lg object-cover object-top"
                        />
                      ) : null}
                      <div>
                        <p>{template?.title}</p>
                        <p className="text-label-caps text-on-surface-variant">
                          {formatDisplayDate(window.startDate)} – {formatDisplayDate(window.endDate)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-surface-variant p-gutter pb-[env(safe-area-inset-bottom)]">
          {step === 0 && (
            <LoadingButton
              type="button"
              disabled={!name.trim()}
              onClick={() => setStep(1)}
              className="w-full"
            >
              Next
            </LoadingButton>
          )}

          {step === 1 && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(0)} className={backButtonClass}>
                Back
              </button>
              <LoadingButton
                type="button"
                disabled={selected.length === 0}
                onClick={() => setStep(2)}
                className="flex-1"
              >
                Next
              </LoadingButton>
            </div>
          )}

          {step === 2 && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className={backButtonClass}>
                Back
              </button>
              <LoadingButton type="button" onClick={() => setStep(3)} className="flex-1">
                Review
              </LoadingButton>
            </div>
          )}

          {step === 3 && draftJourney && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className={backButtonClass}>
                Back
              </button>
              <LoadingButton type="button" loading={busy} onClick={() => void handleConfirm()} className="flex-1">
                {confirmLabel ?? 'Start Journey'}
              </LoadingButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
