import { useCallback, useState } from 'react';
import type { DailyFastPlan } from '../types';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { useProgress } from '../hooks/useProgress';
import {
  getDailyWelcomeCheckIn,
  getGuidedJourneyProgress,
} from '../lib/storage';
import { conciseEncouragement } from '../lib/homeScreenLabels';
import { EncouragementCard } from './EncouragementCard';
import { SafetyNote } from './SafetyNote';
import { DailyWelcomeCheckInCard } from './home/DailyWelcomeCheckInCard';
import { GuidedJourneyFlow } from './home/GuidedJourneyFlow';
import { HomeProgressSummary } from './home/HomeProgressSummary';
import { HomeWelcomeHeader } from './home/HomeWelcomeHeader';
import { QuickActionsBar } from './home/QuickActionsBar';
import { TodaysFastDetails } from './home/TodaysFastDetails';
import { TodaysMissionHero } from './home/TodaysMissionHero';

type Props = {
  viewDate: string;
  plan: DailyFastPlan;
};

export function HomeScreen({ viewDate, plan }: Props) {
  const progress = useProgress();
  const { getPhaseForDate } = useActiveJourney();
  const phase = getPhaseForDate(viewDate);
  const existingCheckIn = progress.checkIns.find((c) => c.date === viewDate);
  const welcomeCheckIn = getDailyWelcomeCheckIn(viewDate);
  const journeyProgress = getGuidedJourneyProgress(viewDate);

  const [welcomeComplete, setWelcomeComplete] = useState(Boolean(welcomeCheckIn));
  const [showGuidedJourney, setShowGuidedJourney] = useState(false);
  const [, setJourneyTick] = useState(0);

  const refreshJourney = useCallback(() => setJourneyTick((n) => n + 1), []);

  const focusLabel =
    plan.prayerPoints[0] ?? phase?.prayerFocus?.[0] ?? phase?.title ?? 'Your fast today';

  const journeyStarted = Boolean(journeyProgress);
  const journeyComplete = Boolean(journeyProgress?.completedAt || existingCheckIn);

  const handleBeginJourney = () => {
    setShowGuidedJourney(true);
  };

  if (!welcomeComplete && !welcomeCheckIn) {
    return (
      <div className="space-y-stack-lg animate-fade-in-up">
        <DailyWelcomeCheckInCard
          date={viewDate}
          onComplete={() => setWelcomeComplete(true)}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-stack-lg animate-fade-in-up">
        <HomeWelcomeHeader date={viewDate} />

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
          onClose={() => {
            setShowGuidedJourney(false);
            refreshJourney();
          }}
          onStepChange={refreshJourney}
        />
      )}
    </>
  );
}
