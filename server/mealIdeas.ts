/**
 * Server-side meal idea generation (OpenAI). Used by the Vite middleware plugin.
 * Never import this from the Vite client bundle.
 */

export type MealIdeasRequest = {
  scope: string;
  referenceDate: string;
  profile: {
    goal?: string;
    allergies?: string;
    foodsAvoid?: string;
    preferredMeals?: number;
    activityLevel?: string;
  };
  kitchen: Array<{
    name: string;
    category: string;
    useSoon?: boolean;
    quantity?: string;
  }>;
  phaseRules: string[];
  dietaryNotes?: string[];
  mealCount?: number;
};

export type GeneratedMealIdea = {
  name: string;
  label: string;
  ingredients: string[];
  portions: string[];
  prepSteps: string[];
  prepMinutes?: number;
  phaseNotes?: string;
};

export type MealIdeasResponse = {
  meals: GeneratedMealIdea[];
  cached?: boolean;
  model?: string;
};

type CacheEntry = {
  expiresAt: number;
  body: MealIdeasResponse;
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_REGENERATIONS_PER_DAY = 12;
const cache = new Map<string, CacheEntry>();
const dailyCounts = new Map<string, { day: string; count: number }>();

function parseAvoidTerms(...texts: Array<string | undefined>): string[] {
  return texts
    .flatMap((text) => (text ?? '').split(/[,;]/))
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

export function isFoodAvoided(name: string, avoidTerms: string[]): boolean {
  if (avoidTerms.length === 0) return false;
  const lower = name.toLowerCase();
  return avoidTerms.some((term) => lower.includes(term) || term.includes(lower));
}

export function buildCacheKey(body: MealIdeasRequest): string {
  const kitchen = [...body.kitchen]
    .map((item) => `${item.category}:${item.name}:${item.useSoon ? 1 : 0}`)
    .sort()
    .join('|');
  const profile = [
    body.profile.goal ?? '',
    body.profile.allergies ?? '',
    body.profile.foodsAvoid ?? '',
    String(body.profile.preferredMeals ?? 3),
    body.profile.activityLevel ?? '',
  ].join('|');
  const rules = body.phaseRules.join('|');
  return [body.scope, body.referenceDate, kitchen, profile, rules].join('::');
}

export function getDailyGenerationCount(clientKey: string, day: string): number {
  const entry = dailyCounts.get(clientKey);
  if (!entry || entry.day !== day) return 0;
  return entry.count;
}

export function incrementDailyGenerationCount(clientKey: string, day: string): number {
  const next = getDailyGenerationCount(clientKey, day) + 1;
  dailyCounts.set(clientKey, { day, count: next });
  return next;
}

export function getCachedMealIdeas(cacheKey: string): MealIdeasResponse | null {
  const entry = cache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(cacheKey);
    return null;
  }
  return { ...entry.body, cached: true };
}

export function setCachedMealIdeas(cacheKey: string, body: MealIdeasResponse): void {
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, body: { ...body, cached: false } });
}

/** Drop meals that mention allergy/avoid terms in name, ingredients, or portions. */
export function validateMealsAgainstAvoidList(
  meals: GeneratedMealIdea[],
  avoidTerms: string[],
): GeneratedMealIdea[] {
  if (avoidTerms.length === 0) return meals;
  return meals.filter((meal) => {
    const haystack = [meal.name, ...meal.ingredients, ...meal.portions, ...(meal.prepSteps ?? [])].join(
      ' ',
    );
    return !isFoodAvoided(haystack, avoidTerms);
  });
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(candidate);
}

function normalizeMeals(raw: unknown): GeneratedMealIdea[] {
  if (!raw || typeof raw !== 'object') return [];
  const meals = (raw as { meals?: unknown }).meals;
  if (!Array.isArray(meals)) return [];

  return meals
    .map((meal): GeneratedMealIdea | null => {
      if (!meal || typeof meal !== 'object') return null;
      const m = meal as Record<string, unknown>;
      const name = typeof m.name === 'string' ? m.name.trim() : '';
      const label = typeof m.label === 'string' ? m.label.trim() : 'Meal';
      if (!name) return null;
      const asStringArray = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.filter((item): item is string => typeof item === 'string').map((s) => s.trim()).filter(Boolean)
          : [];
      return {
        name,
        label,
        ingredients: asStringArray(m.ingredients),
        portions: asStringArray(m.portions),
        prepSteps: asStringArray(m.prepSteps),
        prepMinutes: typeof m.prepMinutes === 'number' ? m.prepMinutes : undefined,
        phaseNotes: typeof m.phaseNotes === 'string' ? m.phaseNotes.trim() : undefined,
      };
    })
    .filter((meal): meal is GeneratedMealIdea => meal !== null);
}

function buildSystemPrompt(): string {
  return [
    'You are a practical home-cooking meal planner for people on a spiritual fasting journey.',
    'Return ONLY valid JSON with this shape:',
    '{"meals":[{"name":"string","label":"string","ingredients":["string"],"portions":["string"],"prepSteps":["string"],"prepMinutes":20,"phaseNotes":"string"}]}',
    'Rules:',
    '- Create named dishes (not ingredient checklists). Prefer kitchen inventory items, especially use-soon.',
    '- Respect phase dietary rules and never include allergy/avoid foods.',
    '- Keep prep simple (home cook, ~15–30 minutes when possible).',
    '- Guidance over restriction. No medical claims. No guilt language.',
    '- If kitchen is empty, suggest simple pantry-friendly meals and note what to buy.',
    '- Match meal count / scope from the user request.',
  ].join('\n');
}

function buildUserPrompt(body: MealIdeasRequest): string {
  const mealCount = body.mealCount ?? body.profile.preferredMeals ?? 3;
  return JSON.stringify(
    {
      scope: body.scope,
      referenceDate: body.referenceDate,
      mealCount,
      goal: body.profile.goal ?? 'wellness',
      allergies: body.profile.allergies ?? '',
      foodsAvoid: body.profile.foodsAvoid ?? '',
      kitchen: body.kitchen,
      phaseRules: body.phaseRules,
      dietaryNotes: body.dietaryNotes ?? [],
      instruction:
        'Generate concrete meal ideas for this scope. Prefer use-soon kitchen items. Name each dish.',
    },
    null,
    2,
  );
}

export async function generateMealIdeasWithOpenAI(
  body: MealIdeasRequest,
  options: { apiKey: string; model: string; bypassCache?: boolean; clientKey?: string },
): Promise<MealIdeasResponse & { remainingToday: number }> {
  const day = body.referenceDate;
  const clientKey = options.clientKey ?? 'anonymous';
  const used = getDailyGenerationCount(clientKey, day);
  if (used >= MAX_REGENERATIONS_PER_DAY) {
    const err = new Error(
      `Daily meal-idea limit reached (${MAX_REGENERATIONS_PER_DAY}). Try again tomorrow.`,
    );
    (err as Error & { status: number }).status = 429;
    throw err;
  }

  const cacheKey = buildCacheKey(body);
  if (!options.bypassCache) {
    const cached = getCachedMealIdeas(cacheKey);
    if (cached) {
      return {
        ...cached,
        remainingToday: MAX_REGENERATIONS_PER_DAY - used,
      };
    }
  }

  const avoidTerms = parseAvoidTerms(body.profile.allergies, body.profile.foodsAvoid);

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(body) },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text().catch(() => '');
    const err = new Error(`OpenAI request failed (${openaiRes.status}). ${detail.slice(0, 200)}`);
    (err as Error & { status: number }).status = 502;
    throw err;
  }

  const payload = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? '';
  if (!content) {
    const err = new Error('Empty response from meal idea model.');
    (err as Error & { status: number }).status = 502;
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = extractJsonObject(content);
  } catch {
    const err = new Error('Model returned invalid JSON.');
    (err as Error & { status: number }).status = 502;
    throw err;
  }

  const meals = validateMealsAgainstAvoidList(normalizeMeals(parsed), avoidTerms);
  if (meals.length === 0) {
    const err = new Error('No valid meals returned after safety filtering.');
    (err as Error & { status: number }).status = 502;
    throw err;
  }

  const count = incrementDailyGenerationCount(clientKey, day);
  const response: MealIdeasResponse = {
    meals,
    cached: false,
    model: options.model,
  };
  setCachedMealIdeas(cacheKey, response);
  return {
    ...response,
    remainingToday: MAX_REGENERATIONS_PER_DAY - count,
  };
}

export const MEAL_IDEAS_DAILY_LIMIT = MAX_REGENERATIONS_PER_DAY;
