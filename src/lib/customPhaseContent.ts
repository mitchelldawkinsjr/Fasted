import type { CustomPhaseContent, FastPhaseTemplate, FastType, SchedulePattern } from '../types';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function listItems(items: string[] | undefined): string {
  return (items ?? []).map((item) => item.trim()).filter(Boolean).join(', ');
}

function sentence(label: string, items: string[] | undefined): string | null {
  const text = listItems(items);
  return text ? `${label}: ${text}.` : null;
}

function weekdays(days: number[]): string {
  if (days.length === 0) return 'no food fast days';
  return days.map((day) => WEEKDAYS[day] ?? `Day ${day}`).join(' and ');
}

function fastTypeLabel(fastType: FastType): string {
  switch (fastType) {
    case 'sunrise-to-sunset-water':
      return 'sunrise to sunset fast (water only)';
    case 'sunrise-to-sunset-with-coffee-tea':
      return 'sunrise to sunset fast (water, coffee, and tea)';
    case 'daniel-fast':
      return 'Daniel fast';
    case 'twenty-four-hour-water':
      return '24-hour water fast';
    case 'extended-prayer':
      return 'extended prayer';
    case 'normal-eating':
      return 'normal eating';
  }
}

export function describeSchedulePattern(pattern: SchedulePattern): string {
  switch (pattern.kind) {
    case 'normal-eating':
      return 'Normal eating for the whole phase.';
    case 'weekday-fast':
      return `${weekdays(pattern.fastDays)}: ${fastTypeLabel(pattern.fastType)}.`;
    case 'consecutive-daniel':
      return `${pattern.includesWalk ? 'Daniel fast with a daily walk' : 'Daniel fast'} for the whole phase.`;
    case 'weekday-with-prayer':
      return `${weekdays(pattern.fastDays)}: ${fastTypeLabel(pattern.fastType)}. ${weekdays(
        pattern.prayerDays,
      )}: extended prayer.`;
    case 'rotating-weekly':
      return pattern.weeks.length
        ? `Rotating weekly fasts: ${pattern.weeks
            .map(
              (week) =>
                `week ${week.weekIndex + 1} ${WEEKDAYS[week.dayOfWeek] ?? week.dayOfWeek} ${fastTypeLabel(
                  week.fastType,
                )}`,
            )
            .join('; ')}.`
        : 'Rotating weekly fast schedule.';
  }
}

export function generateScheduleSummary(content: CustomPhaseContent): string {
  return [
    describeSchedulePattern(content.schedulePattern),
    sentence('Allowed food items', content.allowed),
    sentence('Beverages', content.beverages),
    sentence('Avoid', content.avoid),
    sentence('Daily readings', content.dailyReadings),
  ]
    .filter(Boolean)
    .join(' ');
}

export function withGeneratedScheduleSummary(content: CustomPhaseContent): CustomPhaseContent {
  return {
    ...content,
    scheduleSummary: generateScheduleSummary(content),
  };
}

export function customPhaseToTemplate(
  content: CustomPhaseContent,
  durationDays: number,
  order: number,
): FastPhaseTemplate {
  return {
    id: `custom-phase-${order + 1}`,
    legacyId: 0,
    title: content.title,
    durationDays,
    themeColor: content.themeColor || '#5f6f52',
    scriptureReference: content.scriptureReference || content.dailyReadings?.[0] || 'Psalm 63:1',
    scriptureTextNLT: content.scriptureReference
      ? `Meditate on ${content.scriptureReference} as you pray through this phase.`
      : 'Let today’s readings guide your prayer and reflection.',
    scheduleSummary: content.scheduleSummary || generateScheduleSummary(content),
    schedulePattern: content.schedulePattern,
    allowed: content.allowed,
    avoid: content.avoid,
    beverages: content.beverages,
    dailyReadings: content.dailyReadings,
    prayerFocus: content.prayerFocus,
    imagePath: '/assets/fasting-plan-all-phases.png',
    safetyNote: content.safetyNote,
  };
}
