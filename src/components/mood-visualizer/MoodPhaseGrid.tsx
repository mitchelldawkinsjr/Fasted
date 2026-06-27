import { Link } from 'react-router-dom';
import { useActiveJourney } from '../../hooks/useActiveJourney';
import { DAY_MOOD_OPTIONS } from '../../lib/dayMood';
import { formatDisplayDate } from '../../lib/dateUtils';
import { getPhaseDates } from '../../lib/phaseProgress';
import { getMoodByDate } from '../../lib/moodVisualizer';

export function MoodPhaseGrid() {
  const { phases } = useActiveJourney();
  const moodsByDate = getMoodByDate();
  const phaseRows = phases.map((phase) => ({
    phase,
    dates: getPhaseDates(phase.startDate, phase.endDate),
  }));
  const maxDays = Math.max(...phaseRows.map((row) => row.dates.length), 1);

  return (
    <div className="space-y-stack-md">
      <div>
        <h2 className="font-display text-headline-md italic text-primary">Mood by phase</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Each row is one spiritual phase; each cell is a plan day with your reflection mood.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {DAY_MOOD_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <span
              className={`h-3.5 w-3.5 shrink-0 rounded-full ${option.swatchClass}`}
              aria-hidden
            />
            <span className="text-body-md text-on-surface">{option.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[5.5rem] border border-outline-variant bg-surface-container-high px-2 py-1 text-left font-label uppercase tracking-wide text-outline">
                Phase
              </th>
              {Array.from({ length: maxDays }, (_, index) => (
                <th
                  key={index + 1}
                  className="border border-outline-variant bg-surface-container-high px-0.5 py-1 text-center font-label text-outline"
                >
                  {index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {phaseRows.map(({ phase, dates }) => (
              <tr key={phase.id}>
                <td
                  className="sticky left-0 z-10 border border-outline-variant border-l-4 bg-surface-container-lowest px-2 py-2"
                  style={{ borderLeftColor: phase.themeColor }}
                >
                  <span className="block font-semibold text-on-surface">Phase {phase.id}</span>
                  <span className="mt-0.5 block max-w-[7rem] text-[10px] leading-tight text-on-surface-variant">
                    {phase.title}
                  </span>
                </td>
                {Array.from({ length: maxDays }, (_, index) => {
                  const date = dates[index];
                  if (!date) {
                    return (
                      <td
                        key={`pad-${phase.id}-${index}`}
                        className="border border-outline-variant bg-surface-container p-0"
                        aria-hidden
                      />
                    );
                  }

                  const entry = moodsByDate.get(date);

                  return (
                    <td key={date} className="border border-outline-variant p-0">
                      {entry ? (
                        <Link
                          to={`/journal?date=${date}&from=mood&moodView=phase`}
                          className="block h-6 w-6 transition-transform hover:scale-110"
                          style={{ backgroundColor: entry.color }}
                          title={`${formatDisplayDate(date)} — ${entry.label}`}
                          aria-label={`${date}: ${entry.label}, view reflection`}
                        />
                      ) : (
                        <div
                          className="h-6 w-6"
                          title={`${formatDisplayDate(date)} — no mood logged`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-outline-variant pt-stack-md text-body-md italic text-on-surface-variant">
        Each color marks a daily reflection mood — grace over guilt in every step of obedience.
      </p>
    </div>
  );
}
