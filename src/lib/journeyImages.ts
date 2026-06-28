import { FASTED_JOURNEY } from '../data/phaseTemplates';
import { CUSTOM_JOURNEY_IMAGES } from '../data/customJourneyImages';
import type { Journey } from '../types';

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
