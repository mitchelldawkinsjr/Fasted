import { useMemo, useState } from 'react';
import { Icon } from '../Icon';
import { useActiveJourney } from '../../hooks/useActiveJourney';
import { useProgress } from '../../hooks/useProgress';
import { getDailyPlan } from '../../lib/dailyPlan';
import { getLocalDateString } from '../../lib/dateUtils';
import {
  calculateDailyTargets,
  generateMealPlan,
  getPhaseDietaryRules,
  getPlanSectionHeading,
  getPlateSegments,
  isFoodAvoided,
} from '../../lib/foodPlan';
import {
  getMealIdeasRemainingToday,
  MealIdeasError,
  requestMealIdeas,
  type GeneratedMealIdea,
} from '../../lib/mealIdeas';
import {
  getFoodPlanCheckIn,
  removeFavoriteMealIdea,
  removeKitchenItem,
  saveFavoriteMealIdea,
  saveFoodPlanCheckIn,
  saveFoodProfile,
  saveKitchenItem,
} from '../../lib/storage';
import { toast } from '../../lib/toast';
import type {
  FoodGoal,
  FoodPlanCheckIn,
  FoodProfile,
  KitchenCategory,
  KitchenItem,
  MealPlanScope,
} from '../../types';

type Props = {
  onLogFood?: () => void;
};

const INPUT_CLASS =
  'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

const FOOD_GOAL_LABELS: Record<FoodGoal, string> = {
  'lose-body-fat': 'Lose body fat',
  maintain: 'Maintain weight',
  'gain-muscle': 'Gain weight or muscle',
  wellness: 'Support general wellness',
};

const MEAL_PLAN_SCOPE_LABELS: Record<MealPlanScope, string> = {
  'next-meal': 'My next meal',
  today: "Today's meals",
  tomorrow: "Tomorrow's meals",
  week: 'My week',
  'post-fast': 'My post-fast meal',
  'grocery-list': 'A grocery list',
};

const KITCHEN_CATEGORY_LABELS: Record<KitchenCategory, string> = {
  protein: 'Protein',
  vegetables: 'Vegetables',
  fruit: 'Fruit',
  carbohydrates: 'Carbohydrates',
  healthyFats: 'Healthy Fats',
};

const COMMON_KITCHEN_FOODS: Record<KitchenCategory, string[]> = {
  protein: [
    'Chicken breast',
    'Ground turkey',
    'Eggs',
    'Greek yogurt',
    'Tuna',
    'Salmon',
    'Black beans',
  ],
  vegetables: ['Broccoli', 'Spinach', 'Green beans', 'Mixed vegetables', 'Carrots', 'Bell peppers'],
  fruit: ['Apples', 'Bananas', 'Strawberries', 'Blueberries', 'Oranges'],
  carbohydrates: ['Brown rice', 'Potatoes', 'Oats', 'Whole-grain bread', 'Quinoa'],
  healthyFats: ['Avocado', 'Olive oil', 'Nuts', 'Peanut butter', 'Almonds'],
};

const FOOD_GOALS = Object.keys(FOOD_GOAL_LABELS) as FoodGoal[];
const MEAL_SCOPES = Object.keys(MEAL_PLAN_SCOPE_LABELS) as MealPlanScope[];
const KITCHEN_CATEGORIES = Object.keys(KITCHEN_CATEGORY_LABELS) as KitchenCategory[];

export function PlanMyFoodPanel({ onLogFood }: Props) {
  const progress = useProgress();
  const { journey, getPhaseForDate } = useActiveJourney();
  const today = getLocalDateString();
  const phase = getPhaseForDate(today);
  const plan = getDailyPlan(today, journey);

  const savedProfile = progress.foodProfile;
  const inventory = progress.kitchenInventory ?? [];
  const favorites = progress.favoriteMealIdeas ?? [];

  const [goal, setGoal] = useState<FoodGoal>(savedProfile?.goal ?? 'wellness');
  const [profileOpen, setProfileOpen] = useState(!savedProfile?.age);
  const [kitchenOpen, setKitchenOpen] = useState(false);
  const [showNutritionDetails, setShowNutritionDetails] = useState(false);
  const [planScope, setPlanScope] = useState<MealPlanScope>('today');

  const [profileForm, setProfileForm] = useState<Partial<FoodProfile>>({
    age: savedProfile?.age,
    sex: savedProfile?.sex,
    heightInches: savedProfile?.heightInches,
    weightLbs: savedProfile?.weightLbs,
    activityLevel: savedProfile?.activityLevel ?? 'moderate',
    allergies: savedProfile?.allergies ?? '',
    foodsAvoid: savedProfile?.foodsAvoid ?? '',
    preferredMeals: savedProfile?.preferredMeals ?? 3,
  });

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<KitchenCategory>('protein');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUseSoon, setNewItemUseSoon] = useState(false);

  const [llmMeals, setLlmMeals] = useState<GeneratedMealIdea[] | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmMeta, setLlmMeta] = useState<{ cached?: boolean; remainingToday?: number } | null>(
    null,
  );

  const profile: FoodProfile = useMemo(
    () => ({ ...profileForm, goal } as FoodProfile),
    [profileForm, goal],
  );

  const targets = useMemo(() => calculateDailyTargets(profile), [profile]);
  const mealPlan = useMemo(
    () => (plan ? generateMealPlan(planScope, inventory, journey, today, profile) : null),
    [planScope, inventory, journey, today, profile, plan],
  );
  const plateSegments = useMemo(
    () => (plan ? getPlateSegments(phase, plan, goal, planScope) : []),
    [phase, plan, goal, planScope],
  );
  const dietaryRules = useMemo(
    () => (plan ? getPhaseDietaryRules(phase, plan) : []),
    [phase, plan],
  );

  const existingCheckIn = getFoodPlanCheckIn(today);
  const [checkIn, setCheckIn] = useState<Partial<FoodPlanCheckIn>>(
    existingCheckIn ?? {
      date: today,
      followedPlan: null,
      enoughProtein: null,
      ateVegetables: null,
      drankWater: null,
      hunger: null,
      energy: null,
      ateOutsidePlan: null,
    },
  );

  const avoidTerms = useMemo(
    () =>
      [
        ...(profile.allergies?.split(/[,;]/) ?? []),
        ...(profile.foodsAvoid?.split(/[,;]/) ?? []),
      ]
        .map((term) => term.trim().toLowerCase())
        .filter(Boolean),
    [profile.allergies, profile.foodsAvoid],
  );

  const quickAddFoods = useMemo(
    () => COMMON_KITCHEN_FOODS.protein.filter((food) => !isFoodAvoided(food, avoidTerms)).slice(0, 4),
    [avoidTerms],
  );

  const handleSaveGoal = (nextGoal: FoodGoal) => {
    setGoal(nextGoal);
    saveFoodProfile({ ...profile, goal: nextGoal });
    toast.info('Goal saved.');
  };

  const handleSaveProfile = () => {
    saveFoodProfile({ ...profileForm, goal } as FoodProfile);
    setProfileOpen(false);
    toast.info('Food profile saved.');
  };

  const handleAddKitchenItem = (name?: string, category?: KitchenCategory) => {
    const itemName = (name ?? newItemName).trim();
    if (!itemName) return;
    const item: KitchenItem = {
      id: crypto.randomUUID(),
      name: itemName,
      category: category ?? newItemCategory,
      quantity: newItemQuantity || undefined,
      servingCount: 2,
      useSoon: newItemUseSoon,
      addedAt: new Date().toISOString(),
    };
    saveKitchenItem(item);
    setNewItemName('');
    setNewItemQuantity('');
    setNewItemUseSoon(false);
    toast.info(`${itemName} added to My Kitchen.`);
  };

  const handleSaveCheckIn = () => {
    saveFoodPlanCheckIn({
      date: today,
      followedPlan: checkIn.followedPlan ?? null,
      enoughProtein: checkIn.enoughProtein ?? null,
      ateVegetables: checkIn.ateVegetables ?? null,
      drankWater: checkIn.drankWater ?? null,
      hunger: checkIn.hunger ?? null,
      energy: checkIn.energy ?? null,
      ateOutsidePlan: checkIn.ateOutsidePlan ?? null,
    });
    toast.info('Food check-in saved.');
  };

  const handleGenerateMealIdeas = async (regenerate = false) => {
    if (mealPlan?.isFastDay) {
      toast.info('Fasting day — meal ideas are available on eating days or for post-fast.');
      return;
    }
    if (planScope === 'grocery-list') {
      toast.info('Switch to a meal scope to generate dish ideas.');
      return;
    }

    setLlmLoading(true);
    setLlmError(null);
    try {
      const result = await requestMealIdeas({
        scope: planScope,
        referenceDate: today,
        profile: {
          goal: profile.goal,
          allergies: profile.allergies,
          foodsAvoid: profile.foodsAvoid,
          preferredMeals: profile.preferredMeals,
          activityLevel: profile.activityLevel,
        },
        kitchen: inventory.map((item) => ({
          name: item.name,
          category: item.category,
          useSoon: item.useSoon,
          quantity: item.quantity,
        })),
        phaseRules: dietaryRules,
        mealCount: profile.preferredMeals ?? 3,
        regenerate,
      });
      setLlmMeals(result.meals);
      setLlmMeta({ cached: result.cached, remainingToday: result.remainingToday });
      toast.info(result.cached ? 'Showing saved meal ideas for these inputs.' : 'Meal ideas ready.');
    } catch (error) {
      const message =
        error instanceof MealIdeasError
          ? error.message
          : 'Meal ideas unavailable. Showing your checklist instead.';
      setLlmError(message);
      setLlmMeals(null);
      toast.info(message);
    } finally {
      setLlmLoading(false);
    }
  };

  const handleSaveFavorite = (meal: GeneratedMealIdea) => {
    saveFavoriteMealIdea(meal);
    toast.info(`Saved “${meal.name}” to favorites.`);
  };

  const remainingIdeas = llmMeta?.remainingToday ?? getMealIdeasRemainingToday(today);

  if (!plan) {
    return (
      <section className="stitch-card p-stack-lg text-center">
        <p className="text-body-md text-on-surface-variant">
          Set up your fasting journey to use Plan My Food.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-stack-lg">
      <header className="space-y-1">
        <h2 className="font-display text-headline-lg-mobile text-primary">Plan My Food</h2>
        <p className="text-body-md text-on-surface-variant">
          Current phase: {phase?.title ?? 'Unknown'}
        </p>
        <p className="text-body-md text-on-surface-variant">
          Today: {plan.isFastDay ? 'Fasting day' : 'Regular eating day'}
        </p>
        <p className="text-body-md text-on-surface-variant">
          Goal: {FOOD_GOAL_LABELS[goal]}
        </p>
      </header>

      <p className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
        Grace over guilt. Guidance over restriction. This tool offers practical suggestions — consult
        a clinician for medical or dietary concerns.
      </p>

      {/* Phase confirmation */}
      <section className="stitch-card space-y-stack-md p-stack-md">
        <h3 className="font-display text-headline-md text-primary">Current Phase Rules</h3>
        <ul className="space-y-2">
          {dietaryRules.map((rule) => (
            <li key={rule} className="flex gap-2 text-body-md text-on-surface-variant">
              <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-secondary" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Goal selection */}
      <section className="stitch-card space-y-stack-md p-stack-md">
        <h3 className="font-display text-headline-md text-primary">Your Goal</h3>
        <div className="grid grid-cols-2 gap-2">
          {FOOD_GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => handleSaveGoal(g)}
              className={`rounded-full px-3 py-2 text-label-caps transition-all ${
                goal === g
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'border border-outline-variant bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {FOOD_GOAL_LABELS[g]}
            </button>
          ))}
        </div>
      </section>

      {/* Food Profile */}
      <section className="stitch-card space-y-stack-md p-stack-md">
        <button
          type="button"
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex w-full items-center justify-between text-left"
        >
          <h3 className="font-display text-headline-md text-primary">My Food Profile</h3>
          <Icon name={profileOpen ? 'expand_less' : 'expand_more'} />
        </button>
        {profileOpen && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-label-caps text-on-surface-variant">Age</span>
                <input
                  type="number"
                  min={13}
                  max={120}
                  value={profileForm.age ?? ''}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, age: Number(e.target.value) || undefined })
                  }
                  className={INPUT_CLASS}
                />
              </label>
              <label className="space-y-1">
                <span className="text-label-caps text-on-surface-variant">Sex</span>
                <select
                  value={profileForm.sex ?? ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      sex: (e.target.value || undefined) as FoodProfile['sex'],
                    })
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-label-caps text-on-surface-variant">Height (in)</span>
                <input
                  type="number"
                  min={48}
                  max={96}
                  value={profileForm.heightInches ?? ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      heightInches: Number(e.target.value) || undefined,
                    })
                  }
                  className={INPUT_CLASS}
                />
              </label>
              <label className="space-y-1">
                <span className="text-label-caps text-on-surface-variant">Weight (lbs)</span>
                <input
                  type="number"
                  min={80}
                  max={500}
                  value={profileForm.weightLbs ?? ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      weightLbs: Number(e.target.value) || undefined,
                    })
                  }
                  className={INPUT_CLASS}
                />
              </label>
              <label className="space-y-1">
                <span className="text-label-caps text-on-surface-variant">Activity level</span>
                <select
                  value={profileForm.activityLevel ?? 'moderate'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      activityLevel: e.target.value as FoodProfile['activityLevel'],
                    })
                  }
                  className={INPUT_CLASS}
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                  <option value="very-active">Very active</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-label-caps text-on-surface-variant">Meals per day</span>
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={profileForm.preferredMeals ?? 3}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      preferredMeals: Number(e.target.value) || 3,
                    })
                  }
                  className={INPUT_CLASS}
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-label-caps text-on-surface-variant">Allergies</span>
              <input
                type="text"
                value={profileForm.allergies ?? ''}
                onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                className={INPUT_CLASS}
                placeholder="e.g. nuts, shellfish"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-label-caps text-on-surface-variant">Foods to avoid</span>
              <input
                type="text"
                value={profileForm.foodsAvoid ?? ''}
                onChange={(e) => setProfileForm({ ...profileForm, foodsAvoid: e.target.value })}
                className={INPUT_CLASS}
              />
            </label>
            <button type="button" onClick={handleSaveProfile} className="btn-stitch-primary">
              Save Profile
            </button>
          </div>
        )}
      </section>

      {/* My Kitchen */}
      <section className="stitch-card space-y-stack-md p-stack-md">
        <button
          type="button"
          onClick={() => setKitchenOpen(!kitchenOpen)}
          className="flex w-full items-center justify-between text-left"
        >
          <h3 className="font-display text-headline-md text-primary">
            My Kitchen ({inventory.length})
          </h3>
          <Icon name={kitchenOpen ? 'expand_less' : 'expand_more'} />
        </button>
        {kitchenOpen && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {KITCHEN_CATEGORIES.map((cat) => (
                <span
                  key={cat}
                  className="rounded-full bg-surface-container px-3 py-1 text-label-caps text-on-surface-variant"
                >
                  {KITCHEN_CATEGORY_LABELS[cat]}:{' '}
                  {inventory.filter((i) => i.category === cat).length}
                </span>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-label-caps text-on-surface-variant">Quick add common foods</p>
              <div className="flex flex-wrap gap-2">
                {quickAddFoods.map((food) => (
                  <button
                    key={food}
                    type="button"
                    onClick={() => handleAddKitchenItem(food, 'protein')}
                    className="rounded-full border border-outline-variant px-3 py-1 text-body-sm text-on-surface-variant hover:bg-surface-container"
                  >
                    + {food}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Type a food item"
                className={INPUT_CLASS}
                aria-label="Food item name"
              />
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value as KitchenCategory)}
                className={INPUT_CLASS}
                aria-label="Food category"
              >
                {KITCHEN_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {KITCHEN_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                placeholder="Quantity (optional)"
                className={INPUT_CLASS}
                aria-label="Quantity"
              />
              <label className="flex items-center gap-2 text-body-md">
                <input
                  type="checkbox"
                  checked={newItemUseSoon}
                  onChange={(e) => setNewItemUseSoon(e.target.checked)}
                />
                Use soon
              </label>
            </div>
            <button
              type="button"
              onClick={() => handleAddKitchenItem()}
              disabled={!newItemName.trim()}
              className="btn-stitch-primary disabled:opacity-40"
            >
              Add to Kitchen
            </button>

            {inventory.length > 0 && (
              <ul className="divide-y divide-outline-variant/30">
                {inventory.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-body-md text-primary">{item.name}</span>
                      <span className="ml-2 text-body-sm text-on-surface-variant">
                        {KITCHEN_CATEGORY_LABELS[item.category]}
                        {item.useSoon && ' · Use soon'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeKitchenItem(item.id)}
                      className="text-error"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Plan scope */}
      <section className="stitch-card space-y-stack-md p-stack-md">
        <h3 className="font-display text-headline-md text-primary">What are you planning?</h3>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_SCOPES.map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => {
                setPlanScope(scope);
                setLlmMeals(null);
                setLlmError(null);
                setLlmMeta(null);
              }}
              className={`rounded-full px-3 py-2 text-label-caps transition-all ${
                planScope === scope
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {MEAL_PLAN_SCOPE_LABELS[scope]}
            </button>
          ))}
        </div>
      </section>

      {/* Today's Plan */}
      <section className="stitch-card space-y-stack-md p-stack-md">
        <h3 className="font-display text-headline-md text-primary">
          {getPlanSectionHeading(planScope, plan.isFastDay)}
        </h3>

        {mealPlan?.isFastDay ? (
          <div className="space-y-3">
            <p className="text-body-md text-on-surface-variant">
              Today is a fasting day. Focus on hydration, prayer, and your phase commitment.
            </p>
            {mealPlan.postFastGuidance && (
              <div>
                <p className="label-caps text-on-surface-variant">After sunset</p>
                <ul className="mt-2 space-y-1">
                  {mealPlan.postFastGuidance.map((tip) => (
                    <li key={tip} className="text-body-md text-on-surface-variant">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-body-md">
              <div>
                <span className="label-caps text-on-surface-variant">Protein</span>
                <p className="text-primary">
                  {targets.protein.min}–{targets.protein.max} g
                </p>
              </div>
              <div>
                <span className="label-caps text-on-surface-variant">Vegetables</span>
                <p className="text-primary">
                  {targets.vegetableCups.min}–{targets.vegetableCups.max} cups
                </p>
              </div>
              <div>
                <span className="label-caps text-on-surface-variant">Fruit</span>
                <p className="text-primary">
                  {targets.fruitServings.min}–{targets.fruitServings.max} servings
                </p>
              </div>
              <div>
                <span className="label-caps text-on-surface-variant">Water</span>
                <p className="text-primary">
                  {targets.waterOz.min}–{targets.waterOz.max} oz
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowNutritionDetails(!showNutritionDetails)}
              className="text-body-md font-medium text-secondary underline"
            >
              {showNutritionDetails ? 'Hide nutrition details' : 'See nutrition details'}
            </button>
            {showNutritionDetails && (
              <div className="grid grid-cols-2 gap-3 text-body-md">
                <div>
                  Calories: {targets.calories.min}–{targets.calories.max} kcal
                </div>
                <div>
                  Carbs: {targets.carbs.min}–{targets.carbs.max} g
                </div>
                <div>
                  Fat: {targets.fat.min}–{targets.fat.max} g
                </div>
                <div>
                  Fiber: {targets.fiber.min}–{targets.fiber.max} g
                </div>
              </div>
            )}

            {/* Plate visual */}
            <div>
              <p className="mb-2 label-caps text-on-surface-variant">Suggested plate</p>
              <div className="flex h-32 overflow-hidden rounded-xl border border-outline-variant">
                {plateSegments.map((seg) => (
                  <div
                    key={seg.label}
                    className={`flex flex-1 flex-col items-center justify-center p-2 text-center ${seg.colorClass}`}
                  >
                    <span className="text-label-caps text-primary">{seg.label}</span>
                    <span className="text-body-sm text-on-surface-variant">{seg.portion}</span>
                  </div>
                ))}
              </div>
            </div>

            {mealPlan?.useSoonNotes && mealPlan.useSoonNotes.length > 0 && (
              <p className="rounded-lg bg-secondary-container/30 px-3 py-2 text-body-md text-on-surface-variant">
                Use first: {mealPlan.useSoonNotes.join(', ')}
              </p>
            )}

            {mealPlan?.meals.map((meal) => (
              <div key={meal.label} className="rounded-lg bg-surface-container-low p-4">
                <p className="label-caps text-secondary">{meal.label}</p>
                <p className="font-display text-headline-md text-primary">{meal.name}</p>
                <ul className="mt-2 space-y-1">
                  {meal.items.map((item) => (
                    <li key={item} className="text-body-md text-on-surface-variant">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {mealPlan?.daysCoverage && (
              <p className="text-body-md text-on-surface-variant">
                You have enough food for approximately {mealPlan.daysCoverage} day
                {mealPlan.daysCoverage !== 1 ? 's' : ''} based on your kitchen inventory.
              </p>
            )}

            {planScope !== 'grocery-list' && (
              <div className="space-y-3 border-t border-outline-variant/40 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateMealIdeas(false)}
                    disabled={llmLoading}
                    className="btn-stitch-primary disabled:opacity-40"
                  >
                    {llmLoading ? 'Generating…' : 'Generate meal ideas'}
                  </button>
                  {llmMeals && (
                    <button
                      type="button"
                      onClick={() => handleGenerateMealIdeas(true)}
                      disabled={llmLoading || remainingIdeas <= 0}
                      className="btn-stitch-secondary disabled:opacity-40"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  Turns your checklist into named dishes. Optional — checklist above still works
                  offline. {remainingIdeas} generation{remainingIdeas === 1 ? '' : 's'} left today.
                </p>
                {llmError && (
                  <p className="rounded-lg bg-error-container/40 px-3 py-2 text-body-md text-on-surface">
                    {llmError}
                  </p>
                )}
                {llmMeta?.cached && !llmError && (
                  <p className="text-body-sm text-on-surface-variant">Using cached ideas for these inputs.</p>
                )}
                {llmMeals?.map((meal) => (
                  <div
                    key={`${meal.label}-${meal.name}`}
                    className="rounded-lg bg-surface-container-low p-4"
                  >
                    <p className="label-caps text-secondary">{meal.label}</p>
                    <p className="font-display text-headline-md text-primary">{meal.name}</p>
                    {typeof meal.prepMinutes === 'number' && (
                      <p className="text-body-sm text-on-surface-variant">~{meal.prepMinutes} min</p>
                    )}
                    {meal.portions.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {meal.portions.map((item) => (
                          <li key={item} className="text-body-md text-on-surface-variant">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    )}
                    {meal.prepSteps.length > 0 && (
                      <ol className="mt-3 list-decimal space-y-1 pl-5">
                        {meal.prepSteps.map((step) => (
                          <li key={step} className="text-body-md text-on-surface-variant">
                            {step}
                          </li>
                        ))}
                      </ol>
                    )}
                    {meal.phaseNotes && (
                      <p className="mt-2 text-body-sm text-on-surface-variant">{meal.phaseNotes}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSaveFavorite(meal)}
                      className="mt-3 text-body-md font-medium text-secondary underline"
                    >
                      Save favorite
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {favorites.length > 0 && (
        <section className="stitch-card space-y-stack-md p-stack-md">
          <h3 className="font-display text-headline-md text-primary">Saved meal ideas</h3>
          <ul className="space-y-3">
            {favorites.map((fav) => (
              <li
                key={fav.id}
                className="flex items-start justify-between gap-3 rounded-lg bg-surface-container-low p-3"
              >
                <div>
                  <p className="label-caps text-secondary">{fav.label}</p>
                  <p className="font-display text-headline-md text-primary">{fav.name}</p>
                  {fav.portions[0] && (
                    <p className="text-body-sm text-on-surface-variant">{fav.portions[0]}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFavoriteMealIdea(fav.id)}
                  className="text-error"
                  aria-label={`Remove favorite ${fav.name}`}
                >
                  <Icon name="close" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Food plan check-in */}
      <section className="stitch-card space-y-stack-md p-stack-md">
        <h3 className="font-display text-headline-md text-primary">Daily Food Check-in</h3>
        <CheckInToggle
          label="Did you follow your planned meals?"
          value={checkIn.followedPlan}
          onChange={(v) => setCheckIn({ ...checkIn, followedPlan: v })}
        />
        <CheckInToggle
          label="Did you eat enough protein?"
          value={checkIn.enoughProtein}
          onChange={(v) => setCheckIn({ ...checkIn, enoughProtein: v })}
        />
        <CheckInToggle
          label="Did you eat vegetables?"
          value={checkIn.ateVegetables}
          onChange={(v) => setCheckIn({ ...checkIn, ateVegetables: v })}
        />
        <CheckInToggle
          label="Did you drink water?"
          value={checkIn.drankWater}
          onChange={(v) => setCheckIn({ ...checkIn, drankWater: v })}
        />
        <div>
          <p className="mb-2 text-label-caps text-on-surface-variant">How was your hunger?</p>
          <div className="flex gap-2">
            {(['low', 'manageable', 'high'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setCheckIn({ ...checkIn, hunger: level })}
                className={`rounded-full px-3 py-1.5 text-label-caps capitalize ${
                  checkIn.hunger === level
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'border border-outline-variant text-on-surface-variant'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-label-caps text-on-surface-variant">How was your energy?</p>
          <div className="flex gap-2">
            {(['low', 'steady', 'high'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setCheckIn({ ...checkIn, energy: level })}
                className={`rounded-full px-3 py-1.5 text-label-caps capitalize ${
                  checkIn.energy === level
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'border border-outline-variant text-on-surface-variant'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <CheckInToggle
          label="Did you eat outside your plan?"
          value={checkIn.ateOutsidePlan}
          onChange={(v) => setCheckIn({ ...checkIn, ateOutsidePlan: v })}
        />
        <button type="button" onClick={handleSaveCheckIn} className="btn-stitch-primary">
          Save Check-in
        </button>
      </section>

      {onLogFood && (
        <button type="button" onClick={onLogFood} className="btn-stitch-secondary w-full">
          Log what you ate in journal
        </button>
      )}
    </div>
  );
}

function CheckInToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-body-md text-on-surface-variant">{label}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-full px-4 py-1.5 text-label-caps ${
            value === true
              ? 'bg-secondary-container text-on-secondary-container'
              : 'border border-outline-variant text-on-surface-variant'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-full px-4 py-1.5 text-label-caps ${
            value === false
              ? 'bg-secondary-container text-on-secondary-container'
              : 'border border-outline-variant text-on-surface-variant'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}
