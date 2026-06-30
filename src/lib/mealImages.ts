import type { FoodMealKey, MealSectionImages } from '../types';
import { MAX_MEAL_IMAGES_PER_SECTION } from '../types';

export const MEAL_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files are supported.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read the selected image.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}

export function mealSectionHasImages(images: MealSectionImages): boolean {
  return Object.values(images).some((section) => section && section.length > 0);
}

export function appendMealImages(
  current: string[],
  files: FileList | File[],
  max = MAX_MEAL_IMAGES_PER_SECTION,
): Promise<string[]> {
  const remaining = max - current.length;
  if (remaining <= 0) {
    return Promise.resolve(current);
  }

  const selected = Array.from(files).slice(0, remaining);
  return Promise.all(selected.map(readImageAsDataUrl)).then((next) => [...current, ...next]);
}

export function emptyMealSectionImages(): Record<FoodMealKey, string[]> {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}
