import { Link, useSearchParams } from 'react-router-dom';
import { HomeScreen } from '../components/HomeScreen';
import { InfoBanner } from '../components/InfoBanner';
import { SafetyNote } from '../components/SafetyNote';
import { VerseOfTheDay } from '../components/VerseOfTheDay';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { getDailyPlan } from '../lib/dailyPlan';
import { formatDisplayDate, getLocalDateString, isWithinPlan } from '../lib/dateUtils';

export function TodayPage() {
  const [searchParams] = useSearchParams();
  const previewDate = searchParams.get('date');
  const today = getLocalDateString();
  const viewDate = previewDate ?? today;
  const { planStart, planEnd, journey } = useActiveJourney();
  const inPlan = isWithinPlan(viewDate, journey);
  const plan = inPlan ? getDailyPlan(viewDate, journey) : null;

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

        <VerseOfTheDay date={viewDate} />

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

      <HomeScreen viewDate={viewDate} plan={plan} />
    </div>
  );
}
