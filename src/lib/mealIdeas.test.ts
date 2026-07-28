import { describe, expect, it } from 'vitest';
import {
  filterMealsForAvoidList,
  buildMealIdeasCacheKey,
  type GeneratedMealIdea,
} from './mealIdeas';
import { isFoodAvoided } from './foodPlan';

const sampleMeals: GeneratedMealIdea[] = [
  {
    name: 'Garlic chicken bowl',
    label: 'Lunch',
    ingredients: ['Chicken breast', 'Broccoli', 'Brown rice'],
    portions: ['Chicken: 5–7 oz', 'Broccoli: 1½–2 cups'],
    prepSteps: ['Sear chicken', 'Steam broccoli'],
    prepMinutes: 20,
  },
  {
    name: 'Peanut noodle plate',
    label: 'Dinner',
    ingredients: ['Peanut butter', 'Noodles'],
    portions: ['Noodles: 1 cup'],
    prepSteps: ['Toss with peanut sauce'],
  },
];

describe('meal idea avoid filtering', () => {
  it('filters meals that mention avoid terms', () => {
    const filtered = filterMealsForAvoidList(sampleMeals, {
      goal: 'wellness',
      allergies: 'peanut',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Garlic chicken bowl');
  });

  it('isFoodAvoided matches substring allergies', () => {
    expect(isFoodAvoided('Roasted peanuts', ['peanut'])).toBe(true);
    expect(isFoodAvoided('Chicken', ['peanut'])).toBe(false);
  });
});

describe('meal idea cache key', () => {
  it('changes when kitchen inventory changes', () => {
    const base = {
      scope: 'today' as const,
      referenceDate: '2026-07-28',
      profile: { goal: 'wellness' as const },
      kitchen: [{ name: 'Chicken', category: 'protein' as const }],
      phaseRules: ['Allowed: vegetables'],
    };
    const a = buildMealIdeasCacheKey(base);
    const b = buildMealIdeasCacheKey({
      ...base,
      kitchen: [{ name: 'Tofu', category: 'protein' as const }],
    });
    expect(a).not.toBe(b);
  });
});
