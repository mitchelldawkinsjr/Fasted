import type { FoodMealKey, MealSectionImages } from '../types';
import { MAX_MEAL_IMAGES_PER_SECTION } from '../types';
import { putImage } from './imageStore';

export const MEAL_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const MAX_EDGE_PX = 1280;
const JPEG_QUALITY = 0.8;

export function mealSectionHasImages(images: MealSectionImages): boolean {
  return Object.values(images).some((section) => section && section.length > 0);
}

export function emptyMealSectionImages(): Record<FoodMealKey, string[]> {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}

export function collectMealImageIds(images: MealSectionImages | undefined): string[] {
  if (!images) return [];
  return Object.values(images)
    .flatMap((section) => section ?? [])
    .filter((value) => !value.startsWith('data:'));
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the selected image.'));
    };
    image.src = url;
  });
}

export async function compressImageFile(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported.');
  }

  const image = await loadImageElement(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not process the selected image.');
  }
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });
  if (!blob) {
    throw new Error('Could not process the selected image.');
  }
  return blob;
}

export async function storeMealImage(file: File, scope: string): Promise<string> {
  const blob = await compressImageFile(file);
  const id = crypto.randomUUID();
  await putImage(scope, id, blob, { synced: false });
  return id;
}

export async function appendMealImages(
  current: string[],
  files: FileList | File[],
  scope: string,
  max = MAX_MEAL_IMAGES_PER_SECTION,
): Promise<string[]> {
  const remaining = max - current.length;
  if (remaining <= 0) {
    return current;
  }

  const selected = Array.from(files).slice(0, remaining);
  const ids = await Promise.all(selected.map((file) => storeMealImage(file, scope)));
  return [...current, ...ids];
}
