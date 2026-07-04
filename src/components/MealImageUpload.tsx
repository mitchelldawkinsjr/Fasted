import { useRef, useState } from 'react';
import { Icon } from './Icon';
import { useMealImageUrls } from '../hooks/useMealImageUrls';
import { appendMealImages, MEAL_IMAGE_ACCEPT } from '../lib/mealImages';
import { formatError, messages } from '../lib/messages';
import { toast } from '../lib/toast';
import { MAX_MEAL_IMAGES_PER_SECTION } from '../types';

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  sectionName: string;
};

export function MealImageUpload({ images, onChange, sectionName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const displayUrls = useMealImageUrls(images);
  const canAddMore = images.length < MAX_MEAL_IMAGES_PER_SECTION;

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { images: next, rejectedCount } = await appendMealImages(images, files);
      onChange(next);

      if (rejectedCount > 0 && next.length === images.length) {
        toast.error(messages.errors.mealImageLimitReached(MAX_MEAL_IMAGES_PER_SECTION));
      } else if (rejectedCount > 0) {
        const added = next.length - images.length;
        toast.warning(messages.errors.mealImageSomeSkipped(added, MAX_MEAL_IMAGES_PER_SECTION));
      }
    } catch (err) {
      toast.error(formatError(err, 'Could not add the selected image.'));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {images.map((imageId, index) => (
          <div key={`${sectionName}-${imageId}`} className="relative">
            {displayUrls[index] ? (
              <img
                src={displayUrls[index]}
                alt={`${sectionName} photo ${index + 1}`}
                className="h-16 w-16 rounded-lg border border-outline-variant object-cover"
              />
            ) : (
              <div
                className="h-16 w-16 rounded-lg border border-outline-variant bg-surface-container-low"
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-on-error"
              aria-label={`Remove ${sectionName} photo ${index + 1}`}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-on-surface-variant transition hover:border-secondary hover:text-secondary disabled:opacity-60"
            aria-label={`Add ${sectionName} photo`}
          >
            <Icon name="add_photo_alternate" size={22} />
            <span className="text-[10px] leading-none">
              {images.length}/{MAX_MEAL_IMAGES_PER_SECTION}
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={MEAL_IMAGE_ACCEPT}
        multiple
        className="sr-only"
        onChange={(event) => void handleSelect(event)}
      />
    </div>
  );
}
