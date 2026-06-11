import { Icon } from './Icon';

type Props = {
  message: string;
};

export function EncouragementCard({ message }: Props) {
  return (
    <section
      className="stitch-card border border-secondary-container/40 bg-surface-container-low p-stack-lg"
      aria-labelledby="encouragement-heading"
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon name="volunteer_activism" className="text-secondary" />
        <h2 id="encouragement-heading" className="font-display text-headline-md text-primary">
          Daily Encouragement
        </h2>
      </div>
      <p className="text-body-md leading-relaxed text-on-surface-variant">{message}</p>
    </section>
  );
}
