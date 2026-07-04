import { describe, expect, it } from 'vitest';
import { collectMealImageIds, mealSectionHasImages } from './mealImages';

describe('collectMealImageIds', () => {
  it('collects ids and skips data urls', () => {
    expect(
      collectMealImageIds({
        breakfast: ['id-1', 'data:image/png;base64,xx'],
        lunch: ['id-2'],
      }),
    ).toEqual(['id-1', 'id-2']);
  });
});

describe('mealSectionHasImages', () => {
  it('detects any section with images', () => {
    expect(mealSectionHasImages({ breakfast: ['a'] })).toBe(true);
    expect(mealSectionHasImages({})).toBe(false);
  });
});
