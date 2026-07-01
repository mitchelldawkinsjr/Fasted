import { getCustomPhaseEncouragement, getEncouragementForDay } from '../data/encouragements';
import type {
  DailyFastPlan,
  FastPhaseTemplate,
  FastType,
  Journey,
} from '../types';
import { daysBetween, getDayOfWeek, getWeekIndexInPhase, resolveJourney } from './dateUtils';
import { getPhaseContextForDate, isCustomJourneyPhase } from './journey';

/** Food/drink rules from the phase infographic (see public/assets/phases/). */
function appendFoodRules(
  template: FastPhaseTemplate,
  isFastDay: boolean,
  instructions: string[],
): void {
  const foodList = (items: string[]) => items.map((item) => item.toLowerCase()).join(', ');

  if (isFastDay) {
    if (template.beverages?.length) {
      instructions.push(`Beverages: ${foodList(template.beverages)}.`);
    }
    return;
  }

  if (template.allowed?.length) {
    instructions.push(`Allowed food items: ${foodList(template.allowed)}.`);
  }
  if (template.beverages?.length) {
    instructions.push(`Beverages: ${foodList(template.beverages)}.`);
  }
  if (template.avoid?.length) {
    instructions.push(`Avoid: ${foodList(template.avoid)}.`);
  }
}

function buildDanielFastInstructions(template: FastPhaseTemplate): string[] {
  const instructions = ['Follow the Daniel Fast eating pattern today.'];
  appendFoodRules(template, false, instructions);
  if (template.schedulePattern.kind === 'consecutive-daniel' && template.schedulePattern.includesWalk) {
    instructions.push('Take a daily walk as part of this phase.');
  }
  return instructions;
}

function genericFastInstructions(fastType: FastType): string[] {
  switch (fastType) {
    case 'sunrise-to-sunset-with-coffee-tea':
      return [
        'Sunrise-to-sunset fast today—water, coffee, and unsweetened tea allowed.',
        'Spend extra time in prayer and scripture.',
      ];
    case 'twenty-four-hour-water':
      return [
        '24-hour water fast today.',
        'Water only—hydrate steadily.',
        'Break your fast gently when the 24 hours end.',
      ];
    case 'daniel-fast':
      return ['Follow the Daniel Fast eating pattern today.'];
    case 'extended-prayer':
      return ['Extended prayer time today.', 'Set aside extra time for worship, intercession, and listening.'];
    case 'normal-eating':
      return ['Normal eating day—keep meals simple, nourishing, and prayerful.'];
    case 'sunrise-to-sunset-water':
    default:
      return ['Sunrise-to-sunset fast today—water only.', 'Hydrate well before and after the fast.'];
  }
}

function interpretPattern(
  date: string,
  phaseStart: string,
  template: FastPhaseTemplate,
): { isFastDay: boolean; fastType: FastType; instructions: string[] } {
  const pattern = template.schedulePattern;
  const day = getDayOfWeek(date);

  switch (pattern.kind) {
    case 'normal-eating': {
      const instructions = [
        'Normal eating day—keep meals simple, nourishing, and prayerful.',
        'Use this phase to build consistency in scripture, prayer, and reflection.',
      ];
      appendFoodRules(template, false, instructions);
      return { isFastDay: false, fastType: 'normal-eating', instructions };
    }

    case 'weekday-fast': {
      if (pattern.fastDays.includes(day)) {
        const instructions =
          template.legacyId === 1
            ? [
                'Sunrise-to-sunset fast today—water only.',
                'Hydrate well before and after the fast.',
              ]
            : template.legacyId === 2
              ? ['Sunrise-to-sunset fast today.', 'Spend extra time in prayer and scripture.']
              : template.legacyId === 4
                ? [
                    'Sunrise-to-sunset fast today—water only.',
                    'Read Joel 2 today.',
                    'Return to God with all your heart.',
                    'Drink plenty of water during your fast.',
                  ]
                : template.legacyId === 5
                  ? [
                      'Wednesday sunrise-to-sunset fast—water only.',
                      'This week: give food or resources to someone in need.',
                      'Encourage one person and perform one act of service.',
                    ]
                  : genericFastInstructions(pattern.fastType);

        appendFoodRules(template, true, instructions);
        return { isFastDay: true, fastType: pattern.fastType, instructions };
      }

      const nonFast =
        template.legacyId === 1
          ? ['Normal eating day with Daniel 1 pattern.', 'Next Wednesday is a sunrise-to-sunset water fast.']
          : template.legacyId === 2
            ? [
                'Preparation / normal eating day.',
                'Read and meditate on Psalm 23, Psalm 51, and Psalm 103.',
                'Fast days this phase: Wednesday and Friday.',
              ]
            : template.legacyId === 4
              ? [
                  'Read Joel 2 today.',
                  'Prepare your heart in repentance and holiness.',
                  'Fast days this phase: Monday and Thursday.',
                ]
              : template.legacyId === 5
                ? [
                    'Isaiah 58 living fast day.',
                    'Look for ways to serve, encourage, and give this week.',
                    'Wednesday is your weekly fast day this phase.',
                  ]
                : ['Normal eating day—stay hydrated and prepare for upcoming fast days.'];

      appendFoodRules(template, false, nonFast);
      return { isFastDay: false, fastType: 'normal-eating', instructions: nonFast };
    }

    case 'consecutive-daniel':
      return {
        isFastDay: true,
        fastType: 'daniel-fast',
        instructions: buildDanielFastInstructions(template),
      };

    case 'rotating-weekly': {
      const weekIndex = getWeekIndexInPhase(date, phaseStart);
      const match = pattern.weeks.find(
        (w) => w.weekIndex === weekIndex && w.dayOfWeek === day,
      );
      if (match) {
        if (match.fastType === 'twenty-four-hour-water') {
          const instructions = [
            `24-hour water fast (Week ${weekIndex + 1}).`,
            'Water only—hydrate steadily.',
            'Break your fast gently when the 24 hours end.',
            'Speak with a healthcare professional if you have medical concerns.',
          ];
          appendFoodRules(template, true, instructions);
          return { isFastDay: true, fastType: match.fastType, instructions };
        }
        const instructions = [
          'Sunrise-to-sunset water fast (Week 3).',
          'Water only from sunrise to sunset.',
          'Break your fast gently after sunset.',
        ];
        appendFoodRules(template, true, instructions);
        return {
          isFastDay: true,
          fastType: match.fastType,
          instructions,
        };
      }
      const instructions = [
        'Preparation day—eat nourishing foods and stay hydrated.',
        'Prepare your heart for the next fast in this Esther phase.',
      ];
      appendFoodRules(template, false, instructions);
      return {
        isFastDay: false,
        fastType: 'normal-eating',
        instructions,
      };
    }

    case 'weekday-with-prayer': {
      if (pattern.prayerDays.includes(day)) {
        const instructions = [
          'Extended prayer time today.',
          'Set aside extra time for worship, intercession, and listening.',
          'Read: Isaiah 58, Psalm 103, Matthew 6, and James 5.',
        ];
        appendFoodRules(template, false, instructions);
        return {
          isFastDay: false,
          fastType: 'extended-prayer',
          instructions,
        };
      }
      if (pattern.fastDays.includes(day)) {
        const instructions = [
          'Sunrise-to-sunset fast today—water only.',
          'Read: Isaiah 58, Psalm 103, Matthew 6, and James 5.',
        ];
        appendFoodRules(template, true, instructions);
        return {
          isFastDay: true,
          fastType: pattern.fastType,
          instructions,
        };
      }
      const instructions = [
        'Consecration day—stay attentive to God’s leading.',
        'Read: Isaiah 58, Psalm 103, Matthew 6, and James 5.',
        'Monday and Thursday are fast days; Saturday is extended prayer.',
      ];
      appendFoodRules(template, false, instructions);
      return {
        isFastDay: false,
        fastType: 'normal-eating',
        instructions,
      };
    }
  }
}

export function getDailyPlan(date: string, journey?: Journey): DailyFastPlan | null {
  const active = resolveJourney(journey);
  const ctx = getPhaseContextForDate(date, active);
  if (!ctx) return null;

  const { template, startDate, legacyId, phaseId } = ctx;
  const { isFastDay, fastType, instructions } = interpretPattern(date, startDate, template);

  let scriptureReferences = [template.scriptureReference];
  if (template.legacyId === 4) {
    scriptureReferences = ['Joel 2', template.scriptureReference];
  }
  if (template.dailyReadings?.length) {
    scriptureReferences = template.dailyReadings;
  }

  const finalInstructions = [...instructions];
  if (ctx.isCustom && isCustomJourneyPhase(ctx.phase)) {
    finalInstructions.push(...(ctx.phase.content.dayInstructions?.always ?? []));
    finalInstructions.push(
      ...(isFastDay
        ? ctx.phase.content.dayInstructions?.fast ?? []
        : ctx.phase.content.dayInstructions?.nonFast ?? []),
    );
  }

  if (
    template.safetyNote &&
    (template.schedulePattern.kind === 'rotating-weekly' || ctx.isCustom)
  ) {
    finalInstructions.push(template.safetyNote);
  }

  const encouragement =
    ctx.isCustom && isCustomJourneyPhase(ctx.phase)
      ? getCustomPhaseEncouragement(
          date,
          ctx.phase.content,
          daysBetween(startDate, date) - 1,
          isFastDay,
          fastType,
        )
      : getEncouragementForDay(date, legacyId ?? phaseId, isFastDay, fastType);

  return {
    date,
    phaseId,
    isFastDay,
    fastType,
    instructions: finalInstructions,
    scriptureReferences,
    prayerPoints: template.prayerFocus,
    encouragement,
    checkInPrompts: [
      'Did you follow today’s fasting plan?',
      'Did you pray over today’s focus?',
      'Did you read today’s scripture?',
      'Did you journal today?',
      'What is one win from today?',
    ],
  };
}

/** Primary scripture reference for a plan day (first listed reading). */
export function getVerseOfTheDayReference(date: string, journey?: Journey): string | null {
  const plan = getDailyPlan(date, journey);
  return plan?.scriptureReferences[0] ?? null;
}
