import { useAuth } from '../../hooks/useAuth';
import { useActiveJourney } from '../../hooks/useActiveJourney';
import { getAllPlanDates } from '../../lib/dateUtils';
import { getTimeGreeting } from '../../lib/homeScreenLabels';

type Props = {
  date: string;
};

export function HomeWelcomeHeader({ date }: Props) {
  const { name } = useAuth();
  const { journey } = useActiveJourney();
  const planDates = getAllPlanDates(journey);
  const dayNumber = planDates.findIndex((d) => d === date) + 1;
  const totalDays = planDates.length;
  const displayName = name?.trim() || 'Friend';

  return (
    <header className="space-y-1 text-center" data-testid="home-welcome-header">
      <p className="label-caps text-secondary">{getTimeGreeting()}, {displayName}</p>
      <h1 className="font-display text-headline-lg-mobile text-primary">
        Day {dayNumber} of {totalDays}
      </h1>
      <p className="text-body-lg text-on-surface-variant">{journey.name}</p>
    </header>
  );
}
