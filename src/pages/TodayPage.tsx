import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckInModal } from '../components/CheckInModal';
import { DailyCommitmentCard } from '../components/DailyCommitmentCard';
import { EncouragementCard } from '../components/EncouragementCard';
import { InfoBanner } from '../components/InfoBanner';
import { PrayerPointsCard } from '../components/PrayerPointsCard';
import { SafetyNote } from '../components/SafetyNote';
import { ScriptureCard } from '../components/ScriptureCard';
import { TodayFastCard } from '../components/TodayFastCard';
import { Icon } from '../components/Icon';
import { useProgress } from '../hooks/useProgress';
import { getDailyPlan } from '../lib/dailyPlan';
import { formatDisplayDate, getLocalDateString, isWithinPlan } from '../lib/dateUtils';
import { messages } from '../lib/messages';
import { getCheckIn } from '../lib/storage';
import { toast } from '../lib/toast';
import type { Badge } from '../types';

const REFLECTION_TAGS = ['Gratitude', 'Peace', 'Focus', 'Strength', 'Patience'];

export function TodayPage() {
  const [searchParams] = useSearchParams();
  const previewDate = searchParams.get('date');
  const today = getLocalDateString();
  const viewDate = previewDate ?? today;
  const inPlan = isWithinPlan(viewDate);
  const plan = inPlan ? getDailyPlan(viewDate) : null;
  const progress = useProgress();
  const existingCheckIn = getCheckIn(viewDate);
  const [showCheckIn, setShowCheckIn] = useState(false);

  if (!inPlan || !plan) {
    return (
      <div className="space-y-stack-lg animate-fade-in-up">
        <section>
          <h2 className="font-display text-headline-lg-mobile text-primary">Welcome</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            This fasting plan runs June 13 through December 19, 2026.
          </p>
        </section>

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
    if (badges.length > 0) {
      badges.forEach((badge) => {
        toast.success(messages.progress.badgeEarned(badge.title));
      });
    } else {
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
        <ScriptureCard phaseId={plan.phaseId} references={plan.scriptureReferences} />
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
        <div className="flex flex-wrap gap-2">
          {REFLECTION_TAGS.map((tag) => (
            <Link
              key={tag}
              to="/journal"
              onClick={() => toast.info(`Open your journal to reflect on ${tag.toLowerCase()}.`)}
              className="rounded-full border border-outline-variant/30 bg-surface-container-high px-4 py-2 label-caps text-primary transition-colors hover:bg-surface-container"
            >
              {tag}
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
