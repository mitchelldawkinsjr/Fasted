import { useEffect, useLayoutEffect, useState } from 'react';
import { useTour, type TourStep } from './TourContext';

type Rect = { x: number; y: number; width: number; height: number };

const PAD = 12;
const MIN_TARGET_SIZE = 32;
const MAX_MEASURE_ATTEMPTS = 40;
const MEASURE_INTERVAL_MS = 50;
/** Matches Layout bottom nav height — backdrop stops above this so nav stays visible. */
const BOTTOM_NAV_INSET = 'calc(4.75rem + env(safe-area-inset-bottom))';

function isNavTarget(selector: string | undefined): boolean {
  return Boolean(selector?.includes('nav-'));
}

function readRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function isStableTarget(el: Element, rect: Rect): boolean {
  if (rect.width < MIN_TARGET_SIZE || rect.height < MIN_TARGET_SIZE) return false;

  const icon = el.querySelector('.material-symbols-outlined');
  if (icon) {
    const iconRect = icon.getBoundingClientRect();
    if (iconRect.width < 12 || iconRect.height < 12) return false;
  }

  const label = el.querySelector('span');
  if (label) {
    const labelRect = label.getBoundingClientRect();
    if (labelRect.width < 8 || labelRect.height < 8) return false;
  }

  return true;
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function useTargetRect(
  selector: string | undefined,
  stepIndex: number,
): { rect: Rect | null; ready: boolean } {
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(() => !selector);

  useLayoutEffect(() => {
    if (!selector) {
      setRect(null);
      setReady(true);
      return;
    }

    setRect(null);
    setReady(false);

    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let retryTimer = 0;

    function applyRect(el: Element) {
      const next = readRect(el);
      setRect(next);
      setReady(true);
    }

    function measure(): Element | null {
      return document.querySelector(selector!);
    }

    function attachObserver(el: Element) {
      observer?.disconnect();
      observer = new ResizeObserver(() => {
        if (cancelled) return;
        const next = readRect(el);
        if (isStableTarget(el, next)) {
          setRect(next);
          setReady(true);
        }
      });
      observer.observe(el);
    }

    async function resolveTarget() {
      try {
        await document.fonts?.ready;
      } catch {
        // Ignore font readiness errors in older browsers.
      }

      for (let attempt = 0; attempt < MAX_MEASURE_ATTEMPTS && !cancelled; attempt++) {
        await waitForPaint();
        const el = measure();
        if (el) {
          const next = readRect(el);
          if (isStableTarget(el, next)) {
            applyRect(el);
            attachObserver(el);
            return;
          }
        }
        await new Promise<void>((resolve) => {
          retryTimer = window.setTimeout(resolve, MEASURE_INTERVAL_MS);
        });
      }

      if (cancelled) return;
      const el = measure();
      if (el) {
        applyRect(el);
        attachObserver(el);
      } else {
        setReady(true);
      }
    }

    void resolveTarget();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      observer?.disconnect();
    };
  }, [selector, stepIndex]);

  return { rect, ready };
}

export function TourOverlay() {
  const { active, currentStep, stepIndex, totalSteps, nextStep, skipTour } = useTour();
  const [vh, setVh] = useState(window.innerHeight);
  const { rect: targetRect, ready: targetReady } = useTargetRect(currentStep?.target, stepIndex);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') skipTour();
      if (e.key === 'Enter' && targetReady) nextStep();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, nextStep, skipTour, targetReady]);

  useEffect(() => {
    function onResize() {
      setVh(window.innerHeight);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!active || !currentStep) return null;

  const isCentered = currentStep.placement === 'center' || !currentStep.target;
  const isLastStep = stepIndex === totalSteps - 1;
  const showTarget = Boolean(currentStep.target && targetReady && targetRect);

  const spotlight: Rect | null =
    showTarget && targetRect
      ? {
          x: targetRect.x - PAD,
          y: targetRect.y - PAD,
          width: targetRect.width + PAD * 2,
          height: targetRect.height + PAD * 2,
        }
      : null;

  let tooltipTop = 0;
  let tooltipBottom: number | undefined;
  const TOOLTIP_MARGIN = 16;

  if (spotlight) {
    const spBottom = spotlight.y + spotlight.height;
    const spaceBelow = vh - spBottom;
    const spaceAbove = spotlight.y;

    if (currentStep.placement === 'top' || spaceAbove > spaceBelow) {
      tooltipBottom = vh - spotlight.y + TOOLTIP_MARGIN;
    } else {
      tooltipTop = spBottom + TOOLTIP_MARGIN;
    }
  }

  const stepNumber = stepIndex + 1;
  const showTooltip = isCentered || showTarget;
  const targetReadyForStep = isCentered || showTarget;
  const navTarget = isNavTarget(currentStep.target);
  const backdropSpotlight = spotlight && !navTarget ? spotlight : null;

  return (
    <>
      {/* Dim layer — excludes bottom nav so the tab bar stays visible during the tour */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[9990]"
        style={{ bottom: BOTTOM_NAV_INSET }}
        aria-hidden
      >
        <svg className="absolute inset-0 h-full w-full">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {backdropSpotlight && (
                <rect
                  x={backdropSpotlight.x}
                  y={backdropSpotlight.y}
                  width={backdropSpotlight.width}
                  height={backdropSpotlight.height}
                  rx={14}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.72)"
            mask={backdropSpotlight ? 'url(#tour-spotlight-mask)' : undefined}
          />
        </svg>
      </div>

      <div
        className="pointer-events-none fixed inset-0 z-[9991]"
        role="dialog"
        aria-modal="true"
        aria-label={currentStep.title}
        aria-busy={Boolean(currentStep.target && !targetReady)}
        data-target-ready={targetReadyForStep ? 'true' : 'false'}
      >
        {spotlight && (
          <div
            className="pointer-events-none absolute rounded-[14px] ring-2 ring-secondary ring-offset-0 transition-opacity duration-200"
            style={{
              left: spotlight.x,
              top: spotlight.y,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: '0 0 0 4px rgba(254,214,91,0.25)',
            }}
            aria-hidden
          />
        )}

        {showTooltip &&
          (isCentered ? (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-surface p-8 grace-shadow animate-fade-in-up">
                <TourCard
                  step={currentStep}
                  stepNumber={stepNumber}
                  totalSteps={totalSteps}
                  isLastStep={isLastStep}
                  onNext={nextStep}
                  onSkip={skipTour}
                />
              </div>
            </div>
          ) : (
            <div
              className="pointer-events-auto absolute left-4 right-4 mx-auto max-w-sm rounded-2xl bg-surface p-5 grace-shadow animate-fade-in-up"
              style={{
                ...(tooltipBottom !== undefined ? { bottom: tooltipBottom } : { top: tooltipTop }),
              }}
            >
              {spotlight && tooltipBottom === undefined && (
                <div
                  className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-surface"
                  aria-hidden
                />
              )}
              {spotlight && tooltipBottom !== undefined && (
                <div
                  className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-surface"
                  aria-hidden
                />
              )}
              <TourCard
                step={currentStep}
                stepNumber={stepNumber}
                totalSteps={totalSteps}
                isLastStep={isLastStep}
                onNext={nextStep}
                onSkip={skipTour}
              />
            </div>
          ))}
      </div>
    </>
  );
}

type CardProps = {
  step: Pick<TourStep, 'title' | 'body' | 'nextLabel'>;
  stepNumber: number;
  totalSteps: number;
  isLastStep: boolean;
  onNext: () => void;
  onSkip: () => void;
};

function TourCard({ step, stepNumber, totalSteps, isLastStep, onNext, onSkip }: CardProps) {
  return (
    <>
      <div
        className="mb-4 flex items-center gap-1.5"
        aria-label={`Step ${stepNumber} of ${totalSteps}`}
      >
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === stepNumber - 1
                ? 'w-5 bg-secondary'
                : i < stepNumber - 1
                  ? 'w-1.5 bg-secondary/40'
                  : 'w-1.5 bg-outline/30'
            }`}
          />
        ))}
      </div>

      <h2 className="font-display text-headline-md text-primary">{step.title}</h2>
      <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">{step.body}</p>

      <div className="mt-6 flex items-center justify-between gap-3">
        {!isLastStep && (
          <button
            type="button"
            onClick={onSkip}
            className="text-body-md text-on-surface-variant underline-offset-2 hover:underline"
          >
            Skip tour
          </button>
        )}
        <button type="button" onClick={onNext} className="btn-stitch-primary ml-auto" autoFocus>
          {step.nextLabel ?? (isLastStep ? 'Done' : 'Next')}
        </button>
      </div>
    </>
  );
}
