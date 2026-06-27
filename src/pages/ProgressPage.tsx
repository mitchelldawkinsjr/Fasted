import { MoodVisualizerPreview } from '../components/mood-visualizer/MoodVisualizerPreview';
import { BadgeWall } from '../components/BadgeWall';
import { InfoBanner } from '../components/InfoBanner';
import { PhaseMilestonesCard } from '../components/PhaseMilestonesCard';
import { StreakWidget } from '../components/StreakWidget';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { useProgress } from '../hooks/useProgress';
import { getFastDaysCompleted, getNextReward } from '../lib/badges';
import {
  getPhaseCompletionPercent,
} from '../lib/streaks';
import { formatDisplayDate, getLocalDateString } from '../lib/dateUtils';

export function ProgressPage() {
  const today = getLocalDateString();
  const progress = useProgress();
  const { phases, planStart, planEnd, getPhaseForDate } = useActiveJourney();
  const currentPhase = getPhaseForDate(today);
  const phasePercent = currentPhase
    ? getPhaseCompletionPercent(currentPhase.startDate, currentPhase.endDate)
    : 0;
  const nextReward = currentPhase
    ? getNextReward(currentPhase.id, currentPhase.startDate, currentPhase.endDate, today)
    : null;

  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      <section className="space-y-unit text-center">
        <h2 className="font-display text-headline-lg-mobile text-primary">Your Sacred Journey</h2>
        <p className="text-body-md italic text-on-surface-variant">
          &ldquo;Commit your work to the Lord, and your plans will be established.&rdquo;
        </p>
      </section>

      {!currentPhase && today < planStart && (
        <InfoBanner variant="preview" icon="event_upcoming">
          Your journey begins {formatDisplayDate(planStart)}. Milestones and phase progress unlock then.
        </InfoBanner>
      )}
      {!currentPhase && today > planEnd && (
        <InfoBanner variant="preview" icon="history">
          The fasting plan ended {formatDisplayDate(planEnd)}. Your earned milestones remain below.
        </InfoBanner>
      )}

      <StreakWidget today={today} />

      {currentPhase && (
        <>
          <section className="stitch-card flex flex-col items-center p-stack-lg">
            <h3 className="label-caps mb-stack-md text-center text-on-surface-variant">
              {currentPhase.title}
            </h3>
            <div className="relative flex h-48 w-48 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="88" fill="transparent" stroke="#edefe5" strokeWidth="6" />
                <circle
                  cx="100"
                  cy="100"
                  r="88"
                  fill="transparent"
                  stroke="#d2eabf"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 * (1 - phasePercent / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-display-scripture text-primary">{phasePercent}%</span>
                <span className="label-caps text-on-surface-variant">Complete</span>
              </div>
            </div>
            <p className="mt-stack-md max-w-[240px] text-center text-body-md text-on-surface-variant">
              Grace over guilt—every step of obedience matters.
            </p>
            {nextReward && (
              <p className="mt-stack-md text-center text-body-md text-primary">
                Next milestone: <strong>{nextReward.title}</strong> ({nextReward.current}/
                {nextReward.target})
              </p>
            )}
          </section>

          <PhaseMilestonesCard phaseId={currentPhase.id} today={today} />
        </>
      )}

      <MoodVisualizerPreview />

      <section className="grid grid-cols-2 gap-gutter">
        <div className="stitch-card p-stack-md text-center">
          <span className="label-caps text-on-surface-variant">Fast Days</span>
          <p className="mt-1 font-display text-headline-md text-primary">{getFastDaysCompleted()}</p>
        </div>
        <div className="stitch-card p-stack-md text-center">
          <span className="label-caps text-on-surface-variant">Journal Entries</span>
          <p className="mt-1 font-display text-headline-md text-primary">
            {progress.journalEntries.length}
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-stack-md font-display text-headline-md text-primary">Phase Completion</h3>
        <div className="space-y-stack-md">
          {phases.map((phase) => {
            const percent = getPhaseCompletionPercent(phase.startDate, phase.endDate);
            return (
              <div key={phase.id} className="stitch-card space-y-stack-md p-stack-md">
                <div className="mb-2 flex justify-between text-body-md">
                  <span className="font-medium text-primary">{phase.title}</span>
                  <span className="text-on-surface-variant">{percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percent}%`, backgroundColor: phase.themeColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <BadgeWall />
    </div>
  );
}
