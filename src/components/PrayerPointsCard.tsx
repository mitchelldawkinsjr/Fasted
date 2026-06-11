import { Icon } from './Icon';

type Props = {
  points: string[];
  encouragement?: string;
};

export function PrayerPointsCard({ points, encouragement }: Props) {
  return (
    <section className="stitch-card flex flex-col p-stack-lg" aria-labelledby="prayer-heading">
      <div className="mb-4 flex items-center gap-2">
        <Icon name="flare" className="text-secondary" />
        <h2 id="prayer-heading" className="font-display text-headline-md text-primary">
          Prayer Focus
        </h2>
      </div>
      <ul className="space-y-2 text-body-md leading-relaxed text-on-surface-variant">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {encouragement && (
        <p className="label-caps mt-stack-md italic text-secondary">{encouragement}</p>
      )}
    </section>
  );
}
