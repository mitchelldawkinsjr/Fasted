import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTour, type TourStep } from './TourContext';

type Rect = { x: number; y: number; width: number; height: number };

const PAD = 12;

function useTargetRect(selector: string | undefined, stepIndex: number): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number>(0);

  useLayoutEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    function measure() {
      const el = document.querySelector(selector!);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ x: r.x, y: r.y, width: r.width, height: r.height });
    }

    measure();
    rafRef.current = requestAnimationFrame(measure);

    return () => cancelAnimationFrame(rafRef.current);
  }, [selector, stepIndex]);

  return rect;
}

export function TourOverlay() {
  const { active, currentStep, stepIndex, totalSteps, nextStep, skipTour } = useTour();
  const [vh, setVh] = useState(window.innerHeight);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') skipTour();
      if (e.key === 'Enter') nextStep();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, nextStep, skipTour]);

  useEffect(() => {
    function onResize() {
      setVh(window.innerHeight);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const targetRect = useTargetRect(currentStep?.target, stepIndex);

  if (!active || !currentStep) return null;

  const isCentered = currentStep.placement === 'center' || !currentStep.target;
  const isLastStep = stepIndex === totalSteps - 1;

  const spotlight: Rect | null = targetRect
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

  return (
    <div
      className="fixed inset-0 z-[9990]"
      role="dialog"
      aria-modal="true"
      aria-label={currentStep.title}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 9990 }}
        aria-hidden
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.x}
                y={spotlight.y}
                width={spotlight.width}
                height={spotlight.height}
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
          mask={spotlight ? 'url(#tour-spotlight-mask)' : undefined}
        />
      </svg>

      {spotlight && (
        <div
          className="pointer-events-none absolute rounded-[14px] ring-2 ring-secondary ring-offset-0"
          style={{
            left: spotlight.x,
            top: spotlight.y,
            width: spotlight.width,
            height: spotlight.height,
            zIndex: 9991,
            boxShadow: '0 0 0 4px rgba(254,214,91,0.25)',
          }}
          aria-hidden
        />
      )}

      {isCentered ? (
        <div
          className="absolute inset-0 flex items-center justify-center px-6"
          style={{ zIndex: 9992 }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface p-8 grace-shadow animate-fade-in-up">
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
          className="absolute left-4 right-4 mx-auto max-w-sm rounded-2xl bg-surface p-5 grace-shadow animate-fade-in-up"
          style={{
            zIndex: 9992,
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
      )}
    </div>
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
