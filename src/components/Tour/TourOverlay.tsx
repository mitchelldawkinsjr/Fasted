import { useEffect, useLayoutEffect, useState } from 'react';
import { useTour, type TourStep } from './TourContext';

type Rect = { x: number; y: number; width: number; height: number };

const PAD = 12;
const MIN_TARGET_SIZE = 32;
const MAX_MEASURE_ATTEMPTS = 40;
const MEASURE_INTERVAL_MS = 50;
/** Matches Layout bottom nav height — backdrop stops above this so nav stays visible. */
export const TOUR_BOTTOM_NAV_INSET = 'calc(4.75rem + env(safe-area-inset-bottom))';
const TOUR_NAV_TOOLTIP_GAP_PX = 12;
const TOUR_POINTER_SIZE_PX = 12;

export function isNavTourTarget(selector: string | undefined): boolean {
  return Boolean(selector?.includes('nav-'));
}

function readRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function hasMinimumTargetSize(rect: Rect): boolean {
  if (rect.width >= MIN_TARGET_SIZE && rect.height >= MIN_TARGET_SIZE) return true;
  // Wide strips (e.g. calendar legend) or tall narrow targets still qualify.
  return Math.max(rect.width, rect.height) >= 120 && Math.min(rect.width, rect.height) >= 12;
}

function isStableTarget(el: Element, rect: Rect, selector?: string): boolean {
  if (!hasMinimumTargetSize(rect)) return false;

  if (!isNavTourTarget(selector)) return true;

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

/** Visible viewport between fixed header and bottom nav (matches Layout.tsx). */
const TOUR_HEADER_OFFSET_PX = 72;
const TOUR_NAV_OFFSET_PX = 76;
const TOOLTIP_MARGIN_PX = 16;
/** Minimum vertical space needed to place the tooltip beside the target. */
const TOOLTIP_MIN_HEIGHT_PX = 180;

type TooltipPlacement = {
  top?: number;
  bottom?: string;
  dockedAboveNav: boolean;
  pointerAbove: boolean;
};

function computeTooltipPlacement(
  spotlight: Rect,
  placement: TourStep['placement'],
  vh: number,
): TooltipPlacement {
  const safeTop = TOUR_HEADER_OFFSET_PX;
  const safeBottom = vh - TOUR_NAV_OFFSET_PX;
  const spTop = spotlight.y;
  const spBottom = spotlight.y + spotlight.height;
  const spaceAbove = spTop - safeTop - TOOLTIP_MARGIN_PX;
  const spaceBelow = safeBottom - spBottom - TOOLTIP_MARGIN_PX;

  const canFitAbove = spaceAbove >= TOOLTIP_MIN_HEIGHT_PX;
  const canFitBelow = spaceBelow >= TOOLTIP_MIN_HEIGHT_PX;

  if (placement === 'top' && canFitAbove) {
    return {
      bottom: `${vh - spTop + TOOLTIP_MARGIN_PX}px`,
      dockedAboveNav: false,
      pointerAbove: false,
    };
  }
  if (placement === 'bottom' && canFitBelow) {
    const top = Math.min(spBottom + TOOLTIP_MARGIN_PX, safeBottom - TOOLTIP_MIN_HEIGHT_PX);
    return { top, dockedAboveNav: false, pointerAbove: true };
  }
  if (canFitAbove) {
    return {
      bottom: `${vh - spTop + TOOLTIP_MARGIN_PX}px`,
      dockedAboveNav: false,
      pointerAbove: false,
    };
  }
  if (canFitBelow) {
    const top = Math.min(spBottom + TOOLTIP_MARGIN_PX, safeBottom - TOOLTIP_MIN_HEIGHT_PX);
    return { top, dockedAboveNav: false, pointerAbove: true };
  }

  return {
    bottom: `calc(4.75rem + env(safe-area-inset-bottom) + 1rem)`,
    dockedAboveNav: true,
    pointerAbove: false,
  };
}

function useNavTop(active: boolean, navTarget: boolean, stepIndex: number): number | null {
  const [navTop, setNavTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!active || !navTarget) {
      setNavTop(null);
      return;
    }

    function measure() {
      const nav = document.querySelector('nav[aria-label="Main navigation"]');
      setNavTop(nav ? nav.getBoundingClientRect().top : null);
    }

    measure();
    window.addEventListener('resize', measure);
    const nav = document.querySelector('nav[aria-label="Main navigation"]');
    const observer = nav ? new ResizeObserver(measure) : null;
    observer?.observe(nav!);

    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [active, navTarget, stepIndex]);

  return navTop;
}

function getNavPointerLeft(targetRect: Rect, tooltipLeft: number, tooltipWidth: number): number {
  const raw = targetRect.x + targetRect.width / 2 - tooltipLeft - TOUR_POINTER_SIZE_PX / 2;
  const min = 16;
  const max = tooltipWidth - 16 - TOUR_POINTER_SIZE_PX;
  return Math.min(Math.max(min, raw), max);
}

function scrollTargetToVisibleCenter(el: Element): void {
  const rect = el.getBoundingClientRect();
  const visibleTop = TOUR_HEADER_OFFSET_PX;
  const visibleBottom = window.innerHeight - TOUR_NAV_OFFSET_PX;
  const visibleCenter = visibleTop + (visibleBottom - visibleTop) / 2;
  const elementCenter = rect.top + rect.height / 2;
  const delta = elementCenter - visibleCenter;

  if (Math.abs(delta) < 8) return;

  window.scrollBy({ top: delta, behavior: 'instant' });
}

function scrollForTourTarget(el: Element, selector: string | undefined, scroll: TourStep['scroll']): void {
  if (isNavTourTarget(selector)) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  if (scroll === 'center') {
    scrollTargetToVisibleCenter(el);
  }
}

function useTargetRect(
  selector: string | undefined,
  stepIndex: number,
  scroll: TourStep['scroll'],
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
    let scrolled = false;

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
        if (isStableTarget(el, next, selector)) {
          setRect(next);
          setReady(true);
        }
      });
      observer.observe(el);
    }

    async function resolveTarget() {
      const needsFontReady = isNavTourTarget(selector);

      if (needsFontReady) {
        try {
          await document.fonts?.ready;
        } catch {
          // Ignore font readiness errors in older browsers.
        }
      }

      for (let attempt = 0; attempt < MAX_MEASURE_ATTEMPTS && !cancelled; attempt++) {
        await waitForPaint();
        const el = measure();
        if (el) {
          if (!scrolled) {
            scrollForTourTarget(el, selector, scroll);
            scrolled = true;
            await waitForPaint();
          }
          const next = readRect(el);
          if (isStableTarget(el, next, selector)) {
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
        if (!scrolled) {
          scrollForTourTarget(el, selector, scroll);
          await waitForPaint();
        }
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
  }, [selector, stepIndex, scroll]);

  return { rect, ready };
}

export function TourOverlay() {
  const { active, currentStep, stepIndex, totalSteps, nextStep, prevStep, skipTour } = useTour();
  const [vh, setVh] = useState(window.innerHeight);
  const { rect: targetRect, ready: targetReady } = useTargetRect(
    currentStep?.target,
    stepIndex,
    currentStep?.scroll,
  );
  const navTargetActive = Boolean(active && currentStep && isNavTourTarget(currentStep.target));
  const navTop = useNavTop(active, navTargetActive, stepIndex);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') skipTour();
      if (e.key === 'Enter' && targetReady) nextStep();
      if (e.key === 'ArrowLeft' && stepIndex > 0) prevStep();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, nextStep, prevStep, skipTour, targetReady, stepIndex]);

  useEffect(() => {
    function onResize() {
      setVh(window.innerHeight);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!active || !currentStep) return null;

  const targetMissing = Boolean(currentStep.target && targetReady && !targetRect);
  const isCentered =
    currentStep.placement === 'center' || !currentStep.target || targetMissing;
  const isLastStep = stepIndex === totalSteps - 1;
  const showTarget = Boolean(currentStep.target && targetReady && targetRect && !targetMissing);

  const spotlight: Rect | null =
    showTarget && targetRect
      ? {
          x: targetRect.x - PAD,
          y: targetRect.y - PAD,
          width: targetRect.width + PAD * 2,
          height: targetRect.height + PAD * 2,
        }
      : null;

  const stepNumber = stepIndex + 1;
  const showTooltip = isCentered || showTarget;
  const targetReadyForStep = isCentered || showTarget;
  const navTarget = isNavTourTarget(currentStep.target);
  const backdropSpotlight = spotlight;

  const tooltipPlacement =
    spotlight && !navTarget
      ? computeTooltipPlacement(spotlight, currentStep.placement, vh)
      : null;

  const tooltipSideInsetPx = 16;
  const tooltipWidth = Math.min(384, window.innerWidth - tooltipSideInsetPx * 2);
  const navPointerLeft =
    navTarget && targetRect
      ? getNavPointerLeft(targetRect, tooltipSideInsetPx, tooltipWidth)
      : null;

  const tooltipStyle = navTarget
    ? undefined
    : tooltipPlacement?.dockedAboveNav
      ? { bottom: tooltipPlacement.bottom }
      : tooltipPlacement?.bottom !== undefined
        ? { bottom: tooltipPlacement.bottom }
        : tooltipPlacement?.top !== undefined
          ? { top: tooltipPlacement.top }
          : undefined;

  const showPointerBelow =
    Boolean(spotlight && !navTarget && tooltipPlacement && !tooltipPlacement.dockedAboveNav && tooltipPlacement.top !== undefined);
  const showPointerAbove =
    Boolean(
      !navTarget &&
        spotlight &&
        tooltipPlacement &&
        (tooltipPlacement.dockedAboveNav || tooltipPlacement.bottom !== undefined),
    );
  const showNavPointer = Boolean(navTarget && targetRect && navPointerLeft !== null);

  return (
    <>
      {/* Dim layer — full viewport; mask cutout reveals the highlighted target (including nav tabs). */}
      <div className="pointer-events-none fixed inset-0 z-[9990]" aria-hidden>
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

      {spotlight && (
        <div
          className="pointer-events-none fixed z-[9994] rounded-[14px] ring-2 ring-secondary ring-offset-0 transition-opacity duration-200"
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
          <div
            className="fixed inset-x-0 top-0 z-[9995] flex items-center justify-center px-6"
            style={{ bottom: TOUR_BOTTOM_NAV_INSET }}
            role="dialog"
            aria-modal="true"
            data-tour-dialog
            aria-label={currentStep.title}
            aria-busy={Boolean(currentStep.target && !targetReady)}
            data-target-ready={targetReadyForStep ? 'true' : 'false'}
          >
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-surface p-8 grace-shadow animate-fade-in-up">
              <TourCard
                step={currentStep}
                stepNumber={stepNumber}
                totalSteps={totalSteps}
                isLastStep={isLastStep}
                canGoBack={stepIndex > 0}
                onNext={nextStep}
                onBack={prevStep}
                onSkip={skipTour}
              />
            </div>
          </div>
        ) : navTarget ? (
          <div
            className="pointer-events-none fixed inset-x-0 z-[9995] flex flex-col justify-end px-4"
            style={{
              top: TOUR_HEADER_OFFSET_PX,
              bottom: navTop !== null ? vh - navTop : TOUR_BOTTOM_NAV_INSET,
              paddingBottom: TOUR_NAV_TOOLTIP_GAP_PX,
            }}
          >
            <div
              className="pointer-events-auto relative mx-auto w-full max-w-sm rounded-2xl bg-surface p-5 grace-shadow animate-fade-in-up"
              role="dialog"
              aria-modal="true"
              data-tour-dialog
              aria-label={currentStep.title}
              aria-busy={Boolean(currentStep.target && !targetReady)}
              data-target-ready={targetReadyForStep ? 'true' : 'false'}
              style={{
                maxHeight: `calc(100vh - ${TOUR_HEADER_OFFSET_PX}px - ${TOUR_BOTTOM_NAV_INSET} - ${TOUR_NAV_TOOLTIP_GAP_PX}px - 1rem)`,
              }}
            >
              {showNavPointer && (
                <div
                  className="absolute -bottom-2 h-3 w-3 rotate-45 bg-surface"
                  style={{ left: navPointerLeft! }}
                  aria-hidden
                />
              )}
              <TourCard
                step={currentStep}
                stepNumber={stepNumber}
                totalSteps={totalSteps}
                isLastStep={isLastStep}
                canGoBack={stepIndex > 0}
                onNext={nextStep}
                onBack={prevStep}
                onSkip={skipTour}
              />
            </div>
          </div>
        ) : (
          <div
            className="pointer-events-auto fixed left-4 right-4 z-[9995] mx-auto max-w-sm rounded-2xl bg-surface p-5 grace-shadow animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            data-tour-dialog
            aria-label={currentStep.title}
            aria-busy={Boolean(currentStep.target && !targetReady)}
            data-target-ready={targetReadyForStep ? 'true' : 'false'}
            style={{
              maxHeight: `calc(100vh - ${TOUR_HEADER_OFFSET_PX}px - ${TOUR_BOTTOM_NAV_INSET} - 1rem)`,
              ...tooltipStyle,
            }}
          >
            {showPointerBelow && (
              <div
                className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-surface"
                aria-hidden
              />
            )}
            {showPointerAbove && (
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
              canGoBack={stepIndex > 0}
              onNext={nextStep}
              onBack={prevStep}
              onSkip={skipTour}
            />
          </div>
        ))}
    </>
  );
}

type CardProps = {
  step: Pick<TourStep, 'title' | 'body' | 'nextLabel'>;
  stepNumber: number;
  totalSteps: number;
  isLastStep: boolean;
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
};

function TourCard({
  step,
  stepNumber,
  totalSteps,
  isLastStep,
  canGoBack,
  onNext,
  onBack,
  onSkip,
}: CardProps) {
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
        <div className="flex items-center gap-3">
          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-body-md text-on-surface-variant underline-offset-2 hover:underline"
            >
              Back
            </button>
          )}
          {!isLastStep && (
            <button
              type="button"
              onClick={onSkip}
              className="text-body-md text-on-surface-variant underline-offset-2 hover:underline"
            >
              Skip tour
            </button>
          )}
        </div>
        <button type="button" onClick={onNext} className="btn-stitch-primary" autoFocus>
          {step.nextLabel ?? (isLastStep ? 'Done' : 'Next')}
        </button>
      </div>
    </>
  );
}
