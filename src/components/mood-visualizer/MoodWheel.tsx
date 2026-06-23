import { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { DAY_MOOD_OPTIONS } from '../../lib/dayMood';
import {
  describeAnnularSegment,
  describeDayLabelPosition,
  formatDateInMonth,
  formatMonthLabel,
  getAverageMoodLabelForMonth,
  getDaysInMonth,
  getMonthEntryStats,
  getMoodEntriesForMonth,
  parseMonthKey,
} from '../../lib/moodVisualizer';

type Props = {
  monthKey: string;
  size?: number;
  compact?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  linkDays?: boolean;
};

export function MoodWheel({
  monthKey,
  size = 320,
  compact = false,
  showFooter = true,
  showLegend = !compact,
  linkDays = !compact,
}: Props) {
  const navigate = useNavigate();
  const titleId = useId();
  const { year, month } = parseMonthKey(monthKey);
  const daysInMonth = getDaysInMonth(year, month);
  const moodsByDay = getMoodEntriesForMonth(monthKey);
  const stats = getMonthEntryStats(monthKey);
  const averageLabel = getAverageMoodLabelForMonth(monthKey);

  const cx = 250;
  const cy = 250;
  const innerR = compact ? 100 : 130;
  const outerR = compact ? 175 : 210;
  const labelR = compact ? 188 : 228;
  const centerR = compact ? 92 : 118;

  function openJournalForDay(day: number) {
    navigate(`/journal?date=${formatDateInMonth(monthKey, day)}&from=mood`);
  }

  return (
    <div className="flex flex-col items-center">
      {!compact && (
        <div className="mb-stack-md text-center">
          <h2 id={titleId} className="font-display text-headline-md italic text-primary">
            Mood chart
          </h2>
          <p className="label-caps text-on-surface-variant">Daily reflections</p>
        </div>
      )}

      <div className="group relative flex w-full max-w-full flex-col items-center overflow-hidden">
        <svg
          className="h-auto w-full max-w-full transition-transform duration-500"
          style={{ maxWidth: size }}
          viewBox="0 0 500 500"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-labelledby={compact ? undefined : titleId}
          aria-label={
            compact
              ? `Mood chart for ${formatMonthLabel(monthKey)}, ${stats.total} reflections`
              : undefined
          }
        >
          <circle cx={cx} cy={cy} r={outerR + 8} fill="none" stroke="#e4e2e2" strokeWidth="2" />

          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const entry = moodsByDay.get(day);
            return (
              <path
                key={day}
                d={describeAnnularSegment(cx, cy, innerR, outerR, index, daysInMonth)}
                fill={entry?.color ?? 'transparent'}
                stroke="#c4c9b4"
                strokeWidth={0.5}
                className={`transition-all duration-200 ${entry && linkDays ? 'cursor-pointer hover:opacity-80' : ''}`}
                style={{
                  opacity: entry ? 0.92 : 1,
                }}
                onClick={() => {
                  if (entry && linkDays) openJournalForDay(day);
                }}
                onKeyDown={(event) => {
                  if (!entry || !linkDays) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openJournalForDay(day);
                  }
                }}
                tabIndex={entry && linkDays ? 0 : -1}
                role={entry && linkDays ? 'link' : undefined}
                aria-label={
                  entry
                    ? `Day ${day}, ${entry.label}, view reflection`
                    : `Day ${day}, no mood logged`
                }
              />
            );
          })}

          {!compact &&
            Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const { x, y, rotation } = describeDayLabelPosition(cx, cy, labelR, index, daysInMonth);
              return (
                <text
                  key={`label-${day}`}
                  x={x}
                  y={y}
                  transform={`rotate(${rotation}, ${x}, ${y})`}
                  textAnchor="middle"
                  fill="#73796b"
                  fontSize="10"
                  fontFamily="Inter, sans-serif"
                >
                  {day}
                </text>
              );
            })}

          <circle cx={cx} cy={cy} r={centerR} fill="#ffffff" stroke="#c4c9b4" strokeWidth="1" />
          <text
            x={cx}
            y={cy - (compact ? 8 : 12)}
            textAnchor="middle"
            fill="#73796b"
            fontSize={compact ? 10 : 12}
            fontFamily="Inter, sans-serif"
            letterSpacing="0.1em"
          >
            MONTH
          </text>
          <text
            x={cx}
            y={cy + (compact ? 22 : 28)}
            textAnchor="middle"
            fill="#173d00"
            fontSize={compact ? 28 : 40}
            fontFamily='"Playfair Display", Georgia, serif'
            fontStyle="italic"
          >
            {formatMonthLabel(monthKey).split(' ')[0]}
          </text>
        </svg>

        {showLegend && (
          <ul className="mt-stack-md flex w-full max-w-md flex-wrap justify-center gap-x-4 gap-y-2 px-2">
            {DAY_MOOD_OPTIONS.map((option) => (
              <li key={option.value} className="flex items-center gap-2">
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full ${option.swatchClass}`}
                  aria-hidden
                />
                <span className="text-body-md text-on-surface">{option.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showFooter && (
        <div className={`mt-stack-md flex w-full ${compact ? 'justify-center gap-6' : 'justify-between'}`}>
          <div className="flex flex-col text-center sm:text-left">
            <span className="label-caps text-outline">Typical day</span>
            <span className="font-display text-headline-md text-primary">{averageLabel}</span>
          </div>
          <div className="flex flex-col text-center sm:text-left">
            <span className="label-caps text-outline">Reflections</span>
            <span className="font-display text-headline-md text-primary">
              {stats.total}/{stats.daysInMonth}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
