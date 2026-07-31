import { useEffect, useState } from 'react';
import type { DailyFastPlan } from '../types';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import { conciseEncouragement, getTimeGreeting } from '../lib/homeScreenLabels';
import { EncouragementCard } from './EncouragementCard';
import { SafetyNote } from './SafetyNote';
import { DailyWelcomeCheckInCard } from './home/DailyWelcomeCheckInCard';
import { GuidedJourneyFlow } from './home/GuidedJourneyFlow';
import { HomeProgressSummary } from './home/HomeProgressSummary';
import { QuickActionsBar } from './home/QuickActionsBar';
import { TodaysFastDetails } from './home/TodaysFastDetails';
import { TodaysMissionHero } from './home/TodaysMissionHero';

type Props = {
  viewDate: string;
  plan: DailyFastPlan;
};

export function HomeScreen({ viewDate, plan }: Props) {
  const progress = useProgress();
  const { name } = useAuth();
  const { getPhaseForDate, journey } = useActiveJourney();
  const phase = getPhaseForDate(viewDate);
  const existingCheckIn = progress.checkIns.find((c) => c.date === viewDate);
  const welcomeCheckIn = progress.dailyWelcomeCheckIns?.[viewDate];
  const journeyProgress = progress.guidedJourneyProgress?.[viewDate];

  const [showGuidedJourney, setShowGuidedJourney] = useState(false);

  useEffect(() => {
    setShowGuidedJourney(false);
  }, [viewDate]);

  const focusLabel =
    plan.prayerPoints[0] ?? phase?.prayerFocus?.[0] ?? phase?.title ?? 'Your fast today';

  const journeyStarted = Boolean(journeyProgress);
  const journeyComplete = Boolean(journeyProgress?.completedAt || existingCheckIn);
  const displayName = name?.trim() || 'Friend';

  const handleBeginJourney = () => {
    setShowGuidedJourney(true);
  };

  if (!welcomeCheckIn) {
    return (
      <div className="space-y-stack-lg animate-fade-in-up">
        <DailyWelcomeCheckInCard date={viewDate} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-stack-lg animate-fade-in-up">
        <header className="space-y-1 text-center" data-testid="home-welcome-header">
          <p className="label-caps text-secondary">
            {getTimeGreeting()}, {displayName}
          </p>
          <p className="text-body-lg text-on-surface-variant">{journey.name}</p>
        </header>

        <HomeProgressSummary date={viewDate} checkedIn={!!existingCheckIn} />

        <TodaysMissionHero
          plan={plan}
          phase={phase}
          focusLabel={focusLabel}
          onBeginJourney={handleBeginJourney}
          journeyStarted={journeyStarted}
          journeyComplete={journeyComplete}
        />

        <EncouragementCard message={conciseEncouragement(plan.encouragement)} />

        <QuickActionsBar />

        <TodaysFastDetails plan={plan} phase={phase} />

        <SafetyNote compact={plan.fastType !== 'twenty-four-hour-water'} />
      </div>

      {showGuidedJourney && (
        <GuidedJourneyFlow
          date={viewDate}
          plan={plan}
          onClose={() => setShowGuidedJourney(false)}
        />
      )}
    </>
  );
}
