import { FASTED_JOURNEY, getTemplateById } from '../data/phaseTemplates';
import { customPhaseToTemplate, generateScheduleSummary, withGeneratedScheduleSummary } from './customPhaseContent';
import { isDefaultFastedJourney, resolveCustomPhaseImagePath, resolvePhaseImagePath } from './journeyImages';
import type {
  CustomJourneyPhase,
  FastPhase,
  Journey,
  JourneyPhase,
  TemplateJourneyPhase,
  UserProgress,
} from '../types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isTemplateJourneyPhase(phase: JourneyPhase): phase is TemplateJourneyPhase {
  return Boolean(phase && typeof phase === 'object' && 'templateId' in phase);
}

export function isCustomJourneyPhase(phase: JourneyPhase): phase is CustomJourneyPhase {
  return Boolean(phase && typeof phase === 'object' && 'content' in phase);
}

function isValidTemplateJourneyPhase(phase: JourneyPhase): boolean {
  return (
    isTemplateJourneyPhase(phase) &&
    typeof phase.templateId === 'string' &&
    phase.templateId.length > 0 &&
    typeof phase.order === 'number' &&
    Boolean(getTemplateById(phase.templateId))
  );
}

function isValidCustomJourneyPhase(phase: JourneyPhase): boolean {
  return Boolean(
    isCustomJourneyPhase(phase) &&
      typeof phase.order === 'number' &&
      typeof phase.startDate === 'string' &&
      DATE_RE.test(phase.startDate) &&
      typeof phase.endDate === 'string' &&
      DATE_RE.test(phase.endDate) &&
      phase.startDate <= phase.endDate &&
      typeof phase.content?.title === 'string' &&
      phase.content.title.trim().length > 0 &&
      phase.content.schedulePattern &&
      Array.isArray(phase.content.prayerFocus) &&
      phase.content.prayerFocus.some((focus) => focus.trim().length > 0),
  );
}

function isValidJourneyPhase(phase: JourneyPhase): boolean {
  return isValidTemplateJourneyPhase(phase) || isValidCustomJourneyPhase(phase);
}

function hasContiguousWindows(journey: Journey): boolean {
  const windows = getJourneyPhaseWindows(journey);
  if (windows.length !== journey.phases.length) return false;
  if (windows[0]?.startDate !== journey.startDate) return false;

  for (let index = 1; index < windows.length; index += 1) {
    if (windows[index].startDate !== addDays(windows[index - 1].endDate, 1)) {
      return false;
    }
  }
  return true;
}

export function isValidJourney(journey: Journey | undefined | null): journey is Journey {
  return Boolean(
    journey?.id &&
      typeof journey.name === 'string' &&
      journey.name.length > 0 &&
      typeof journey.startDate === 'string' &&
      DATE_RE.test(journey.startDate) &&
      Array.isArray(journey.phases) &&
      journey.phases.length > 0 &&
      journey.phases.every(isValidJourneyPhase) &&
      hasContiguousWindows(journey),
  );
}

export function normalizeJourneys(
  journeys: Journey[] | undefined,
  activeJourneyId?: string,
): Pick<UserProgress, 'journeys' | 'activeJourneyId'> {
  const valid = (journeys ?? []).filter(isValidJourney).map(normalizeJourney);
  const normalized = valid.length > 0 ? valid : [FASTED_JOURNEY];
  const activeId =
    activeJourneyId && normalized.some((j) => j.id === activeJourneyId)
      ? activeJourneyId
      : normalized[0].id;
  return { journeys: normalized, activeJourneyId: activeId };
}

function addDays(dateStr: string, count: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + count);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function dateSpanDays(startDate: string, endDate: string): number {
  const [startY, startM, startD] = startDate.split('-').map(Number);
  const [endY, endM, endD] = endDate.split('-').map(Number);
  const start = new Date(startY, startM - 1, startD).getTime();
  const end = new Date(endY, endM - 1, endD).getTime();
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export type PhaseWindow = {
  phaseId: number;
  templateId?: string;
  legacyId?: number;
  order: number;
  startDate: string;
  endDate: string;
  phase: JourneyPhase;
};

export type PhaseContext = {
  phaseId: number;
  templateId?: string;
  legacyId?: number;
  template: NonNullable<ReturnType<typeof getTemplateById>>;
  startDate: string;
  endDate: string;
  phase: JourneyPhase;
  isCustom: boolean;
};

export function getActiveJourney(progress: UserProgress): Journey {
  const { journeys, activeJourneyId } = normalizeJourneys(progress.journeys, progress.activeJourneyId);
  const found = journeys.find((j) => j.id === activeJourneyId);
  return found ?? journeys[0] ?? FASTED_JOURNEY;
}

export function getJourneyPhaseWindows(journey: Journey): PhaseWindow[] {
  const sorted = [...journey.phases].sort((a, b) => a.order - b.order);
  let cursor = journey.startDate;
  const windows: PhaseWindow[] = [];

  for (const phase of sorted) {
    if (isCustomJourneyPhase(phase)) {
      windows.push({
        phaseId: phase.order + 1,
        order: phase.order,
        startDate: phase.startDate,
        endDate: phase.endDate,
        phase,
      });
      cursor = addDays(phase.endDate, 1);
      continue;
    }

    const template = getTemplateById(phase.templateId);
    if (!template) continue;

    const startDate = cursor;
    const endDate = addDays(cursor, template.durationDays - 1);
    windows.push({
      phaseId: isDefaultFastedJourney(journey) ? template.legacyId : phase.order + 1,
      templateId: template.id,
      legacyId: template.legacyId,
      order: phase.order,
      startDate,
      endDate,
      phase,
    });
    cursor = addDays(endDate, 1);
  }

  return windows;
}

export function getJourneyPlanEnd(journey: Journey): string {
  const windows = getJourneyPhaseWindows(journey);
  return windows.length > 0 ? windows[windows.length - 1].endDate : journey.startDate;
}

export function getPhaseContextForDate(date: string, journey: Journey): PhaseContext | null {
  const window = getJourneyPhaseWindows(journey).find(
    (w) => date >= w.startDate && date <= w.endDate,
  );
  if (!window) return null;

  const template = isCustomJourneyPhase(window.phase)
    ? customPhaseToTemplate(
        withGeneratedScheduleSummary(window.phase.content),
        dateSpanDays(window.startDate, window.endDate),
        window.order,
      )
    : window.templateId
      ? getTemplateById(window.templateId)
      : undefined;
  if (!template) return null;

  return {
    phaseId: window.phaseId,
    templateId: window.templateId,
    legacyId: window.legacyId,
    template,
    startDate: window.startDate,
    endDate: window.endDate,
    phase: window.phase,
    isCustom: isCustomJourneyPhase(window.phase),
  };
}

export function getPhasesForJourney(journey: Journey): FastPhase[] {
  return getJourneyPhaseWindows(journey).flatMap((window) => {
    const template = isCustomJourneyPhase(window.phase)
      ? customPhaseToTemplate(
          withGeneratedScheduleSummary(window.phase.content),
          dateSpanDays(window.startDate, window.endDate),
          window.order,
        )
      : window.templateId
        ? getTemplateById(window.templateId)
        : undefined;
    if (!template) return [];
    return [
      {
        id: window.phaseId,
        legacyId: window.legacyId,
        templateId: window.templateId,
        title: template.title,
        startDate: window.startDate,
        endDate: window.endDate,
        themeColor: template.themeColor,
        scriptureReference: template.scriptureReference,
        scriptureTextNLT: template.scriptureTextNLT,
        scheduleSummary: template.scheduleSummary,
        allowed: template.allowed,
        avoid: template.avoid,
        dailyReadings: template.dailyReadings,
        prayerFocus: template.prayerFocus,
        imagePath: window.templateId
          ? resolvePhaseImagePath(journey, window.templateId, template.imagePath)
          : resolveCustomPhaseImagePath(window.order),
        safetyNote: template.safetyNote,
        isCustom: isCustomJourneyPhase(window.phase),
      },
    ];
  });
}

export function normalizeCustomPhaseContent(phase: CustomJourneyPhase): CustomJourneyPhase {
  return {
    ...phase,
    content: withGeneratedScheduleSummary(phase.content),
  };
}

export function normalizeJourneyPhase(phase: JourneyPhase): JourneyPhase {
  return isCustomJourneyPhase(phase) ? normalizeCustomPhaseContent(phase) : phase;
}

export function normalizeJourney(journey: Journey): Journey {
  return {
    ...journey,
    phases: journey.phases.map(normalizeJourneyPhase),
  };
}

export { generateScheduleSummary };

export function getAllJourneyDates(journey: Journey): string[] {
  const end = getJourneyPlanEnd(journey);
  const dates: string[] = [];
  let current = journey.startDate;

  while (current <= end) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

export function isDateInJourney(date: string, journey: Journey): boolean {
  return date >= journey.startDate && date <= getJourneyPlanEnd(journey);
}

export function clampToJourneyDate(date: string, journey: Journey): string {
  if (!date) return journey.startDate;
  if (date < journey.startDate) return journey.startDate;
  const end = getJourneyPlanEnd(journey);
  if (date > end) return end;
  return date;
}
