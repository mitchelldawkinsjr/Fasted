import type { FastPhase } from '../types';

export const PLAN_START = '2026-06-13';
export const PLAN_END = '2026-12-19';

export const FAST_PHASES: FastPhase[] = [
  {
    id: 1,
    title: 'Daniel 1 Fast Pattern',
    startDate: '2026-06-13',
    endDate: '2026-07-11',
    themeColor: '#8397b8',
    scriptureReference: 'Daniel 1:12',
    scriptureTextNLT:
      '“Please test us for ten days on a diet of vegetables and water,” Daniel said.',
    scheduleSummary:
      'Every Wednesday: sunrise to sunset fast, water only. Daily eating: lean protein, vegetables, fruit, water. Remove soda, candy, and fast food.',
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
    id: 2,
    title: "David's Fast for Seeking God",
    startDate: '2026-07-12',
    endDate: '2026-08-08',
    themeColor: '#735c00',
    scriptureReference: '2 Samuel 12:16',
    scriptureTextNLT:
      'David begged God to spare the child. He went without food and lay all night on the bare ground.',
    scheduleSummary:
      'Wednesday and Friday: sunrise to sunset. Water, black coffee, and unsweet tea allowed. Daily scripture focus: Psalm 23, Psalm 51, Psalm 103.',
    allowed: ['Water', 'Black coffee', 'Unsweet tea'],
    dailyReadings: ['Psalm 23', 'Psalm 51', 'Psalm 103'],
    prayerFocus: ['Healing', 'Emotional renewal', 'Physical discipline'],
    imagePath: '/assets/phases/phase-02-davids-fast-seeking-god.png',
  },
  {
    id: 3,
    title: 'First Daniel Fast',
    startDate: '2026-08-09',
    endDate: '2026-08-29',
    themeColor: '#4b5f7e',
    scriptureReference: 'Daniel 10:2-3',
    scriptureTextNLT:
      'When this vision came to me, I, Daniel, had been in mourning for three whole weeks. All that time I had eaten no rich food. No meat or wine crossed my lips, and I used no fragrant lotions until those three weeks had passed.',
    scheduleSummary:
      '21 consecutive days. Eat vegetables, fruit, beans, rice, oats, and water. Avoid meat, dairy, sweets, and fried foods.',
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
    id: 4,
    title: 'Joel Repentance Fast',
    startDate: '2026-08-30',
    endDate: '2026-09-26',
    themeColor: '#ba1a1a',
    scriptureReference: 'Joel 2:12',
    scriptureTextNLT:
      '“Turn to me now, while there is time. Give me your hearts. Come with fasting, weeping, and mourning.”',
    scheduleSummary:
      'Monday and Thursday: sunrise to sunset fast. Daily reading: Joel 2.',
    dailyReadings: ['Joel 2'],
    prayerFocus: ['Repentance', 'Revival', 'Holiness'],
    imagePath: '/assets/phases/phase-04-joel-repentance-fast.png',
  },
  {
    id: 5,
    title: 'Isaiah 58 Fast',
    startDate: '2026-09-27',
    endDate: '2026-10-17',
    themeColor: '#334865',
    scriptureReference: 'Isaiah 58:6-8',
    scriptureTextNLT:
      '“No, this is the kind of fasting I want: Free those who are wrongly imprisoned; lighten the burden of those who work for you. Let the oppressed go free, and remove the chains that bind people. Share your food with the hungry, and give shelter to the homeless. Give clothes to those who need them, and do not hide from relatives who need your help. Then your salvation will come like the dawn, and your wounds will quickly heal. Your godliness will lead you forward, and the glory of the Lord will protect you from behind.”',
    scheduleSummary:
      'Wednesday fast each week. Each week give food or resources to someone in need, encourage one person, and perform one act of service.',
    prayerFocus: ['Healing', 'Compassion', 'Kingdom impact'],
    imagePath: '/assets/phases/phase-05-isaiah-58-fast.png',
  },
  {
    id: 6,
    title: 'Second Daniel Fast',
    startDate: '2026-10-18',
    endDate: '2026-11-07',
    themeColor: '#e9c349',
    scriptureReference: 'Daniel 10:2-3',
    scriptureTextNLT:
      'When this vision came to me, I, Daniel, had been in mourning for three whole weeks. All that time I had eaten no rich food. No meat or wine crossed my lips, and I used no fragrant lotions until those three weeks had passed.',
    scheduleSummary:
      '21 days of Daniel Fast foods. Walk daily.',
    allowed: ['Vegetables', 'Fruit', 'Beans', 'Rice', 'Oats', 'Water'],
    avoid: ['Meat', 'Dairy', 'Sweets', 'Fried foods'],
    prayerFocus: ['Endurance', 'Physical transformation', 'Future vision'],
    imagePath: '/assets/phases/phase-06-second-daniel-fast.png',
  },
  {
    id: 7,
    title: 'Esther Preparation Fast',
    startDate: '2026-11-08',
    endDate: '2026-11-28',
    themeColor: '#021a35',
    scriptureReference: 'Esther 4:16',
    scriptureTextNLT:
      '“Go and gather together all the Jews of Susa and fast for me. Do not eat or drink for three days, night or day. My maids and I will do the same. And then, though it is against the law, I will go in to see the king. If I must die, I must die.”',
    scheduleSummary:
      'Week 1: one 24-hour water fast. Week 2: one 24-hour water fast. Week 3: one sunrise-to-sunset fast.',
    prayerFocus: ['Courage', 'Faith', "Trust in God's provision"],
    imagePath: '/assets/phases/phase-07-esther-preparation-fast.png',
    safetyNote:
      'Full no-food/no-water fasts are not recommended without medical guidance. This plan uses safer water-only and sunrise-to-sunset fasts.',
  },
  {
    id: 8,
    title: 'Year-End Consecration',
    startDate: '2026-11-29',
    endDate: '2026-12-19',
    themeColor: '#574500',
    scriptureReference: 'Isaiah 58, Psalm 103, Matthew 6, James 5',
    scriptureTextNLT:
      'Consecrate the closing weeks of the year through prayer, fasting, and gratitude.',
    scheduleSummary:
      'Monday and Thursday: sunrise to sunset fast. Saturday: extended prayer time.',
    dailyReadings: ['Isaiah 58', 'Psalm 103', 'Matthew 6', 'James 5'],
    prayerFocus: ['Gratitude', 'Healing', 'Family', 'Vision for 2027'],
    imagePath: '/assets/phases/phase-08-year-end-consecration.png',
  },
];

export function getPhaseById(id: number): FastPhase | undefined {
  return FAST_PHASES.find((p) => p.id === id);
}

export function getPhaseForDate(date: string): FastPhase | undefined {
  return FAST_PHASES.find((p) => date >= p.startDate && date <= p.endDate);
}
