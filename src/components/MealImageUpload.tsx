import { useRef, useState } from 'react';
import { Icon } from './Icon';
import { useMealImageSrc } from '../hooks/useMealImageSrc';
import { appendMealImages, MEAL_IMAGE_ACCEPT } from '../lib/mealImages';
import { trackEvent } from '../lib/analytics';
import { formatError, messages } from '../lib/messages';
import { getStorageScope } from '../lib/storage';
import { imageScopeKey } from '../lib/imageStore';
import { toast } from '../lib/toast';
import { MAX_MEAL_IMAGES_PER_SECTION } from '../types';

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  sectionName: string;
};

function MealImagePreview({
  imageId,
  alt,
  className,
}: {
  imageId: string;
  alt: string;
  className?: string;
}) {
  const src = useMealImageSrc(imageId);
  if (!src) {
    return <div className={className} aria-hidden="true" />;
  }
  return <img src={src} alt={alt} className={className} />;
}

export function MealImageUpload({ images, onChange, sectionName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const canAddMore = images.length < MAX_MEAL_IMAGES_PER_SECTION;

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const scope = imageScopeKey(getStorageScope());
      const selectedCount = files.length;
      const next = await appendMealImages(images, files, scope);
      onChange(next);
      const added = next.length - images.length;
      if (added > 0) {
        trackEvent('meal_image_uploaded', {
          section: sectionName.toLowerCase(),
          images_added: added,
          total_in_section: next.length,
        });
      }
      if (selectedCount > added) {
        toast.error(messages.errors.mealImageSomeSkipped(added, MAX_MEAL_IMAGES_PER_SECTION));
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
          <div key={imageId} className="relative">
            <MealImagePreview
              imageId={imageId}
              alt={`${sectionName} photo ${index + 1}`}
              className="h-16 w-16 rounded-lg border border-outline-variant object-cover bg-surface-container-low"
            />
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
