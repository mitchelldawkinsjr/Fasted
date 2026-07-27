import type {
  FastPhase,
  FoodGoal,
  FoodProfile,
  KitchenItem,
  MealPlanScope,
} from '../types';
import type { DailyFastPlan } from '../types';

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
): PlateSegment[] {
  if (plan.isFastDay) {
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

function byCategory(items: KitchenItem[], category: KitchenItem['category']): KitchenItem[] {
  return items.filter((i) => i.category === category);
}

function sortByExpiration(items: KitchenItem[]): KitchenItem[] {
  return [...items].sort((a, b) => {
    if (a.useSoon && !b.useSoon) return -1;
    if (!a.useSoon && b.useSoon) return 1;
    if (a.expirationDate && b.expirationDate) {
      return a.expirationDate.localeCompare(b.expirationDate);
    }
    if (a.expirationDate) return -1;
    if (b.expirationDate) return 1;
    return 0;
  });
}

function pickItem(items: KitchenItem[], index: number): string | null {
  if (items.length === 0) return null;
  return items[index % items.length]?.name ?? null;
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

export function generateMealPlan(
  scope: MealPlanScope,
  inventory: KitchenItem[],
  plan: DailyFastPlan,
  _phase: FastPhase | undefined,
  profile: FoodProfile,
): MealPlanResult {
  const sorted = sortByExpiration(inventory);
  const proteins = sortByExpiration(byCategory(sorted, 'protein'));
  const vegetables = sortByExpiration(byCategory(sorted, 'vegetables'));
  const carbs = sortByExpiration(byCategory(sorted, 'carbohydrates'));
  const fruits = sortByExpiration(byCategory(sorted, 'fruit'));
  const fats = sortByExpiration(byCategory(sorted, 'healthyFats'));

  const useSoonNotes = sorted
    .filter((i) => i.useSoon || (i.expirationDate && isExpiringSoon(i.expirationDate)))
    .map((i) => i.name)
    .slice(0, 3);

  if (plan.isFastDay && scope !== 'post-fast') {
    return {
      scope,
      isFastDay: true,
      meals: [],
      useSoonNotes,
      postFastGuidance: [
        'Hydrate with water before eating.',
        'Eat slowly and mindfully.',
        'Start with a moderate meal: protein, vegetables, and a reasonable carbohydrate portion.',
        'Avoid treating the end of the fast like a reward binge.',
      ],
    };
  }

  const mealCount = profile.preferredMeals ?? 3;
  const meals: SuggestedMeal[] = [];

  if (scope === 'next-meal') {
    meals.push(
      buildMealFromKitchen('Next meal', 'Suggested plate', proteins, vegetables, carbs, fruits, fats, 0),
    );
  } else if (scope === 'post-fast') {
    meals.push({
      label: 'Post-fast meal',
      name: "Tonight's post-fast meal",
      items: [
        `${pickItem(proteins, 0) ?? 'Lean protein'}: 5 oz grilled`,
        `${pickItem(carbs, 0) ?? 'Potatoes'}: 1 cup roasted`,
        `${pickItem(vegetables, 0) ?? 'Broccoli'}: 2 cups`,
        'Water',
        `${pickItem(fruits, 0) ?? 'Fruit'} later if still hungry`,
      ],
    });
  } else if (scope === 'grocery-list') {
    const missing: string[] = [];
    if (proteins.length === 0) missing.push('Lean protein (chicken, eggs, or Greek yogurt)');
    if (vegetables.length === 0) missing.push('Mixed vegetables');
    if (fruits.length === 0) missing.push('Fresh fruit');
    if (carbs.length === 0) missing.push('Brown rice or potatoes');
    meals.push({
      label: 'Grocery list',
      name: 'Suggested additions',
      items: missing.length > 0 ? missing : ['Your kitchen looks well stocked!'],
    });
  } else {
    const labels =
      mealCount >= 3
        ? ['Breakfast', 'Lunch', 'Dinner']
        : ['Meal 1', 'Meal 2'];
    if (mealCount >= 4) labels.push('Snack');

    for (let i = 0; i < Math.min(mealCount, labels.length); i++) {
      meals.push(
        buildMealFromKitchen(labels[i], labels[i], proteins, vegetables, carbs, fruits, fats, i),
      );
    }
  }

  const totalServings = inventory.reduce((sum, i) => sum + (i.servingCount ?? 2), 0);
  const daysCoverage = inventory.length > 0 ? Math.max(1, Math.floor(totalServings / (mealCount * 2))) : undefined;

  return {
    scope,
    isFastDay: plan.isFastDay,
    meals,
    daysCoverage,
    useSoonNotes,
    postFastGuidance: plan.isFastDay ? undefined : undefined,
  };
}

function isExpiringSoon(date: string): boolean {
  const exp = new Date(date + 'T12:00:00');
  const now = new Date();
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
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

export function formatRange(min: number, max: number, unit: string): string {
  return `${min}–${max} ${unit}`;
}
