import { useMealImageSrc } from '../hooks/useMealImageSrc';

type Props = {
  imageId: string;
  alt: string;
  className?: string;
};

/** Renders a meal image from an IDB/Storage image ID (or legacy data URL). */
export function MealImageThumb({ imageId, alt, className }: Props) {
  const src = useMealImageSrc(imageId);
  if (!src) {
    return <div className={className} aria-hidden="true" />;
  }

  return <img src={src} alt={alt} className={className} />;
}
