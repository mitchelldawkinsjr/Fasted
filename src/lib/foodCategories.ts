import type { KitchenCategory } from '../types';

export const KITCHEN_CATEGORY_LABELS: Record<KitchenCategory, string> = {
  protein: 'Protein',
  vegetables: 'Vegetables',
  fruit: 'Fruit',
  carbohydrates: 'Carbohydrates',
  healthyFats: 'Healthy Fats',
  drinks: 'Drinks',
};

export const COMMON_KITCHEN_FOODS: Record<KitchenCategory, string[]> = {
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
  drinks: ['Water', 'Sparkling water', 'Juice', 'Herbal tea'],
};

export const FOOD_GOAL_LABELS: Record<
  import('../types').FoodGoal,
  string
> = {
  'lose-body-fat': 'Lose body fat',
  maintain: 'Maintain weight',
  'gain-muscle': 'Gain weight or muscle',
  wellness: 'Support general wellness',
};

export const MEAL_PLAN_SCOPE_LABELS: Record<
  import('../types').MealPlanScope,
  string
> = {
  'next-meal': 'My next meal',
  today: "Today's meals",
  tomorrow: "Tomorrow's meals",
  week: 'My week',
  'post-fast': 'My post-fast meal',
  'grocery-list': 'A grocery list',
};
