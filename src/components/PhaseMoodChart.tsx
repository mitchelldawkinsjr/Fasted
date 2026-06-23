import { DAY_MOOD_OPTIONS } from '../lib/dayMood';
import { getPhaseMoodPercentages, type PhaseMoodSummary } from '../lib/moodStats';

type Props = {
  summary: PhaseMoodSummary;
  title?: string;
  compact?: boolean;
};

export function PhaseMoodChart({ summary, title = 'Mood tracker', compact = false }: Props) {
  const percentages = getPhaseMoodPercentages(summary);

  if (summary.total === 0) {
    return (
      <section className={`stitch-card ${compact ? 'p-stack-md' : 'p-stack-lg'}`}>
        <h3 className="label-caps mb-2 text-on-surface-variant">{title}</h3>
        <p className="text-body-md text-on-surface-variant">
          Log daily reflections with a mood color to see your mood breakdown here.
        </p>
      </section>
    );
  }

  return (
    <section className={`stitch-card ${compact ? 'p-stack-md' : 'p-stack-lg'}`}>
      <h3 className="label-caps mb-1 text-on-surface-variant">{title}</h3>
      <p className="mb-stack-md text-body-md text-on-surface-variant">
        {summary.uplifting} uplifting · {summary.steady} steady · {summary.difficult} difficult
        <span className="text-on-surface-variant/70"> ({summary.total} reflections)</span>
      </p>

      <div
        className="mb-stack-md flex h-5 overflow-hidden rounded-full bg-surface-container"
        role="img"
        aria-label={`Mood breakdown: ${DAY_MOOD_OPTIONS.map(
          (option) => `${summary.counts[option.value]} ${option.label.toLowerCase()}`,
        ).join(', ')}`}
      >
        {DAY_MOOD_OPTIONS.map((option) => {
          const width = percentages[option.value];
          if (width === 0) return null;
          return (
            <div
              key={option.value}
              className="h-full transition-all"
              style={{ width: `${width}%`, backgroundColor: option.color }}
              title={`${option.label}: ${summary.counts[option.value]}`}
            />
          );
        })}
      </div>

      <ul className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {DAY_MOOD_OPTIONS.map((option) => (
          <li
            key={option.value}
            className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-full ${option.swatchClass}`}
                aria-hidden
              />
              <span className="text-body-md text-on-surface">{option.label}</span>
            </span>
            <span className="font-display text-body-md text-primary">
              {summary.counts[option.value]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
