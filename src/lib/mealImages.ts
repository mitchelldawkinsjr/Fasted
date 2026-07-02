import type { FoodMealKey, MealSectionImages } from '../types';
import { MAX_MEAL_IMAGES_PER_SECTION } from '../types';

export const MEAL_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/** Max edge length for stored meal photos (keeps localStorage usage reasonable). */
export const MEAL_IMAGE_MAX_DIMENSION = 1200;
export const MEAL_IMAGE_JPEG_QUALITY = 0.82;

export type AppendMealImagesResult = {
  images: string[];
  /** Files not added because the section is at the limit. */
  rejectedCount: number;
  /** True when the section was already full before this selection. */
  atLimit: boolean;
};

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

/** Downscale and re-encode meal photos before persisting to localStorage. */
export function compressMealImageDataUrl(
  dataUrl: string,
  maxDimension = MEAL_IMAGE_MAX_DIMENSION,
  quality = MEAL_IMAGE_JPEG_QUALITY,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Could not process the selected image.'));
    img.src = dataUrl;
  });
}

export async function prepareMealImage(file: File): Promise<string> {
  const dataUrl = await readImageAsDataUrl(file);
  return compressMealImageDataUrl(dataUrl);
}

export function mealSectionHasImages(images: MealSectionImages): boolean {
  return Object.values(images).some((section) => section && section.length > 0);
}

export function clampMealSectionImages(images: MealSectionImages): MealSectionImages {
  const clamped: MealSectionImages = {};
  for (const [key, section] of Object.entries(images)) {
    if (section && section.length > 0) {
      clamped[key as FoodMealKey] = section.slice(0, MAX_MEAL_IMAGES_PER_SECTION);
    }
  }
  return clamped;
}

export async function appendMealImages(
  current: string[],
  files: FileList | File[],
  max = MAX_MEAL_IMAGES_PER_SECTION,
): Promise<AppendMealImagesResult> {
  const fileList = Array.from(files);
  const remaining = max - current.length;

  if (remaining <= 0) {
    return { images: current, rejectedCount: fileList.length, atLimit: true };
  }

  const accepted = fileList.slice(0, remaining);
  const rejectedCount = fileList.length - accepted.length;
  const nextImages = await Promise.all(accepted.map(prepareMealImage));

  return {
    images: [...current, ...nextImages],
    rejectedCount,
    atLimit: false,
  };
}

export function emptyMealSectionImages(): Record<FoodMealKey, string[]> {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}
