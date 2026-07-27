import type {
  FastPhase,
  FoodGoal,
  FoodProfile,
  Journey,
  KitchenItem,
  MealPlanScope,
} from '../types';
import type { DailyFastPlan } from '../types';
import { addLocalDays } from './dateUtils';
import { getDailyPlan } from './dailyPlan';

export type DailyTargets = {
  calories: { min: number; max: number };
  protein: { min: number; max: number };
  carbs: { min: number; max: number };
  fat: { min: number; max: number };
  fiber: { min: number; max: number };
  waterOz: { min: number; max: number };
  vegetableCups: { min: number; max: number };
  fruitServings: { min: number; max: number };
  meals: number;
};

export type PlateSegment = {
  label: string;
  portion: string;
  colorClass: string;
};

export type SuggestedMeal = {
  name: string;
  label: string;
  items: string[];
};

export type MealPlanResult = {
  scope: MealPlanScope;
  isFastDay: boolean;
  meals: SuggestedMeal[];
  daysCoverage?: number;
  useSoonNotes: string[];
  postFastGuidance?: string[];
};

const POST_FAST_GUIDANCE = [
  'Hydrate with water before eating.',
  'Eat slowly and mindfully.',
  'Start with a moderate meal: protein, vegetables, and a reasonable carbohydrate portion.',
  'Avoid treating the end of the fast like a reward binge.',
];

function estimateBmr(profile: FoodProfile): number | null {
  const { age, sex, heightInches, weightLbs } = profile;
  if (!age || !heightInches || !weightLbs) return null;
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;
  if (sex === 'female') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
}

const ACTIVITY_MULTIPLIERS: Record<NonNullable<FoodProfile['activityLevel']>, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
};

function goalCalorieAdjustment(goal: FoodGoal): number {
  switch (goal) {
    case 'lose-body-fat':
      return -400;
    case 'gain-muscle':
      return 300;
    case 'maintain':
    case 'wellness':
    default:
      return 0;
  }
}

export function calculateDailyTargets(profile: FoodProfile): DailyTargets {
  const goal = profile.goal ?? 'wellness';
  const bmr = estimateBmr(profile);
  const multiplier = profile.activityLevel
    ? ACTIVITY_MULTIPLIERS[profile.activityLevel]
    : 1.375;
  const baseCalories = bmr ? Math.round(bmr * multiplier + goalCalorieAdjustment(goal)) : 2000;
  const minCal = Math.max(1200, baseCalories - 150);
  const maxCal = baseCalories + 150;

  const weight = profile.weightLbs ?? 150;
  const proteinMin = Math.round(weight * 0.7);
  const proteinMax = Math.round(weight * 1.0);

  const meals = profile.preferredMeals ?? 3;

  return {
    calories: { min: minCal, max: maxCal },
    protein: { min: proteinMin, max: proteinMax },
    carbs: { min: Math.round(minCal * 0.35 / 4), max: Math.round(maxCal * 0.45 / 4) },
    fat: { min: Math.round(minCal * 0.2 / 9), max: Math.round(maxCal * 0.3 / 9) },
    fiber: { min: 25, max: 35 },
    waterOz: { min: 80, max: 120 },
    vegetableCups: { min: 4, max: 6 },
    fruitServings: { min: 1, max: 3 },
    meals,
  };
}

export function getPlateSegments(
  phase: FastPhase | undefined,
  plan: DailyFastPlan,
  goal: FoodGoal,
  scope?: MealPlanScope,
): PlateSegment[] {
  const showFastPlate = plan.isFastDay && scope !== 'post-fast';
  if (showFastPlate) {
    return [
      { label: 'Water', portion: 'Primary focus', colorClass: 'bg-blue-400/60' },
      { label: 'Hydration', portion: 'Steady throughout', colorClass: 'bg-blue-300/40' },
    ];
  }

  const isDanielStyle =
    plan.fastType === 'daniel-fast' ||
    (phase?.allowed?.some((a) => /vegetable|fruit|bean/i.test(a)) ?? false);

  if (isDanielStyle) {
    return [
      { label: 'Vegetables', portion: '½ plate', colorClass: 'bg-green-500/50' },
      { label: 'Fruit & plant protein', portion: '¼ plate', colorClass: 'bg-amber-400/50' },
      { label: 'Whole grains', portion: '¼ plate', colorClass: 'bg-orange-300/50' },
    ];
  }

  if (goal === 'gain-muscle') {
    return [
      { label: 'Vegetables', portion: '⅓ plate', colorClass: 'bg-green-500/50' },
      { label: 'Protein', portion: '⅓ plate', colorClass: 'bg-red-400/50' },
      { label: 'Carbohydrates', portion: '⅓ plate', colorClass: 'bg-amber-400/50' },
    ];
  }

  return [
    { label: 'Vegetables', portion: '½ plate', colorClass: 'bg-green-500/50' },
    { label: 'Protein', portion: '¼ plate', colorClass: 'bg-red-400/50' },
    { label: 'Carbohydrates', portion: '¼ plate', colorClass: 'bg-amber-400/50' },
  ];
}

function parseAvoidTerms(text: string | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/[,;]/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

function getAvoidTerms(profile: FoodProfile): string[] {
  return [...parseAvoidTerms(profile.allergies), ...parseAvoidTerms(profile.foodsAvoid)];
}

export function isFoodAvoided(name: string, avoidTerms: string[]): boolean {
  if (avoidTerms.length === 0) return false;
  const lower = name.toLowerCase();
  return avoidTerms.some((term) => lower.includes(term) || term.includes(lower));
}

function filterAvoided(items: KitchenItem[], avoidTerms: string[]): KitchenItem[] {
  if (avoidTerms.length === 0) return items;
  return items.filter((item) => !isFoodAvoided(item.name, avoidTerms));
}

function byCategory(items: KitchenItem[], category: KitchenItem['category']): KitchenItem[] {
  return items.filter((i) => i.category === category);
}

function sortByUseSoon(items: KitchenItem[]): KitchenItem[] {
  return [...items].sort((a, b) => {
    if (a.useSoon && !b.useSoon) return -1;
    if (!a.useSoon && b.useSoon) return 1;
    return 0;
  });
}

function pickItem(items: KitchenItem[], index: number): string | null {
  if (items.length === 0) return null;
  return items[index % items.length]?.name ?? null;
}

function getMealLabels(mealCount: number): string[] {
  if (mealCount <= 2) {
    return Array.from({ length: mealCount }, (_, i) => `Meal ${i + 1}`);
  }

  const labels = ['Breakfast', 'Lunch', 'Dinner'];
  for (let i = labels.length; i < mealCount; i++) {
    labels.push(i === 3 ? 'Snack' : `Snack ${i - 2}`);
  }
  return labels.slice(0, mealCount);
}

function formatDayLabel(date: string): string {
  return parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function buildMealFromKitchen(
  label: string,
  name: string,
  proteins: KitchenItem[],
  vegetables: KitchenItem[],
  carbs: KitchenItem[],
  fruits: KitchenItem[],
  fats: KitchenItem[],
  mealIndex: number,
): SuggestedMeal {
  const items: string[] = [];
  const protein = pickItem(proteins, mealIndex);
  const veg = pickItem(vegetables, mealIndex);
  const carb = pickItem(carbs, mealIndex);
  const fruit = pickItem(fruits, mealIndex);
  const fat = pickItem(fats, mealIndex);

  if (protein) items.push(`${protein}: 5–7 oz`);
  if (veg) items.push(`${veg}: 1½–2 cups`);
  if (carb) items.push(`${carb}: ½–1 cup`);
  if (fruit) items.push(`${fruit}: 1 serving`);
  if (fat && mealIndex === 0) items.push(`${fat}: 1–2 tsp`);

  if (items.length === 0) {
    items.push('Add items to My Kitchen for personalized suggestions');
  }

  return { label, name, items };
}

type CategoryBuckets = {
  proteins: KitchenItem[];
  vegetables: KitchenItem[];
  carbs: KitchenItem[];
  fruits: KitchenItem[];
  fats: KitchenItem[];
};

function bucketInventory(inventory: KitchenItem[]): CategoryBuckets {
  const sorted = sortByUseSoon(inventory);
  return {
    proteins: sortByUseSoon(byCategory(sorted, 'protein')),
    vegetables: sortByUseSoon(byCategory(sorted, 'vegetables')),
    carbs: sortByUseSoon(byCategory(sorted, 'carbohydrates')),
    fruits: sortByUseSoon(byCategory(sorted, 'fruit')),
    fats: sortByUseSoon(byCategory(sorted, 'healthyFats')),
  };
}

function buildDayMeals(
  dayLabel: string,
  dayPlan: DailyFastPlan,
  buckets: CategoryBuckets,
  mealCount: number,
  dayOffset: number,
): SuggestedMeal[] {
  if (dayPlan.isFastDay) {
    return [
      {
        label: dayLabel,
        name: 'Fasting day',
        items: ['Follow your phase commitment.', 'Hydrate with water throughout the day.'],
      },
    ];
  }

  const labels = getMealLabels(mealCount);
  const baseIndex = dayOffset * mealCount;
  return labels.map((label, i) =>
    buildMealFromKitchen(
      `${dayLabel} · ${label}`,
      label,
      buckets.proteins,
      buckets.vegetables,
      buckets.carbs,
      buckets.fruits,
      buckets.fats,
      baseIndex + i,
    ),
  );
}

function buildGroceryList(buckets: CategoryBuckets): SuggestedMeal[] {
  const missing: string[] = [];
  if (buckets.proteins.length === 0) missing.push('Lean protein (chicken, eggs, or Greek yogurt)');
  if (buckets.vegetables.length === 0) missing.push('Mixed vegetables');
  if (buckets.fruits.length === 0) missing.push('Fresh fruit');
  if (buckets.carbs.length === 0) missing.push('Brown rice or potatoes');
  return [
    {
      label: 'Grocery list',
      name: 'Suggested additions',
      items: missing.length > 0 ? missing : ['Your kitchen looks well stocked!'],
    },
  ];
}

function buildPostFastMeal(buckets: CategoryBuckets): SuggestedMeal[] {
  return [
    {
      label: 'Post-fast meal',
      name: "Tonight's post-fast meal",
      items: [
        `${pickItem(buckets.proteins, 0) ?? 'Lean protein'}: 5 oz grilled`,
        `${pickItem(buckets.carbs, 0) ?? 'Potatoes'}: 1 cup roasted`,
        `${pickItem(buckets.vegetables, 0) ?? 'Broccoli'}: 2 cups`,
        'Water',
        `${pickItem(buckets.fruits, 0) ?? 'Fruit'} later if still hungry`,
      ],
    },
  ];
}

function computeDaysCoverage(inventory: KitchenItem[], mealCount: number): number | undefined {
  const totalServings = inventory.reduce((sum, i) => sum + (i.servingCount ?? 2), 0);
  return inventory.length > 0 ? Math.max(1, Math.floor(totalServings / (mealCount * 2))) : undefined;
}

export function generateMealPlan(
  scope: MealPlanScope,
  inventory: KitchenItem[],
  journey: Journey,
  referenceDate: string,
  profile: FoodProfile,
): MealPlanResult | null {
  const todayPlan = getDailyPlan(referenceDate, journey);
  if (!todayPlan) return null;

  const avoidTerms = getAvoidTerms(profile);
  const filteredInventory = filterAvoided(inventory, avoidTerms);
  const buckets = bucketInventory(filteredInventory);
  const mealCount = profile.preferredMeals ?? 3;

  const useSoonNotes = sortByUseSoon(filteredInventory)
    .filter((i) => i.useSoon)
    .map((i) => i.name)
    .slice(0, 3);

  const showFastDayUi = todayPlan.isFastDay && (scope === 'today' || scope === 'next-meal');
  if (showFastDayUi) {
    return {
      scope,
      isFastDay: true,
      meals: [],
      useSoonNotes,
      postFastGuidance: POST_FAST_GUIDANCE,
    };
  }

  let meals: SuggestedMeal[] = [];

  if (scope === 'next-meal') {
    meals.push(
      buildMealFromKitchen(
        'Next meal',
        'Suggested plate',
        buckets.proteins,
        buckets.vegetables,
        buckets.carbs,
        buckets.fruits,
        buckets.fats,
        0,
      ),
    );
  } else if (scope === 'post-fast') {
    meals = buildPostFastMeal(buckets);
  } else if (scope === 'grocery-list') {
    meals = buildGroceryList(buckets);
  } else if (scope === 'tomorrow') {
    const tomorrow = addLocalDays(referenceDate, 1);
    const tomorrowPlan = getDailyPlan(tomorrow, journey);
    if (tomorrowPlan) {
      meals = buildDayMeals(formatDayLabel(tomorrow), tomorrowPlan, buckets, mealCount, 1);
    }
  } else if (scope === 'week') {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = addLocalDays(referenceDate, dayOffset);
      const dayPlan = getDailyPlan(date, journey);
      if (!dayPlan) continue;
      meals.push(...buildDayMeals(formatDayLabel(date), dayPlan, buckets, mealCount, dayOffset));
    }
  } else {
    meals = buildDayMeals("Today", todayPlan, buckets, mealCount, 0);
  }

  return {
    scope,
    isFastDay: false,
    meals,
    daysCoverage: computeDaysCoverage(filteredInventory, mealCount),
    useSoonNotes,
  };
}

export function getPhaseDietaryRules(phase: FastPhase | undefined, plan: DailyFastPlan): string[] {
  const rules: string[] = [];
  if (plan.isFastDay) {
    rules.push('Today is a fasting day — follow your phase commitment.');
  } else {
    if (phase?.allowed?.length) {
      rules.push(`Allowed: ${phase.allowed.join(', ')}.`);
    }
    if (phase?.avoid?.length) {
      rules.push(`Avoid: ${phase.avoid.join(', ')}.`);
    }
  }
  plan.instructions.forEach((inst) => {
    if (/food|eat|beverage|avoid|allowed|protein|vegetable|fruit|water/i.test(inst)) {
      rules.push(inst);
    }
  });
  return rules;
}

export function getPlanSectionHeading(scope: MealPlanScope, isFastDay: boolean): string {
  if (isFastDay && (scope === 'today' || scope === 'next-meal')) {
    return "Today's Fast";
  }
  switch (scope) {
    case 'tomorrow':
      return "Tomorrow's Plan";
    case 'week':
      return "This Week's Plan";
    case 'grocery-list':
      return 'Grocery List';
    case 'post-fast':
      return 'Post-Fast Meal';
    case 'next-meal':
      return 'Next Meal';
    default:
      return "Today's Plan";
  }
}
