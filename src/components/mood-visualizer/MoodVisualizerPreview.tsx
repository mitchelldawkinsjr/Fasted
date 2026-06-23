import { Link } from 'react-router-dom';
import { Icon } from '../Icon';
import {
  clampMonthKey,
  formatMonthLabel,
  getAverageMoodLabelForAll,
  getMoodEntries,
  toMonthKey,
} from '../../lib/moodVisualizer';
import { getLocalDateString } from '../../lib/dateUtils';
import { MoodWheel } from './MoodWheel';

export function MoodVisualizerPreview() {
  const today = getLocalDateString();
  const monthKey = clampMonthKey(toMonthKey(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)),
  ));
  const totalEntries = getMoodEntries().length;
  const averageLabel = getAverageMoodLabelForAll();

  return (
    <Link
      to="/progress/mood"
      className="stitch-card block border-l-4 border-secondary-container p-stack-md transition-transform active:scale-[0.98]"
    >
      <div className="mb-stack-md flex items-start justify-between gap-gutter">
        <div>
          <p className="label-caps text-on-surface-variant">Mood chart</p>
          <h3 className="mt-1 font-display text-headline-md text-primary">How your days have felt</h3>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {totalEntries > 0
              ? `${totalEntries} reflection${totalEntries === 1 ? '' : 's'} · mostly ${averageLabel.toLowerCase()}`
              : 'Log daily reflection moods to see your mood chart here.'}
          </p>
        </div>
        <Icon name="chevron_right" className="shrink-0 text-primary" />
      </div>

      <div className="flex items-center justify-center rounded-xl bg-surface-container-low py-stack-sm">
        <MoodWheel
          monthKey={monthKey}
          size={168}
          compact
          showFooter={false}
          showLegend={false}
        />
      </div>

      <p className="mt-stack-md text-center text-label-caps text-secondary">
        View {formatMonthLabel(monthKey)} &amp; phase overview
      </p>
    </Link>
  );
}
