import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { trackEvent } from '../lib/analytics';
import { CheckInModal } from '../components/CheckInModal';
import { DailyCommitmentCard } from '../components/DailyCommitmentCard';
import { EncouragementCard } from '../components/EncouragementCard';
import { InfoBanner } from '../components/InfoBanner';
import { PrayerPointsCard } from '../components/PrayerPointsCard';
import { SafetyNote } from '../components/SafetyNote';
import { VerseOfTheDay } from '../components/VerseOfTheDay';
import { TodayFastCard } from '../components/TodayFastCard';
import { Icon } from '../components/Icon';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { useProgress } from '../hooks/useProgress';
import { getDailyPlan } from '../lib/dailyPlan';
import { formatDisplayDate, getLocalDateString, isWithinPlan } from '../lib/dateUtils';
import {
  JOURNAL_ENTRY_TYPE_LABELS,
  JOURNAL_ENTRY_TYPES,
  journalTypePillClass,
} from '../lib/journalTags';
import { messages } from '../lib/messages';
import { getCheckIn } from '../lib/storage';
import { toast } from '../lib/toast';
import type { Badge } from '../types';

export function TodayPage() {
  const [searchParams] = useSearchParams();
  const previewDate = searchParams.get('date');
  const today = getLocalDateString();
  const viewDate = previewDate ?? today;
  const { planStart, planEnd, journey } = useActiveJourney();
  const inPlan = isWithinPlan(viewDate, journey);
  const plan = inPlan ? getDailyPlan(viewDate, journey) : null;
  const progress = useProgress();
  const existingCheckIn = getCheckIn(viewDate);
  const [showCheckIn, setShowCheckIn] = useState(false);

  if (!inPlan || !plan) {
    const beforePlan = viewDate < planStart;
    const afterPlan = viewDate > planEnd;

    return (
      <div className="space-y-stack-lg animate-fade-in-up">
        <section>
          <h2 className="font-display text-headline-lg-mobile text-primary">Welcome</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {journey.name} runs {formatDisplayDate(planStart)} through {formatDisplayDate(planEnd)}.
          </p>
          {beforePlan && (
            <p className="mt-2 text-body-md text-on-surface-variant">
              Your journey begins {formatDisplayDate(planStart)}. Adjust the start date in Settings
              if you want today to fall inside the plan.
            </p>
          )}
          {afterPlan && (
            <p className="mt-2 text-body-md text-on-surface-variant">
              This journey ended {formatDisplayDate(planEnd)}. Create a new journey in Settings to
              start again.
            </p>
          )}
        </section>

        <VerseOfTheDay date={today} />

        <img
          src="/assets/fasting-plan-all-phases.png"
          alt="Overview of all eight fasting phases"
          className="w-full rounded-xl grace-shadow"
        />

        <p className="text-body-md leading-relaxed text-on-surface-variant">
          Today is {formatDisplayDate(today)}. Browse the full plan and preview any phase.
        </p>

        <Link to="/phases" className="btn-stitch-primary block text-center">
          View All Phases
        </Link>

        <SafetyNote />
      </div>
    );
  }

  const hasJournal = progress.journalEntries.some((e) => e.date === viewDate);

  const handleCheckInComplete = (badges: Badge[]) => {
    if (badges.length === 0) {
      toast.success(messages.save.checkIn);
    }
    setShowCheckIn(false);
  };

  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      {previewDate && previewDate !== today && (
        <InfoBanner variant="preview" icon="visibility">
          Previewing {formatDisplayDate(viewDate)}.{' '}
          <Link to="/" className="font-medium text-primary underline">
            Return to today
          </Link>
        </InfoBanner>
      )}

      <TodayFastCard plan={plan} />

      <DailyCommitmentCard
        date={viewDate}
        checkedIn={!!existingCheckIn}
        onCheckIn={() => setShowCheckIn(true)}
      />

      <section className="grid grid-cols-1 gap-gutter md:grid-cols-2">
        <VerseOfTheDay date={viewDate} />
        <PrayerPointsCard
          points={plan.prayerPoints}
          encouragement="You are setting this time apart for something greater. Breathe and reflect."
        />
      </section>

      <EncouragementCard message={plan.encouragement} />

      <section>
        <div className="mb-stack-md flex items-center justify-between">
          <h3 className="font-display text-headline-md text-primary">Morning Reflection</h3>
          <Link to="/journal" aria-label="Open journal">
            <Icon name="edit_note" className="text-outline" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {JOURNAL_ENTRY_TYPES.map((type) => (
            <Link
              key={type}
              to={`/journal?type=${type}`}
              onClick={() =>
                trackEvent('journal_type_opened', { entry_type: type, source: 'today_link' })
              }
              className={journalTypePillClass(false)}
            >
              {JOURNAL_ENTRY_TYPE_LABELS[type]}
            </Link>
          ))}
        </div>
        {!hasJournal && (
          <Link
            to="/journal"
            className="btn-stitch-secondary mt-stack-md block text-center"
          >
            Write in your journal
          </Link>
        )}
      </section>

      <SafetyNote compact={plan.fastType !== 'twenty-four-hour-water'} />

      {showCheckIn && (
        <CheckInModal
          date={viewDate}
          existing={existingCheckIn}
          onClose={() => setShowCheckIn(false)}
          onComplete={handleCheckInComplete}
        />
      )}
    </div>
  );
}
