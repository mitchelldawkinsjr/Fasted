import type { FastPhaseTemplate, Journey } from '../types';

export const PHASE_TEMPLATES: FastPhaseTemplate[] = [
  {
    id: 'daniel-1',
    legacyId: 1,
    title: 'Daniel 1 Fast Pattern',
    durationDays: 29,
    themeColor: '#8397b8',
    scriptureReference: 'Daniel 1:12',
    scriptureTextNLT:
      '“Please test us for ten days on a diet of vegetables and water,” Daniel said.',
    scheduleSummary:
      'Every Wednesday: sunrise to sunset fast, water only. Daily eating: lean protein, vegetables, fruit, water. Remove soda, candy, and fast food.',
    schedulePattern: { kind: 'weekday-fast', fastDays: [3], fastType: 'sunrise-to-sunset-water' },
    allowed: ['Lean protein', 'Vegetables', 'Fruit', 'Water'],
    avoid: ['Soda', 'Candy', 'Fast food'],
    prayerFocus: [
      'Dedication of your weight-loss journey',
      'Wisdom for health decisions',
      'Family leadership',
    ],
    imagePath: '/assets/phases/phase-01-daniel-1-fast-pattern.png',
  },
  {
    id: 'davids-fast',
    legacyId: 2,
    title: "David's Fast for Seeking God",
    durationDays: 28,
    themeColor: '#735c00',
    scriptureReference: '2 Samuel 12:16',
    scriptureTextNLT:
      'David begged God to spare the child. He went without food and lay all night on the bare ground.',
    scheduleSummary:
      'Wednesday and Friday: sunrise to sunset. Water, black coffee, and unsweet tea allowed. Daily scripture focus: Psalm 23, Psalm 51, Psalm 103.',
    schedulePattern: {
      kind: 'weekday-fast',
      fastDays: [3, 5],
      fastType: 'sunrise-to-sunset-with-coffee-tea',
    },
    allowed: ['Water', 'Black coffee', 'Unsweet tea'],
    dailyReadings: ['Psalm 23', 'Psalm 51', 'Psalm 103'],
    prayerFocus: ['Healing', 'Emotional renewal', 'Physical discipline'],
    imagePath: '/assets/phases/phase-02-davids-fast-seeking-god.png',
  },
  {
    id: 'first-daniel-fast',
    legacyId: 3,
    title: 'First Daniel Fast',
    durationDays: 21,
    themeColor: '#4b5f7e',
    scriptureReference: 'Daniel 10:2-3',
    scriptureTextNLT:
      'When this vision came to me, I, Daniel, had been in mourning for three whole weeks. All that time I had eaten no rich food. No meat or wine crossed my lips, and I used no fragrant lotions until those three weeks had passed.',
    scheduleSummary:
      '21 consecutive days. Eat vegetables, fruit, beans, rice, oats, and water. Avoid meat, dairy, sweets, and fried foods.',
    schedulePattern: { kind: 'consecutive-daniel' },
    allowed: ['Vegetables', 'Fruit', 'Beans', 'Rice', 'Oats', 'Water'],
    avoid: ['Meat', 'Dairy', 'Sweets', 'Fried foods'],
    prayerFocus: [
      'Spiritual breakthrough',
      'Family',
      'Direction for work and ministry',
    ],
    imagePath: '/assets/phases/phase-03-first-daniel-fast.png',
  },
  {
    id: 'joel-repentance',
    legacyId: 4,
    title: 'Joel Repentance Fast',
    durationDays: 28,
    themeColor: '#ba1a1a',
    scriptureReference: 'Joel 2:12',
    scriptureTextNLT:
      '“Turn to me now, while there is time. Give me your hearts. Come with fasting, weeping, and mourning.”',
    scheduleSummary: 'Monday and Thursday: sunrise to sunset fast. Daily reading: Joel 2.',
    schedulePattern: { kind: 'weekday-fast', fastDays: [1, 4], fastType: 'sunrise-to-sunset-water' },
    dailyReadings: ['Joel 2'],
    prayerFocus: ['Repentance', 'Revival', 'Holiness'],
    imagePath: '/assets/phases/phase-04-joel-repentance-fast.png',
  },
  {
    id: 'isaiah-58',
    legacyId: 5,
    title: 'Isaiah 58 Fast',
    durationDays: 21,
    themeColor: '#334865',
    scriptureReference: 'Isaiah 58:6-8',
    scriptureTextNLT:
      '“No, this is the kind of fasting I want: Free those who are wrongly imprisoned; lighten the burden of those who work for you. Let the oppressed go free, and remove the chains that bind people. Share your food with the hungry, and give shelter to the homeless. Give clothes to those who need them, and do not hide from relatives who need your help. Then your salvation will come like the dawn, and your wounds will quickly heal. Your godliness will lead you forward, and the glory of the Lord will protect you from behind.”',
    scheduleSummary:
      'Wednesday fast each week. Each week give food or resources to someone in need, encourage one person, and perform one act of service.',
    schedulePattern: { kind: 'weekday-fast', fastDays: [3], fastType: 'sunrise-to-sunset-water' },
    prayerFocus: ['Healing', 'Compassion', 'Kingdom impact'],
    imagePath: '/assets/phases/phase-05-isaiah-58-fast.png',
  },
  {
    id: 'second-daniel-fast',
    legacyId: 6,
    title: 'Second Daniel Fast',
    durationDays: 21,
    themeColor: '#e9c349',
    scriptureReference: 'Daniel 10:2-3',
    scriptureTextNLT:
      'When this vision came to me, I, Daniel, had been in mourning for three whole weeks. All that time I had eaten no rich food. No meat or wine crossed my lips, and I used no fragrant lotions until those three weeks had passed.',
    scheduleSummary: '21 days of Daniel Fast foods. Walk daily.',
    schedulePattern: { kind: 'consecutive-daniel', includesWalk: true },
    allowed: ['Vegetables', 'Fruit', 'Beans', 'Rice', 'Oats', 'Water'],
    avoid: ['Meat', 'Dairy', 'Sweets', 'Fried foods'],
    prayerFocus: ['Endurance', 'Physical transformation', 'Future vision'],
    imagePath: '/assets/phases/phase-06-second-daniel-fast.png',
  },
  {
    id: 'esther-preparation',
    legacyId: 7,
    title: 'Esther Preparation Fast',
    durationDays: 21,
    themeColor: '#021a35',
    scriptureReference: 'Esther 4:16',
    scriptureTextNLT:
      '“Go and gather together all the Jews of Susa and fast for me. Do not eat or drink for three days, night or day. My maids and I will do the same. And then, though it is against the law, I will go in to see the king. If I must die, I must die.”',
    scheduleSummary:
      'Week 1: one 24-hour water fast. Week 2: one 24-hour water fast. Week 3: one sunrise-to-sunset fast.',
    schedulePattern: {
      kind: 'rotating-weekly',
      weeks: [
        { weekIndex: 0, dayOfWeek: 0, fastType: 'twenty-four-hour-water' },
        { weekIndex: 1, dayOfWeek: 0, fastType: 'twenty-four-hour-water' },
        { weekIndex: 2, dayOfWeek: 3, fastType: 'sunrise-to-sunset-water' },
      ],
    },
    prayerFocus: ['Courage', 'Faith', "Trust in God's provision"],
    imagePath: '/assets/phases/phase-07-esther-preparation-fast.png',
    safetyNote:
      'Full no-food/no-water fasts are not recommended without medical guidance. This plan uses safer water-only and sunrise-to-sunset fasts.',
  },
  {
    id: 'year-end-consecration',
    legacyId: 8,
    title: 'Year-End Consecration',
    durationDays: 21,
    themeColor: '#574500',
    scriptureReference: 'Isaiah 58, Psalm 103, Matthew 6, James 5',
    scriptureTextNLT:
      'Consecrate the closing weeks of the year through prayer, fasting, and gratitude.',
    scheduleSummary:
      'Monday and Thursday: sunrise to sunset fast. Saturday: extended prayer time.',
    schedulePattern: {
      kind: 'weekday-with-prayer',
      fastDays: [1, 4],
      fastType: 'sunrise-to-sunset-water',
      prayerDays: [6],
    },
    dailyReadings: ['Isaiah 58', 'Psalm 103', 'Matthew 6', 'James 5'],
    prayerFocus: ['Gratitude', 'Healing', 'Family', 'Vision for 2027'],
    imagePath: '/assets/phases/phase-08-year-end-consecration.png',
  },
];

export const FASTED_JOURNEY: Journey = {
  id: 'fasted-journey',
  name: 'Fasted Journey',
  startDate: '2026-06-13',
  phases: PHASE_TEMPLATES.map((template, order) => ({
    templateId: template.id,
    order,
  })),
  isDefault: true,
  locked: true,
};

export function getTemplateById(templateId: string): FastPhaseTemplate | undefined {
  return PHASE_TEMPLATES.find((t) => t.id === templateId);
}

