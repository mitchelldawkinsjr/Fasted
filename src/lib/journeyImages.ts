import { FASTED_JOURNEY } from '../data/phaseTemplates';
import { CUSTOM_JOURNEY_IMAGES } from '../data/customJourneyImages';
import type { Journey } from '../types';

const CUSTOM_PHASE_FALLBACK_IMAGES = Object.values(CUSTOM_JOURNEY_IMAGES);

export function isDefaultFastedJourney(journey: Journey): boolean {
  return Boolean(journey.locked || journey.isDefault || journey.id === FASTED_JOURNEY.id);
}

/** Resolve the hero/thumbnail image for a phase within a journey. */
export function resolvePhaseImagePath(
  journey: Journey,
  templateId: string,
  templateImagePath: string,
): string {
  if (isDefaultFastedJourney(journey)) {
    return templateImagePath;
  }

  return CUSTOM_JOURNEY_IMAGES[templateId] ?? templateImagePath;
}

export function resolveCustomPhaseImagePath(order: number): string {
  return CUSTOM_PHASE_FALLBACK_IMAGES[order % CUSTOM_PHASE_FALLBACK_IMAGES.length] ?? '/assets/fasting-plan-all-phases.png';
}
