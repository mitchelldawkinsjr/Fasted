import { FASTED_JOURNEY } from './phaseTemplates';
import { getPhaseContextForDate, getPhasesForJourney, getJourneyPlanEnd } from '../lib/journey';
import { resolvePhaseImagePath } from '../lib/journeyImages';
import type { FastPhase, Journey } from '../types';
import { getProgress } from '../lib/storage';
import { getActiveJourney } from '../lib/journey';

export { FASTED_JOURNEY, PHASE_TEMPLATES, getTemplateById, getTemplateByLegacyId } from './phaseTemplates';

export const PLAN_START = FASTED_JOURNEY.startDate;
export const PLAN_END = getJourneyPlanEnd(FASTED_JOURNEY);

export const FAST_PHASES: FastPhase[] = getPhasesForJourney(FASTED_JOURNEY);

function resolveJourney(journey?: Journey): Journey {
  if (journey) return journey;
  try {
    return getActiveJourney(getProgress());
  } catch {
    return FASTED_JOURNEY;
  }
}

export function getPhases(journey?: Journey): FastPhase[] {
  return getPhasesForJourney(resolveJourney(journey));
}

export function getPhaseById(id: number, journey?: Journey): FastPhase | undefined {
  return getPhases(journey).find((p) => p.id === id);
}

export function getPhaseForDate(date: string, journey?: Journey): FastPhase | undefined {
  const resolved = resolveJourney(journey);
  const ctx = getPhaseContextForDate(date, resolved);
  if (!ctx) return undefined;
  const phaseOverride = resolved.phases.find((phase) => phase.templateId === ctx.templateId)?.imagePath;
  return {
    id: ctx.legacyId,
    templateId: ctx.templateId,
    title: ctx.template.title,
    startDate: ctx.startDate,
    endDate: ctx.endDate,
    themeColor: ctx.template.themeColor,
    scriptureReference: ctx.template.scriptureReference,
    scriptureTextNLT: ctx.template.scriptureTextNLT,
    scheduleSummary: ctx.template.scheduleSummary,
    allowed: ctx.template.allowed,
    avoid: ctx.template.avoid,
    dailyReadings: ctx.template.dailyReadings,
    prayerFocus: ctx.template.prayerFocus,
    imagePath: resolvePhaseImagePath(
      resolved,
      ctx.templateId,
      ctx.template.imagePath,
      phaseOverride,
    ),
    safetyNote: ctx.template.safetyNote,
  };
}
