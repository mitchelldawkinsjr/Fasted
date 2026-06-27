import { FASTED_JOURNEY, getTemplateById } from '../data/phaseTemplates';
import type { FastPhase, Journey, UserProgress } from '../types';

function addDays(dateStr: string, count: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + count);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export type PhaseWindow = {
  templateId: string;
  legacyId: number;
  order: number;
  startDate: string;
  endDate: string;
};

export type PhaseContext = {
  templateId: string;
  legacyId: number;
  template: NonNullable<ReturnType<typeof getTemplateById>>;
  startDate: string;
  endDate: string;
};

export function getActiveJourney(progress: UserProgress): Journey {
  const found = progress.journeys.find((j) => j.id === progress.activeJourneyId);
  return found ?? progress.journeys[0] ?? FASTED_JOURNEY;
}

export function getJourneyPhaseWindows(journey: Journey): PhaseWindow[] {
  const sorted = [...journey.phases].sort((a, b) => a.order - b.order);
  let cursor = journey.startDate;
  const windows: PhaseWindow[] = [];

  for (const phase of sorted) {
    const template = getTemplateById(phase.templateId);
    if (!template) continue;

    const startDate = cursor;
    const endDate = addDays(cursor, template.durationDays - 1);
    windows.push({
      templateId: template.id,
      legacyId: template.legacyId,
      order: phase.order,
      startDate,
      endDate,
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

  const template = getTemplateById(window.templateId);
  if (!template) return null;

  return {
    templateId: window.templateId,
    legacyId: window.legacyId,
    template,
    startDate: window.startDate,
    endDate: window.endDate,
  };
}

export function getPhasesForJourney(journey: Journey): FastPhase[] {
  return getJourneyPhaseWindows(journey).flatMap((window) => {
    const template = getTemplateById(window.templateId);
    if (!template) return [];
    return [
      {
        id: template.legacyId,
        templateId: template.id,
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
        imagePath: template.imagePath,
        safetyNote: template.safetyNote,
      },
    ];
  });
}

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
