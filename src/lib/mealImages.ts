import {
  normalizeImageScope,
  putImage,
  type ImageScope,
} from './imageStore';
import { ensureMealImageAvailable, deleteMealImagesEverywhere } from './mealImageSync';
import type { FoodMealKey, MealSectionImages } from '../types';
import { MAX_MEAL_IMAGES_PER_SECTION } from '../types';
import { getStorageScope } from './storageScope';

export const MEAL_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/** Max edge length for stored meal photos. */
export const MEAL_IMAGE_MAX_DIMENSION = 1200;
export const MEAL_IMAGE_JPEG_QUALITY = 0.82;

export type AppendMealImagesResult = {
  images: string[];
  /** Files not added because the section is at the limit. */
  rejectedCount: number;
};

const DATA_URL_PATTERN = /^data:image\//;

export function isBase64DataUrl(value: string): boolean {
  return DATA_URL_PATTERN.test(value);
}

export function createMealImageId(): string {
  return crypto.randomUUID();
}

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

function encodeCanvasAsJpegBlob(
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not process the selected image.'));
      return;
    }
    ctx.drawImage(source, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not process the selected image.'));
        }
      },
      'image/jpeg',
      MEAL_IMAGE_JPEG_QUALITY,
    );
  });
}

/** Downscale and re-encode meal photos before persisting to IndexedDB. */
async function compressMealImageFile(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      try {
        const scale = Math.min(1, MEAL_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        return encodeCanvasAsJpegBlob(bitmap, width, height);
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

async function compressMealImageDataUrl(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MEAL_IMAGE_MAX_DIMENSION / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      void encodeCanvasAsJpegBlob(img, width, height).then(resolve).catch(reject);
    };
    img.onerror = () => reject(new Error('Could not process the selected image.'));
    img.src = dataUrl;
  });
}

function activeScope(): ImageScope {
  return normalizeImageScope(getStorageScope());
}

export async function storeMealImageBlob(blob: Blob, id = createMealImageId()): Promise<string> {
  await putImage(id, blob, { scope: activeScope(), synced: false });
  return id;
}

export async function storeBase64MealImage(dataUrl: string): Promise<string> {
  const blob = await compressMealImageDataUrl(dataUrl);
  return storeMealImageBlob(blob);
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read meal image.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read meal image.'));
    reader.readAsDataURL(blob);
  });
}

export function mealSectionHasImages(images: MealSectionImages): boolean {
  return Object.values(images).some((section) => section && section.length > 0);
}

export function collectMealImageIds(images?: MealSectionImages): string[] {
  if (!images) return [];
  const ids: string[] = [];
  for (const section of Object.values(images)) {
    if (section) ids.push(...section);
  }
  return ids;
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

async function mapMealImageItems(
  record: Record<string, MealSectionImages>,
  mapItem: (item: string) => Promise<string | null | undefined>,
): Promise<Record<string, MealSectionImages>> {
  const mapped: Record<string, MealSectionImages> = {};

  for (const [entryId, sections] of Object.entries(record)) {
    const nextSections: MealSectionImages = {};

    for (const [key, items] of Object.entries(sections)) {
      if (!items?.length) continue;
      const nextItems: string[] = [];

      for (const item of items) {
        const next = await mapItem(item);
        if (next) {
          nextItems.push(next);
        }
      }

      if (nextItems.length > 0) {
        nextSections[key as FoodMealKey] = nextItems;
      }
    }

    if (Object.keys(nextSections).length > 0) {
      mapped[entryId] = nextSections;
    }
  }

  return mapped;
}

export async function migrateBase64MealImages(
  record: Record<string, MealSectionImages>,
): Promise<{ record: Record<string, MealSectionImages>; changed: boolean }> {
  let changed = false;
  const migrated = await mapMealImageItems(record, async (item) => {
    if (isBase64DataUrl(item)) {
      changed = true;
      return storeBase64MealImage(item);
    }
    return item;
  });

  return { record: migrated, changed };
}

export async function embedMealImagesAsBase64(
  record: Record<string, MealSectionImages>,
): Promise<Record<string, MealSectionImages>> {
  return mapMealImageItems(record, async (item) => {
    if (isBase64DataUrl(item)) {
      return item;
    }

    const blob = await ensureMealImageAvailable(item);
    if (!blob) return null;
    return blobToDataUrl(blob);
  });
}

export async function importMealImagesFromBackup(
  record: Record<string, MealSectionImages>,
): Promise<{ record: Record<string, MealSectionImages>; truncated: boolean }> {
  const { record: normalized, truncated } = normalizeMealImagesRecord(record);
  const imported = await mapMealImageItems(normalized, async (item) => {
    if (isBase64DataUrl(item)) {
      return storeBase64MealImage(item);
    }
    return item;
  });

  return { record: imported, truncated };
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
  const addedIds: string[] = [];

  for (const file of accepted) {
    const blob = await compressMealImageFile(file);
    addedIds.push(await storeMealImageBlob(blob));
  }

  return {
    images: [...current, ...addedIds],
    rejectedCount,
  };
}

export async function deleteOrphanMealImages(
  previous?: MealSectionImages,
  next?: MealSectionImages,
): Promise<void> {
  const previousIds = new Set(collectMealImageIds(previous));
  const nextIds = new Set(collectMealImageIds(next));
  const removed = [...previousIds].filter((id) => !nextIds.has(id));
  if (removed.length === 0) return;
  await deleteMealImagesEverywhere(removed);
}

export function emptyMealSectionImages(): Record<FoodMealKey, string[]> {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}
