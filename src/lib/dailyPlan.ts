import { getEncouragementForDay } from '../data/encouragements';
import { getPhaseById, getPhaseForDate } from '../data/fastingPlan';
import type { DailyFastPlan, FastType } from '../types';
import {
  getWeekIndexInPhase,
  isFriday,
  isMonday,
  isSaturday,
  isSunday,
  isThursday,
  isWednesday,
} from './dateUtils';

function buildDanielFastInstructions(phaseId: number): string[] {
  const phase = getPhaseById(phaseId);
  const instructions = [
    'Follow the Daniel Fast eating pattern today.',
    'Eat: vegetables, fruit, beans, rice, oats, and water.',
    'Avoid: meat, dairy, sweets, and fried foods.',
  ];
  if (phaseId === 6) {
    instructions.push('Take a daily walk as part of this phase.');
  }
  if (phase?.allowed) {
    instructions.push(`Allowed: ${phase.allowed.join(', ')}.`);
  }
  return instructions;
}

function getEstherFastDetails(date: string, phaseStart: string): {
  isFastDay: boolean;
  fastType: FastType;
  instructions: string[];
} {
  const weekIndex = getWeekIndexInPhase(date, phaseStart);

  if (weekIndex === 0 && isSunday(date)) {
    return {
      isFastDay: true,
      fastType: 'twenty-four-hour-water',
      instructions: [
        '24-hour water fast (Week 1).',
        'Water only—hydrate steadily.',
        'Break your fast gently when the 24 hours end.',
        'Speak with a healthcare professional if you have medical concerns.',
      ],
    };
  }

  if (weekIndex === 1 && isSunday(date)) {
    return {
      isFastDay: true,
      fastType: 'twenty-four-hour-water',
      instructions: [
        '24-hour water fast (Week 2).',
        'Water only—hydrate steadily.',
        'Break your fast gently when the 24 hours end.',
        'Speak with a healthcare professional if you have medical concerns.',
      ],
    };
  }

  if (weekIndex === 2 && isWednesday(date)) {
    return {
      isFastDay: true,
      fastType: 'sunrise-to-sunset-water',
      instructions: [
        'Sunrise-to-sunset water fast (Week 3).',
        'Water only from sunrise to sunset.',
        'Break your fast gently after sunset.',
      ],
    };
  }

  return {
    isFastDay: false,
    fastType: 'normal-eating',
    instructions: [
      'Preparation day—eat nourishing foods and stay hydrated.',
      'Prepare your heart for the next fast in this Esther phase.',
    ],
  };
}

export function getDailyPlan(date: string): DailyFastPlan | null {
  const phase = getPhaseForDate(date);
  if (!phase) return null;

  let isFastDay = false;
  let fastType: FastType = 'normal-eating';
  let instructions: string[] = [];
  let scriptureReferences: string[] = [phase.scriptureReference];

  switch (phase.id) {
    case 1:
      if (isWednesday(date)) {
        isFastDay = true;
        fastType = 'sunrise-to-sunset-water';
        instructions = [
          'Sunrise-to-sunset fast today—water only.',
          'Hydrate well before and after the fast.',
          'On non-fast days: lean protein, vegetables, fruit, and water.',
          'Avoid: soda, candy, and fast food.',
        ];
      } else {
        instructions = [
          'Normal eating day with Daniel 1 pattern.',
          'Eat: lean protein, vegetables, fruit, and water.',
          'Avoid: soda, candy, and fast food.',
          'Next Wednesday is a sunrise-to-sunset water fast.',
        ];
      }
      break;

    case 2:
      if (isWednesday(date) || isFriday(date)) {
        isFastDay = true;
        fastType = 'sunrise-to-sunset-with-coffee-tea';
        instructions = [
          'Sunrise-to-sunset fast today.',
          'Allowed: water, black coffee, and unsweet tea.',
          'Spend extra time in prayer and scripture.',
        ];
      } else {
        instructions = [
          'Preparation / normal eating day.',
          'Read and meditate on Psalm 23, Psalm 51, and Psalm 103.',
          'Fast days this phase: Wednesday and Friday.',
        ];
      }
      scriptureReferences = phase.dailyReadings ?? scriptureReferences;
      break;

    case 3:
      isFastDay = true;
      fastType = 'daniel-fast';
      instructions = buildDanielFastInstructions(3);
      break;

    case 4:
      if (isMonday(date) || isThursday(date)) {
        isFastDay = true;
        fastType = 'sunrise-to-sunset-water';
        instructions = [
          'Sunrise-to-sunset fast today—water only.',
          'Read Joel 2 today.',
          'Return to God with all your heart.',
        ];
      } else {
        instructions = [
          'Read Joel 2 today.',
          'Prepare your heart in repentance and holiness.',
          'Fast days this phase: Monday and Thursday.',
        ];
      }
      scriptureReferences = ['Joel 2', phase.scriptureReference];
      break;

    case 5:
      if (isWednesday(date)) {
        isFastDay = true;
        fastType = 'sunrise-to-sunset-water';
        instructions = [
          'Wednesday sunrise-to-sunset fast—water only.',
          'This week: give food or resources to someone in need.',
          'Encourage one person and perform one act of service.',
        ];
      } else {
        instructions = [
          'Isaiah 58 living fast day.',
          'Look for ways to serve, encourage, and give this week.',
          'Wednesday is your weekly fast day this phase.',
        ];
      }
      break;

    case 6:
      isFastDay = true;
      fastType = 'daniel-fast';
      instructions = buildDanielFastInstructions(6);
      break;

    case 7: {
      const esther = getEstherFastDetails(date, phase.startDate);
      isFastDay = esther.isFastDay;
      fastType = esther.fastType;
      instructions = esther.instructions;
      if (phase.safetyNote) {
        instructions.push(phase.safetyNote);
      }
      break;
    }

    case 8:
      if (isMonday(date) || isThursday(date)) {
        isFastDay = true;
        fastType = 'sunrise-to-sunset-water';
        instructions = [
          'Sunrise-to-sunset fast today—water only.',
          'Read: Isaiah 58, Psalm 103, Matthew 6, and James 5.',
        ];
      } else if (isSaturday(date)) {
        isFastDay = false;
        fastType = 'extended-prayer';
        instructions = [
          'Extended prayer time today.',
          'Set aside extra time for worship, intercession, and listening.',
          'Read: Isaiah 58, Psalm 103, Matthew 6, and James 5.',
        ];
      } else {
        instructions = [
          'Consecration day—stay attentive to God’s leading.',
          'Read: Isaiah 58, Psalm 103, Matthew 6, and James 5.',
          'Monday and Thursday are fast days; Saturday is extended prayer.',
        ];
      }
      scriptureReferences = phase.dailyReadings ?? scriptureReferences;
      break;
  }

  return {
    date,
    phaseId: phase.id,
    isFastDay,
    fastType,
    instructions,
    scriptureReferences,
    prayerPoints: phase.prayerFocus,
    encouragement: getEncouragementForDay(
      date,
      phase.id,
      isFastDay,
      fastType,
    ),
    checkInPrompts: [
      'Did you follow today’s fasting plan?',
      'Did you pray over today’s focus?',
      'Did you read today’s scripture?',
      'Did you journal today?',
      'What is one win from today?',
    ],
  };
}

export function getFastDayDates(): Set<string> {
  const dates = new Set<string>();
  let current = '2026-06-13';
  const end = '2026-12-19';

  while (current <= end) {
    const plan = getDailyPlan(current);
    if (plan?.isFastDay) {
      dates.add(current);
    }
    const [y, m, d] = current.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    current = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  }

  return dates;
}
