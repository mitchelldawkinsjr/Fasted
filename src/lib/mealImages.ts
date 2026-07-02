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

function encodeCanvasAsJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  fallback: string,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return fallback;
  }
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', MEAL_IMAGE_JPEG_QUALITY);
}

/** Downscale and re-encode meal photos before persisting to localStorage. */
function compressMealImageDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MEAL_IMAGE_MAX_DIMENSION / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      resolve(encodeCanvasAsJpeg(img, width, height, dataUrl));
    };
    img.onerror = () => reject(new Error('Could not process the selected image.'));
    img.src = dataUrl;
  });
}

async function compressMealImageFile(file: File): Promise<string> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      try {
        const scale = Math.min(1, MEAL_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const dataUrl = await readImageAsDataUrl(file);
        return encodeCanvasAsJpeg(bitmap, width, height, dataUrl);
      } finally {
        bitmap.close();
      }
    } catch {
      // Fall back to data-url compression when createImageBitmap is unavailable.
    }
  }

  const dataUrl = await readImageAsDataUrl(file);
  return compressMealImageDataUrl(dataUrl);
}

export function mealSectionHasImages(images: MealSectionImages): boolean {
  return Object.values(images).some((section) => section && section.length > 0);
}

export function clampMealSectionImages(
  images: MealSectionImages,
): { images: MealSectionImages; changed: boolean } {
  let changed = false;
  const clamped: MealSectionImages = {};
  for (const [key, section] of Object.entries(images)) {
    if (section && section.length > 0) {
      if (section.length > MAX_MEAL_IMAGES_PER_SECTION) {
        changed = true;
      }
      clamped[key as FoodMealKey] = section.slice(0, MAX_MEAL_IMAGES_PER_SECTION);
    }
  }
  return { images: clamped, changed };
}

export function normalizeMealImagesRecord(
  record: Record<string, MealSectionImages>,
): { record: Record<string, MealSectionImages>; changed: boolean; truncated: boolean } {
  let changed = false;
  let truncated = false;
  const normalized: Record<string, MealSectionImages> = {};

  for (const [entryId, images] of Object.entries(record)) {
    const { images: clamped, changed: sectionChanged } = clampMealSectionImages(images);
    if (sectionChanged) {
      changed = true;
      truncated = true;
    }

    const hasImages = Object.values(clamped).some((section) => section && section.length > 0);
    if (hasImages) {
      normalized[entryId] = clamped;
    } else if (images && Object.keys(images).length > 0) {
      changed = true;
    }
  }

  if (Object.keys(record).length !== Object.keys(normalized).length) {
    changed = true;
  }

  return { record: normalized, changed, truncated };
}

export async function appendMealImages(
  current: string[],
  files: FileList | File[],
): Promise<AppendMealImagesResult> {
  const fileList = Array.from(files);
  const remaining = MAX_MEAL_IMAGES_PER_SECTION - current.length;

  if (remaining <= 0) {
    return { images: current, rejectedCount: fileList.length };
  }

  const accepted = fileList.slice(0, remaining);
  const rejectedCount = fileList.length - accepted.length;
  const nextImages = await Promise.all(accepted.map(compressMealImageFile));

  return {
    images: [...current, ...nextImages],
    rejectedCount,
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
