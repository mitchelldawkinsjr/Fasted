import { getActiveJourney, getPhasesForJourney } from '../lib/journey';
import { getPlanEnd, getPlanStart } from '../lib/dateUtils';
import { useProgress } from './useProgress';

export function useActiveJourney() {
  const progress = useProgress();
  const journey = getActiveJourney(progress);
  const phases = getPhasesForJourney(journey);

  return {
    progress,
    journey,
    phases,
    planStart: getPlanStart(journey),
    planEnd: getPlanEnd(journey),
    getPhaseForDate: (date: string) =>
      phases.find((phase) => date >= phase.startDate && date <= phase.endDate),
  };
}
