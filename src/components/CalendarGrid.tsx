import { useNavigate } from 'react-router-dom';
import { FAST_PHASES } from '../data/fastingPlan';
import { getDailyPlan } from '../lib/dailyPlan';
import { getAllPlanDates, parseLocalDate } from '../lib/dateUtils';
import { getCheckIn } from '../lib/storage';
import { Icon } from './Icon';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function CalendarGrid() {
  const navigate = useNavigate();
  const dates = getAllPlanDates();

  const months: { label: string; cells: (string | null)[] }[] = [];
  let currentMonth = '';
  let monthCells: (string | null)[] = [];

  dates.forEach((date, i) => {
    const monthLabel = parseLocalDate(date).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
    if (monthLabel !== currentMonth) {
      if (currentMonth) months.push({ label: currentMonth, cells: monthCells });
      currentMonth = monthLabel;
      monthCells = [];
      if (i > 0) {
        const dayOfWeek = parseLocalDate(date).getDay();
        for (let b = 0; b < dayOfWeek; b++) monthCells.push(null);
      } else {
        const leadingBlanks = parseLocalDate(date).getDay();
        for (let b = 0; b < leadingBlanks; b++) monthCells.push(null);
      }
    }
    monthCells.push(date);
  });
  if (currentMonth) months.push({ label: currentMonth, cells: monthCells });

  return (
    <div className="space-y-stack-lg">
      {months.map((month) => (
        <section
          key={month.label}
          className="stitch-card overflow-hidden border-l-4 border-phase-1 p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-display text-headline-md text-primary">{month.label}</h3>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d, i) => (
              <div key={`${month.label}-${d}-${i}`} className="label-caps text-outline">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {month.cells.map((date, idx) => {
              if (!date) return <div key={`blank-${month.label}-${idx}`} />;

              const plan = getDailyPlan(date);
              const phaseId = plan?.phaseId ?? 1;
              const phase = FAST_PHASES.find((p) => p.id === phaseId);
              const checkIn = getCheckIn(date);
              const dayNum = parseLocalDate(date).getDate();
              const isFast = plan?.isFastDay;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => navigate(`/?date=${date}`)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-lg transition-all active:scale-95 ${
                    checkIn
                      ? 'border-2 border-secondary bg-secondary-container/20 text-primary'
                      : `bg-phase-${phaseId}/5 text-on-surface-variant hover:bg-phase-${phaseId}/15`
                  }`}
                  style={
                    checkIn
                      ? undefined
                      : { borderLeft: phase ? `3px solid ${phase.themeColor}` : undefined }
                  }
                  aria-label={`${date}${isFast ? ', fast day' : ''}${checkIn ? ', checked in' : ''}`}
                >
                  <span className="text-body-md font-medium">{dayNum}</span>
                  {isFast && (
                    <Icon
                      name="water_drop"
                      className="text-[12px]"
                      style={{ color: phase?.themeColor }}
                    />
                  )}
                  {checkIn && (
                    <Icon name="check" className="absolute right-0.5 top-0.5 text-[10px] text-secondary" />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
