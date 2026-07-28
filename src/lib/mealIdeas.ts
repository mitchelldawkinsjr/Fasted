import type { FoodProfile, KitchenItem, MealPlanScope } from '../types';
import { isFoodAvoided } from './foodPlan';

export type GeneratedMealIdea = {
  name: string;
  label: string;
  ingredients: string[];
  portions: string[];
  prepSteps: string[];
  prepMinutes?: number;
  phaseNotes?: string;
};

export type MealIdeasApiResult = {
  meals: GeneratedMealIdea[];
  cached?: boolean;
  model?: string;
  remainingToday?: number;
};

export type MealIdeasRequestPayload = {
  scope: MealPlanScope;
  referenceDate: string;
  profile: Pick<
    FoodProfile,
    'goal' | 'allergies' | 'foodsAvoid' | 'preferredMeals' | 'activityLevel'
  >;
  kitchen: Array<Pick<KitchenItem, 'name' | 'category' | 'useSoon' | 'quantity'>>;
  phaseRules: string[];
  mealCount?: number;
  regenerate?: boolean;
};

const CLIENT_KEY_STORAGE = 'fasted-meal-ideas-client-key';
const CACHE_STORAGE = 'fasted-meal-ideas-cache-v1';
const RATE_STORAGE = 'fasted-meal-ideas-rate-v1';
const CLIENT_DAILY_LIMIT = 12;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CacheRecord = {
  key: string;
  savedAt: number;
  result: MealIdeasApiResult;
};

type RateRecord = {
  day: string;
  count: number;
};

function getClientKey(): string {
  try {
    const existing = localStorage.getItem(CLIENT_KEY_STORAGE);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY_STORAGE, next);
    return next;
  } catch {
    return 'anonymous';
  }
}

export function buildMealIdeasCacheKey(payload: MealIdeasRequestPayload): string {
  const kitchen = [...payload.kitchen]
    .map((item) => `${item.category}:${item.name}:${item.useSoon ? 1 : 0}`)
    .sort()
    .join('|');
  const profile = [
    payload.profile.goal ?? '',
    payload.profile.allergies ?? '',
    payload.profile.foodsAvoid ?? '',
    String(payload.profile.preferredMeals ?? 3),
    payload.profile.activityLevel ?? '',
  ].join('|');
  return [payload.scope, payload.referenceDate, kitchen, profile, payload.phaseRules.join('|')].join(
    '::',
  );
}

function readCache(cacheKey: string): MealIdeasApiResult | null {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE);
    if (!raw) return null;
    const record = JSON.parse(raw) as CacheRecord;
    if (record.key !== cacheKey) return null;
    if (Date.now() - record.savedAt > CACHE_TTL_MS) return null;
    return { ...record.result, cached: true };
  } catch {
    return null;
  }
}

function writeCache(cacheKey: string, result: MealIdeasApiResult): void {
  try {
    const record: CacheRecord = {
      key: cacheKey,
      savedAt: Date.now(),
      result: { ...result, cached: false },
    };
    localStorage.setItem(CACHE_STORAGE, JSON.stringify(record));
  } catch {
    // ignore quota errors
  }
}

function readRate(day: string): number {
  try {
    const raw = localStorage.getItem(RATE_STORAGE);
    if (!raw) return 0;
    const record = JSON.parse(raw) as RateRecord;
    return record.day === day ? record.count : 0;
  } catch {
    return 0;
  }
}

function writeRate(day: string, count: number): void {
  try {
    localStorage.setItem(RATE_STORAGE, JSON.stringify({ day, count } satisfies RateRecord));
  } catch {
    // ignore
  }
}

export function getMealIdeasRemainingToday(day: string): number {
  return Math.max(0, CLIENT_DAILY_LIMIT - readRate(day));
}

function parseAvoidTerms(profile: MealIdeasRequestPayload['profile']): string[] {
  return [profile.allergies, profile.foodsAvoid]
    .flatMap((text) => (text ?? '').split(/[,;]/))
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

/** Client-side safety filter mirroring the server check. */
export function filterMealsForAvoidList(
  meals: GeneratedMealIdea[],
  profile: MealIdeasRequestPayload['profile'],
): GeneratedMealIdea[] {
  const avoidTerms = parseAvoidTerms(profile);
  if (avoidTerms.length === 0) return meals;
  return meals.filter((meal) => {
    const haystack = [meal.name, ...meal.ingredients, ...meal.portions, ...meal.prepSteps].join(' ');
    return !isFoodAvoided(haystack, avoidTerms);
  });
}

export async function requestMealIdeas(
  payload: MealIdeasRequestPayload,
): Promise<MealIdeasApiResult> {
  const cacheKey = buildMealIdeasCacheKey(payload);
  if (!payload.regenerate) {
    const cached = readCache(cacheKey);
    if (cached) return cached;
  }

  const used = readRate(payload.referenceDate);
  if (used >= CLIENT_DAILY_LIMIT) {
    throw new MealIdeasError(
      `Daily meal-idea limit reached (${CLIENT_DAILY_LIMIT}). Showing your checklist instead.`,
      true,
      429,
    );
  }

  let response: Response;
  try {
    response = await fetch('/api/meal-ideas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Key': getClientKey(),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new MealIdeasError(
      'Could not reach meal ideas. Showing your checklist instead.',
      true,
      0,
    );
  }

  const data = (await response.json().catch(() => ({}))) as {
    meals?: GeneratedMealIdea[];
    cached?: boolean;
    model?: string;
    remainingToday?: number;
    error?: string;
    fallback?: boolean;
  };

  if (!response.ok) {
    throw new MealIdeasError(
      data.error ?? 'Meal ideas unavailable. Showing your checklist instead.',
      data.fallback !== false,
      response.status,
    );
  }

  const meals = filterMealsForAvoidList(data.meals ?? [], payload.profile);
  if (meals.length === 0) {
    throw new MealIdeasError(
      'No safe meal ideas returned. Showing your checklist instead.',
      true,
      502,
    );
  }

  const nextCount = used + (data.cached ? 0 : 1);
  if (!data.cached) writeRate(payload.referenceDate, nextCount);

  const result: MealIdeasApiResult = {
    meals,
    cached: data.cached,
    model: data.model,
    remainingToday: data.remainingToday ?? Math.max(0, CLIENT_DAILY_LIMIT - nextCount),
  };
  writeCache(cacheKey, result);
  return result;
}

export class MealIdeasError extends Error {
  fallback: boolean;
  status: number;

  constructor(message: string, fallback: boolean, status: number) {
    super(message);
    this.name = 'MealIdeasError';
    this.fallback = fallback;
    this.status = status;
  }
}

export const MEAL_IDEAS_CLIENT_DAILY_LIMIT = CLIENT_DAILY_LIMIT;
