import { Icon } from './Icon';

export function SafetyNote({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-label-caps leading-relaxed text-on-surface-variant">
        Fasting is a spiritual discipline, not medical treatment. Consult a healthcare
        professional if you have medical concerns.
      </p>
    );
  }

  return (
    <aside className="stitch-card border-l-4 border-tertiary-container p-stack-md">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="health_and_safety" className="text-secondary" />
        <p className="font-display text-headline-md text-primary">Health &amp; Safety</p>
      </div>
      <p className="mb-2 text-body-md leading-relaxed text-on-surface-variant">
        Fasting is a spiritual discipline, not medical treatment. If you have a medical
        condition, take medication, are pregnant, have a history of disordered eating, or
        are doing 24-hour or no-water fasts, speak with a qualified healthcare professional
        first.
      </p>
      <ul className="list-inside list-disc space-y-1 text-label-caps text-on-surface-variant">
        <li>Hydrate when allowed.</li>
        <li>Break fast gently.</li>
        <li>Avoid binge eating after the fast.</li>
        <li>Stop if dizzy, faint, confused, or unwell.</li>
      </ul>
    </aside>
  );
}
