import { FASTED_JOURNEY } from '../data/phaseTemplates';
import { getCustomJourneyImagePath } from '../data/customJourneyImages';
import type { Journey } from '../types';

export const MAX_JOURNEY_IMAGE_BYTES = 3 * 1024 * 1024;

export const ALLOWED_JOURNEY_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export function isDefaultFastedJourney(journey: Journey): boolean {
  return Boolean(journey.locked || journey.isDefault || journey.id === FASTED_JOURNEY.id);
}

/** Resolve the hero/thumbnail image for a phase within a journey. */
export function resolvePhaseImagePath(
  journey: Journey,
  templateId: string,
  templateImagePath: string,
  phaseImageOverride?: string,
): string {
  if (isDefaultFastedJourney(journey)) {
    return templateImagePath;
  }

  if (phaseImageOverride) {
    return phaseImageOverride;
  }

  return getCustomJourneyImagePath(templateId) ?? templateImagePath;
}

export type JourneyImageValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateJourneyImageFile(file: File): JourneyImageValidationResult {
  if (!ALLOWED_JOURNEY_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_JOURNEY_IMAGE_TYPES)[number])) {
    return {
      ok: false,
      message: 'Use a JPEG, PNG, WebP, or GIF image.',
    };
  }

  if (file.size > MAX_JOURNEY_IMAGE_BYTES) {
    return {
      ok: false,
      message: 'Image must be 3 MB or smaller.',
    };
  }

  return { ok: true };
}

export function readJourneyImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read image file.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}
