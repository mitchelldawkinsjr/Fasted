import { getPhasesForJourney } from '../lib/journey';
import { resolveJourney } from '../lib/dateUtils';
import type { FastPhase, Journey } from '../types';

export { FASTED_JOURNEY, PHASE_TEMPLATES, getTemplateById } from './phaseTemplates';

export function getPhases(journey?: Journey): FastPhase[] {
  return getPhasesForJourney(resolveJourney(journey));
}

export function getPhaseById(id: number, journey?: Journey): FastPhase | undefined {
  return getPhases(journey).find((p) => p.id === id);
}

export function getPhaseForDate(date: string, journey?: Journey): FastPhase | undefined {
  return getPhases(journey).find((p) => date >= p.startDate && date <= p.endDate);
}
